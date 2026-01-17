// Inference using llama-cpp-2 bindings
// This replaces the previous Candle implementation

use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{AddBos, LlamaModel, Special};
use llama_cpp_2::sampling::LlamaSampler;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::num::NonZeroU32;
use std::path::Path;
use std::sync::{Arc, OnceLock};
use std::time::Instant;

#[derive(Serialize, Deserialize, Clone)]
pub struct InferenceMetrics {
    pub ttft_ms: u64,
    pub tps: f32,
    pub total_tokens: u32,
    pub total_time_ms: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct InferenceResult {
    pub content: String,
    pub metrics: InferenceMetrics,
}

pub struct ModelState {
    model: Option<Arc<LlamaModel>>,
    // We store the path to allow checking what's loaded
    model_path: Option<String>,
    // Advanced settings
    pub n_gpu_layers: u32,
    pub n_ctx: u32,
    pub n_threads: u32,
}

static BACKEND: OnceLock<LlamaBackend> = OnceLock::new();

fn get_backend() -> &'static LlamaBackend {
    BACKEND.get_or_init(|| LlamaBackend::init().expect("Failed to init llama backend"))
}

impl Default for ModelState {
    fn default() -> Self {
        Self {
            model: None,
            model_path: None,
            n_gpu_layers: 0, // Default to CPU
            n_ctx: 2048,
            n_threads: 4,
        }
    }
}

pub type SharedModelState = Arc<Mutex<ModelState>>;

pub fn create_model_state() -> SharedModelState {
    Arc::new(Mutex::new(ModelState::default()))
}

pub fn load_model(
    state: &SharedModelState,
    model_path: &str,
    n_gpu_layers: Option<u32>,
    n_ctx: Option<u32>,
    n_threads: Option<u32>,
) -> Result<String, String> {
    let path = Path::new(model_path);
    if !path.exists() {
        return Err(format!("Model file not found: {}", model_path));
    }

    let mut state_guard = state.lock();

    // Update settings if provided
    if let Some(gpu) = n_gpu_layers {
        state_guard.n_gpu_layers = gpu;
    }
    if let Some(ctx) = n_ctx {
        state_guard.n_ctx = ctx;
    }
    if let Some(threads) = n_threads {
        state_guard.n_threads = threads;
    }

    // Load model
    let params = LlamaModelParams::default().with_n_gpu_layers(state_guard.n_gpu_layers);
    let model = LlamaModel::load_from_file(get_backend(), path, &params)
        .map_err(|e| format!("Failed to load model: {}", e))?;

    let model_name = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown")
        .to_string();

    state_guard.model = Some(Arc::new(model));
    state_guard.model_path = Some(model_path.to_string());

    Ok(format!(
        "Loaded model: {} (GPU Layers: {}, Ctx: {})",
        model_name, state_guard.n_gpu_layers, state_guard.n_ctx
    ))
}

pub fn unload_model(state: &SharedModelState) -> Result<String, String> {
    let mut state_guard = state.lock();
    if state_guard.model.is_none() {
        return Err("No model is currently loaded".to_string());
    }
    state_guard.model = None;
    state_guard.model_path = None;
    Ok("Model unloaded successfully".to_string())
}

pub fn is_model_loaded(state: &SharedModelState) -> bool {
    state.lock().model.is_some()
}

pub fn get_loaded_model_path(state: &SharedModelState) -> Option<String> {
    state.lock().model_path.clone()
}

pub fn generate_response(
    state: &SharedModelState,
    prompt: &str,
    max_tokens: u32,
    temperature: f32,
) -> Result<InferenceResult, String> {
    let (model, n_ctx, n_threads) = {
        let state_guard = state.lock();
        let model = state_guard
            .model
            .as_ref()
            .ok_or("No model loaded. Please load a model first.")?
            .clone();
        (model, state_guard.n_ctx, state_guard.n_threads)
    };

    let start_time = Instant::now();
    let mut ttft_ms = 0;

    // Create a context for this generation
    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(NonZeroU32::new(n_ctx))
        .with_n_threads(n_threads as i32);
    let mut ctx = model
        .new_context(get_backend(), ctx_params)
        .map_err(|e| format!("Failed to create context: {}", e))?;

    // Tokenize
    let tokens = model
        .str_to_token(prompt, AddBos::Always)
        .map_err(|e| format!("Tokenization failed: {}", e))?;

    if tokens.is_empty() {
        return Err("Prompt resulted in no tokens.".to_string());
    }

    let mut output_bytes = Vec::new();

    // We use a batch for decoding
    let mut batch = LlamaBatch::new(n_ctx as usize, 1);

    // Add prompt tokens to batch
    let last_token_idx = (tokens.len() - 1) as i32;
    for (i, &token) in tokens.iter().enumerate() {
        batch
            .add(token, i as i32, &[0], i as i32 == last_token_idx)
            .map_err(|e| format!("Failed to add token to batch: {}", e))?;
    }

    // Decode the prompt
    ctx.decode(&mut batch)
        .map_err(|e| format!("Decode failed: {}", e))?;

    let mut n_past = tokens.len() as i32;

    // Setup robust sampler chain
    let seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_micros() as u32)
        .unwrap_or(42);

    let mut sampler = if temperature <= 0.0 {
        LlamaSampler::greedy()
    } else {
        LlamaSampler::chain_simple([
            LlamaSampler::penalties(64, 1.1, 0.0, 0.0),
            LlamaSampler::top_k(40),
            LlamaSampler::top_p(0.95, 1),
            LlamaSampler::min_p(0.05, 1),
            LlamaSampler::temp(temperature),
            LlamaSampler::dist(seed),
        ])
    };

    let mut tokens_generated = 0;

    for _ in 0..max_tokens {
        // Sample next token
        let token = sampler.sample(&ctx, batch.n_tokens() - 1);

        if tokens_generated == 0 {
            ttft_ms = start_time.elapsed().as_millis() as u64;
        }

        // Check for EOS
        if model.is_eog_token(token) {
            break;
        }

        // Decode token to bytes
        let piece = model
            .token_to_bytes(token, Special::Plaintext)
            .map_err(|e| format!("Failed to decode token bytes: {}", e))?;
        output_bytes.extend_from_slice(&piece);
        tokens_generated += 1;

        // Prepare batch for next token
        batch.clear();
        batch
            .add(token, n_past, &[0], true)
            .map_err(|e| format!("Failed to add token to batch: {}", e))?;

        // Decode next token
        ctx.decode(&mut batch)
            .map_err(|e| format!("Decode failed: {}", e))?;
        n_past += 1;
    }

    let total_time_ms = start_time.elapsed().as_millis() as u64;
    let tps = if total_time_ms > ttft_ms {
        (tokens_generated as f32) / ((total_time_ms - ttft_ms) as f32 / 1000.0)
    } else {
        0.0
    };

    // Convert whole byte sequence to string
    let output = String::from_utf8_lossy(&output_bytes).to_string();

    Ok(InferenceResult {
        content: output,
        metrics: InferenceMetrics {
            ttft_ms,
            tps,
            total_tokens: tokens_generated,
            total_time_ms,
        },
    })
}

pub fn scan_for_models(directory: &str) -> Result<Vec<String>, String> {
    let path = Path::new(directory);

    if !path.exists() || !path.is_dir() {
        return Err(format!("Directory not found: {}", directory));
    }

    let mut models = Vec::new();

    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let file_path = entry.path();
            if let Some(ext) = file_path.extension() {
                if ext.to_str().map(|s| s.to_lowercase()) == Some("gguf".to_string()) {
                    if let Some(path_str) = file_path.to_str() {
                        models.push(path_str.to_string());
                    }
                }
            }
        }
    }

    Ok(models)
}
