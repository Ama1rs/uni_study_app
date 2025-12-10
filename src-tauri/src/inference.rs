// Direct GGUF model inference using Candle (Pure Rust)
// No CMake, LLVM, or external build tools required

use candle_core::quantized::gguf_file::Content;
use candle_core::{Device, Tensor};
use candle_transformers::generation::LogitsProcessor;
use candle_transformers::models::quantized_qwen2 as quantized_model;
use parking_lot::Mutex;
use quantized_model::ModelWeights;
use std::path::Path;
use std::sync::Arc;
use tokenizers::Tokenizer;

/// Global state for the loaded model
pub struct ModelState {
    model: Option<ModelWeights>,
    tokenizer: Option<Tokenizer>,
    device: Device,
    model_path: Option<String>,
}

impl Default for ModelState {
    fn default() -> Self {
        Self {
            model: None,
            tokenizer: None,
            device: Device::Cpu,
            model_path: None,
        }
    }
}

/// Thread-safe wrapper for model state
pub type SharedModelState = Arc<Mutex<ModelState>>;

pub fn create_model_state() -> SharedModelState {
    Arc::new(Mutex::new(ModelState::default()))
}

/// Load a GGUF model from disk
pub fn load_model(
    state: &SharedModelState,
    model_path: &str,
    tokenizer_path: Option<&str>,
) -> Result<String, String> {
    let path = Path::new(model_path);
    if !path.exists() {
        return Err(format!("Model file not found: {}", model_path));
    }

    if !model_path.to_lowercase().ends_with(".gguf") {
        return Err("Only .gguf model files are supported".to_string());
    }

    let mut state_guard = state.lock();
    let device = state_guard.device.clone();

    // Load the GGUF model
    let mut file =
        std::fs::File::open(path).map_err(|e| format!("Failed to open model file: {}", e))?;

    let content =
        Content::read(&mut file).map_err(|e| format!("Failed to read GGUF content: {}", e))?;

    let model = quantized_model::ModelWeights::from_gguf(content, &mut file, &device)
        .map_err(|e| format!("Failed to load GGUF model: {}", e))?;

    // Load tokenizer
    let tokenizer = if let Some(tok_path) = tokenizer_path {
        Some(
            Tokenizer::from_file(tok_path)
                .map_err(|e| format!("Failed to load tokenizer: {}", e))?,
        )
    } else {
        // Try to find tokenizer.json in same directory as model
        let parent = path.parent().unwrap_or(Path::new("."));
        let tok_path = parent.join("tokenizer.json");
        if tok_path.exists() {
            Some(
                Tokenizer::from_file(&tok_path)
                    .map_err(|e| format!("Failed to load tokenizer: {}", e))?,
            )
        } else {
            None
        }
    };

    let model_name = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown")
        .to_string();

    state_guard.model = Some(model);
    state_guard.tokenizer = tokenizer;
    state_guard.model_path = Some(model_path.to_string());

    Ok(format!("Loaded model: {}", model_name))
}

/// Unload the current model to free memory
pub fn unload_model(state: &SharedModelState) -> Result<String, String> {
    let mut state_guard = state.lock();

    if state_guard.model.is_none() {
        return Err("No model is currently loaded".to_string());
    }

    state_guard.model = None;
    state_guard.tokenizer = None;
    state_guard.model_path = None;

    Ok("Model unloaded successfully".to_string())
}

/// Check if a model is currently loaded
pub fn is_model_loaded(state: &SharedModelState) -> bool {
    state.lock().model.is_some()
}

/// Get the currently loaded model path
pub fn get_loaded_model_path(state: &SharedModelState) -> Option<String> {
    state.lock().model_path.clone()
}
/// Generate a response from the loaded model
pub fn generate_response(
    state: &SharedModelState,
    prompt: &str,
    max_tokens: u32,
    temperature: f32,
) -> Result<String, String> {
    // Lock state
    let mut state_guard = state.lock();

    // Clone what we need OUT of the guard so we don't hold immutable borrows
    let device = state_guard.device.clone();
    let max_tokens = max_tokens.min(16);
    let tokenizer = state_guard
        .tokenizer
        .as_ref()
        .ok_or("No tokenizer loaded. Please provide a tokenizer.json file.")?
        .clone(); // <-- own a copy, no &Tokenizer tied to state_guard

    let model = state_guard
        .model
        .as_mut()
        .ok_or("No model loaded. Please load a model first.")?;

    // 1. Tokenize prompt
    let encoding = tokenizer
        .encode(prompt, true)
        .map_err(|e| format!("Tokenization failed: {}", e))?;

    let mut all_tokens: Vec<u32> = encoding.get_ids().to_vec();

    if all_tokens.is_empty() {
        return Err("Tokenizer returned zero tokens for the prompt.".to_string());
    }
    println!(
        "generate_response: prompt_len = {}, max_tokens = {}",
        all_tokens.len(),
        max_tokens
    );

    // 2. Set up sampling
    let mut logits_processor = LogitsProcessor::new(
        42,                       // seed
        Some(temperature as f64), // temperature
        None,                     // top_p (None = no nucleus filter)
    );

    let mut generated_tokens: Vec<u32> = Vec::new();

    // Qwen2: BOS/PAD 151643, EOS 151645 in GGUF metadata.
    const QWEN2_EOS: u32 = 151645;
    println!(
        "generate_response: prompt len = {}, max_tokens = {}",
        all_tokens.len(),
        max_tokens
    );
    // 3. Autoregressive loop
    for step in 0..max_tokens {
        println!(
            "generate_response: step {}, context_len = {}",
            step,
            all_tokens.len()
        );
        let context_len = all_tokens.len();
        let context_size = 256.min(context_len); // sliding window
        let start_pos = context_len - context_size;

        let input_slice = &all_tokens[start_pos..];
        if input_slice.is_empty() {
            return Err(format!(
                "Internal error: empty input slice (context_len={context_len}, start_pos={start_pos})"
            ));
        }

        let input = Tensor::new(input_slice, &device)
            .map_err(|e| format!("Tensor creation failed: {}", e))?
            .unsqueeze(0)
            .map_err(|e| format!("Unsqueeze failed: {}", e))?;
        let t0 = std::time::Instant::now();
        // Single forward pass for this step
        let logits = model
            .forward(&input, start_pos)
            .map_err(|e| format!("Forward pass failed: {}", e))?;
        println!(
            "generate_response: step {} forward took {:?}",
            step,
            t0.elapsed()
        );

        // Remove batch dimension; expected shapes now:
        // - [vocab]
        // - [seq_len, vocab]
        let logits = logits
            .squeeze(0)
            .map_err(|e| format!("Squeeze failed: {}", e))?;

        let dims = logits.dims();

        if dims.is_empty() {
            return Err("Model returned scalar logits (rank 0), cannot sample.".to_string());
        }

        // Select last-step logits correctly based on shape
        let last_logits = match dims {
            // [vocab] -> already per-token logits
            [vocab] => {
                if *vocab == 0 {
                    return Err("Model returned empty vocab dimension.".to_string());
                }
                logits
            }
            // [seq_len, vocab] -> take last row
            [seq_len, vocab] => {
                if *seq_len == 0 || *vocab == 0 {
                    return Err(format!(
                        "Model returned invalid logits shape [seq_len={}, vocab={}].",
                        seq_len, vocab
                    ));
                }
                logits
                    .get(seq_len - 1)
                    .map_err(|e| format!("Get last logits failed: {}", e))?
            }
            // anything else is unexpected
            other => {
                return Err(format!(
                    "Unexpected logits shape {:?}, expected [vocab] or [seq_len, vocab].",
                    other
                ));
            }
        };

        let last_dims = last_logits.dims();
        if last_dims.is_empty() {
            return Err("Last-step logits are scalar (rank 0), cannot sample.".to_string());
        }

        // 4. Sample next token
        let next_token = logits_processor
            .sample(&last_logits)
            .map_err(|e| format!("Sampling failed: {}", e))? as u32;

        // Stop on EOS
        if next_token == QWEN2_EOS {
            break;
        }

        all_tokens.push(next_token);
        generated_tokens.push(next_token);
    }

    // 5. Decode generated tokens
    let response = tokenizer
        .decode(&generated_tokens, true)
        .map_err(|e| format!("Decoding failed: {}", e))?;

    Ok(response)
}

/// Scan a directory for GGUF model files
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
