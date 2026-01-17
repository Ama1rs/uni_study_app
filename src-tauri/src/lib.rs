mod book_commands;
pub mod conversion;
mod db;
mod db_manager;
mod finance;
pub mod grades;
mod image_tools;
mod inference;
mod migrations;
mod ollama;
mod pdf_tools;
mod projection;
mod youtube;

use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use base64::{engine::general_purpose, Engine as _};
use db::{
    d_days::DDayRepository, flashcards::FlashcardRepository, graph::GraphRepository,
    lectures::LectureRepository, links::LinkRepository, planner::PlannerRepository,
    repositories::RepositoryRepository, resources::ResourceRepository,
    study_sessions::StudySessionRepository, tasks::TaskRepository,
};
use db_manager::DatabaseManager;
use finance::{
    ExpenseFlow, FinanceAsset, FinanceBudget, FinanceSummary, FinanceTransaction, SavingsGoal,
};
use inference::SharedModelState;
use ollama::{ChatMessage, ChatOptions, OllamaClient};
use rand_core::OsRng;
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Read;
use std::path::Path;
use tauri::{Manager, State};
use tracing;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use ts_rs::TS;

// Define custom error type for better error handling
#[derive(thiserror::Error, Debug, Serialize, Deserialize)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Network error: {0}")]
    Network(String),
    #[error("File I/O error: {0}")]
    Io(String),
    #[error("Authentication error: {0}")]
    Auth(String),
    #[error("Internal error: {0}")]
    Internal(String),
}

pub type AppResult<T> = Result<T, AppError>;

impl From<String> for AppError {
    fn from(s: String) -> Self {
        AppError::Internal(s)
    }
}

impl From<&str> for AppError {
    fn from(s: &str) -> Self {
        AppError::Internal(s.to_string())
    }
}

// Redefine DbState to hold the DatabaseManager
pub struct DbState {
    pub db_manager: DatabaseManager,
}

#[derive(Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct UserProfile {
    pub id: i64,
    pub name: Option<String>,
    pub university: Option<String>,
    pub avatar_path: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct AppSettings {
    pub id: i64,
    pub theme_style: String,
    pub theme_mode: String,
    pub accent: String,
    pub sidebar_hidden: bool,
    pub graph_node_color: String,
    pub graph_link_color: String,
    pub graph_node_size: f64,
    pub graph_link_width: f64,
    pub graph_show_labels: bool,
    pub graph_label_size: f64,
    pub graph_show_legend: bool,
    pub graph_show_topology: bool,
}

#[derive(Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct UserPublic {
    pub id: i64,
    pub username: String,
    pub created_at: Option<String>,
}

pub use conversion::{
    calculate_weighted_score, convert_course_score, convert_letter_grade, convert_numeric_score,
    get_letter_for_points,
};
pub use db::{
    DDay, Flashcard, Lecture, Link, LinkType, LinkV2, PlannerEvent, Repository, Resource,
    ResourceMetadata, SqliteDDayRepository, SqliteFlashcardRepository, SqliteGraphRepository,
    SqliteLectureRepository, SqliteLinkRepository, SqlitePlannerRepository,
    SqliteRepositoryRepository, SqliteResourceRepository, SqliteStudySessionRepository,
    SqliteTaskRepository, StudySession, Task,
};

fn hash_password(password: &str) -> AppResult<String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(e.to_string()))
        .map(|hash| hash.to_string())
}

fn verify_password(hash: &str, password: &str) -> AppResult<bool> {
    let parsed_hash = PasswordHash::new(hash).map_err(|e| AppError::Internal(e.to_string()))?;
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map(|_| true)
        .map_err(|e| AppError::Internal(e.to_string()))
}

fn get_session_user_id(conn: &rusqlite::Connection) -> AppResult<Option<i64>> {
    conn.query_row(
        "SELECT current_user_id FROM session_state WHERE id = 1",
        [],
        |row| row.get::<_, Option<i64>>(0),
    )
    .optional()
    .map_err(|e| AppError::Database(e.to_string()))
    .map(|opt| opt.flatten())
}

#[tauri::command]
fn read_file_base64(path: String) -> AppResult<String> {
    let mut file = File::open(&path).map_err(|e| AppError::Io(e.to_string()))?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(general_purpose::STANDARD.encode(&buffer))
}

fn fetch_user_public(conn: &rusqlite::Connection, user_id: i64) -> AppResult<UserPublic> {
    conn.query_row(
        "SELECT id, username, created_at FROM users WHERE id = ?1",
        [user_id],
        |row| {
            Ok(UserPublic {
                id: row.get(0)?,
                username: row.get(1)?,
                created_at: row.get(2)?,
            })
        },
    )
    .map_err(|e| AppError::Database(e.to_string()))
}

#[tauri::command]
fn register_user(
    state: State<DbState>,
    username: String,
    password: String,
) -> AppResult<UserPublic> {
    if username.trim().is_empty() || password.trim().is_empty() {
        return Err(AppError::Validation(
            "Username and password are required".to_string(),
        ));
    }
    if password.len() < 6 {
        return Err(AppError::Validation(
            "Password must be at least 6 characters".to_string(),
        ));
    }

    let global_conn = state.db_manager.get_global_conn();
    let conn = global_conn.lock().unwrap();
    let hash = hash_password(&password)?;

    conn.execute(
        "INSERT INTO users (username, password_hash) VALUES (?1, ?2)",
        (&username, &hash),
    )
    .map_err(|e| AppError::Database(e.to_string()))?;
    let user_id = conn.last_insert_rowid();

    conn.execute(
        "INSERT INTO session_state (id, current_user_id, last_user_id) VALUES (1, ?1, NULL)
         ON CONFLICT(id) DO UPDATE SET current_user_id=excluded.current_user_id",
        [&user_id],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    // Initialize Profile Database
    // This will create the db file and run profile migrations
    drop(conn); // Release global lock before opening profile db

    let profile_conn_arc = state.db_manager.get_profile_db(user_id)?;
    let profile_conn = profile_conn_arc.lock().unwrap();

    // Create initial user profile in Profile DB
    profile_conn
        .execute(
            "INSERT INTO user_profiles (user_id) VALUES (?1)",
            [&user_id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    // Return public user info (re-acquire global lock or just execute query on global conn which is shared but we released lock)
    // Actually fetch_user_public takes &Connection, we can pass global conn after re-locking
    let conn = global_conn.lock().unwrap();
    fetch_user_public(&conn, user_id)
}

#[tauri::command]
fn login(state: State<DbState>, username: String, password: String) -> AppResult<UserPublic> {
    let global_conn = state.db_manager.get_global_conn();
    let conn = global_conn.lock().unwrap();
    let (user_id, stored_hash): (i64, String) = conn
        .query_row(
            "SELECT id, password_hash FROM users WHERE username = ?1",
            [&username],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| AppError::Auth("Invalid username or password".to_string()))?;

    let is_valid = verify_password(&stored_hash, &password)?;
    if !is_valid {
        return Err(AppError::Auth("Invalid username or password".to_string()));
    }

    conn.execute(
        "INSERT INTO session_state (id, current_user_id) VALUES (1, ?1)
         ON CONFLICT(id) DO UPDATE SET current_user_id=excluded.current_user_id",
        [&user_id],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    // Warm up profile database
    drop(conn); // Release global lock
    state.db_manager.get_profile_db(user_id)?;

    // Return user info
    let conn = global_conn.lock().unwrap();
    fetch_user_public(&conn, user_id)
}

#[tauri::command]
fn get_current_user(state: State<DbState>) -> AppResult<Option<UserPublic>> {
    let global_conn = state.db_manager.get_global_conn();
    let conn = global_conn.lock().unwrap();
    if let Some(uid) = get_session_user_id(&conn)? {
        let user = fetch_user_public(&conn, uid)?;
        Ok(Some(user))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn logout(state: State<DbState>) -> AppResult<()> {
    let global_conn = state.db_manager.get_global_conn();
    let conn = global_conn.lock().unwrap();

    // Get current user to close connection
    let current_user_id = get_session_user_id(&conn)?;

    conn.execute(
        "INSERT INTO session_state (id, current_user_id) VALUES (1, NULL)
         ON CONFLICT(id) DO UPDATE SET current_user_id=NULL",
        [],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    drop(conn);

    if let Some(uid) = current_user_id {
        state.db_manager.close_profile_db(uid);
    }

    Ok(())
}

#[tauri::command]
fn set_remembered_user(state: State<DbState>, user_id: Option<i64>) -> Result<(), String> {
    let global_conn = state.db_manager.get_global_conn();
    let conn = global_conn.lock().unwrap();
    conn.execute(
        "INSERT INTO session_state (id, last_user_id) VALUES (1, ?1)
         ON CONFLICT(id) DO UPDATE SET last_user_id=excluded.last_user_id",
        [&user_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_remembered_user(state: State<DbState>) -> Result<Option<i64>, String> {
    let global_conn = state.db_manager.get_global_conn();
    let conn = global_conn.lock().unwrap();
    conn.query_row(
        "SELECT last_user_id FROM session_state WHERE id = 1",
        [],
        |row| row.get::<_, Option<i64>>(0),
    )
    .optional()
    .map_err(|e| e.to_string())
    .map(|opt| opt.flatten())
}

#[tauri::command]
fn delete_profile(state: State<DbState>, user_id: i64) -> Result<(), String> {
    state.db_manager.delete_profile(user_id)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Serialize, Deserialize, Clone, Default, TS)]
#[ts(export)]
pub struct OnboardingState {
    pub completed: bool,
    pub ai_provider: Option<String>,
    pub ai_api_key: Option<String>,
    pub ai_endpoint: Option<String>,
    pub db_type: Option<String>,
    pub db_url: Option<String>,
    pub user_name: Option<String>,
    pub university: Option<String>,
    pub n_gpu_layers: Option<i32>,
    pub n_ctx: Option<i32>,
    pub n_threads: Option<i32>,
    pub system_prompt: Option<String>,
    pub temperature: Option<f32>,
    pub top_p: Option<f32>,
    pub max_tokens: Option<i32>,
}

#[tauri::command]
fn get_onboarding_state(state: State<DbState>) -> Result<OnboardingState, String> {
    tracing::info!("get_onboarding_state called");
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    tracing::debug!("get_onboarding_state: lock acquired");

    let mut stmt = conn
        .prepare("SELECT completed, ai_provider, ai_api_key, ai_endpoint, db_type, db_url, user_name, university, n_gpu_layers, n_ctx, n_threads, system_prompt, temperature, top_p, max_tokens FROM onboarding_state WHERE id = 1")
        .map_err(|e| {
            tracing::error!("get_onboarding_state: prepare failed: {}", e);
            e.to_string()
        })?;
    tracing::debug!("get_onboarding_state: prepare success");

    let mut rows = stmt.query([]).map_err(|e| {
        tracing::error!("get_onboarding_state: query failed: {}", e);
        e.to_string()
    })?;
    tracing::debug!("get_onboarding_state: query success");

    if let Some(row) = rows.next().map_err(|e| {
        tracing::error!("get_onboarding_state: rows.next failed: {}", e);
        e.to_string()
    })? {
        tracing::info!("Found existing onboarding state");
        Ok(OnboardingState {
            completed: row.get(0).unwrap_or(false),
            ai_provider: row.get(1).ok(),
            ai_api_key: row.get(2).ok(),
            ai_endpoint: row.get(3).ok(),
            db_type: row.get(4).ok(),
            db_url: row.get(5).ok(),
            user_name: row.get(6).ok(),
            university: row.get(7).ok(),
            n_gpu_layers: row.get(8).ok(),
            n_ctx: row.get(9).ok(),
            n_threads: row.get(10).ok(),
            system_prompt: row.get(11).ok(),
            temperature: row.get(12).ok(),
            top_p: row.get(13).ok(),
            max_tokens: row.get(14).ok(),
        })
    } else {
        tracing::info!("No onboarding state found, returning default");
        Ok(OnboardingState::default())
    }
}

#[tauri::command]
fn set_onboarding_state(
    state: State<DbState>,
    onboarding_state: OnboardingState,
) -> Result<(), String> {
    tracing::info!(
        completed = onboarding_state.completed,
        "set_onboarding_state called"
    );
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // Also use global conn to update session user_id mapping if university or name changes?
    // No, that's in user_profiles.

    conn.execute(
        "INSERT INTO onboarding_state (id, completed, ai_provider, ai_api_key, ai_endpoint, db_type, db_url, user_name, university, n_gpu_layers, n_ctx, n_threads, system_prompt, temperature, top_p, max_tokens)
        VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
        ON CONFLICT(id) DO UPDATE SET
            completed=excluded.completed,
            ai_provider=excluded.ai_provider,
            ai_api_key=excluded.ai_api_key,
            ai_endpoint=excluded.ai_endpoint,
            db_type=excluded.db_type,
            db_url=excluded.db_url,
            user_name=excluded.user_name,
            university=excluded.university,
            n_gpu_layers=excluded.n_gpu_layers,
            n_ctx=excluded.n_ctx,
            n_threads=excluded.n_threads,
            system_prompt=excluded.system_prompt,
            temperature=excluded.temperature,
            top_p=excluded.top_p,
            max_tokens=excluded.max_tokens",
        (
            onboarding_state.completed,
            onboarding_state.ai_provider,
            onboarding_state.ai_api_key,
            onboarding_state.ai_endpoint,
            onboarding_state.db_type,
            onboarding_state.db_url,
            onboarding_state.user_name,
            onboarding_state.university,
            onboarding_state.n_gpu_layers,
            onboarding_state.n_ctx,
            onboarding_state.n_threads,
            onboarding_state.system_prompt,
            onboarding_state.temperature,
            onboarding_state.top_p,
            onboarding_state.max_tokens,
        ),
    )
    .map_err(|e| e.to_string())?;

    tracing::info!("set_onboarding_state success");
    Ok(())
}

#[tauri::command]
fn create_resource(
    state: State<DbState>,
    repository_id: Option<i64>,
    title: String,
    type_: String,
    path: Option<String>,
    content: Option<String>,
    tags: Option<String>,
) -> AppResult<i64> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteResourceRepository;
    repo.create_resource(&conn, repository_id, title, type_, path, content, tags)
}

#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
struct AddResourcePayload {
    #[serde(rename = "repositoryId")]
    repository_id: i64,
    title: String,
    #[serde(rename = "resourceType")]
    resource_type: String,
    content: Option<String>,
}

#[tauri::command]
fn add_resource(state: State<DbState>, payload: AddResourcePayload) -> AppResult<Resource> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    let repo = SqliteResourceRepository;
    let id = repo.create_resource(
        &conn,
        Some(payload.repository_id),
        payload.title,
        payload.resource_type,
        None,
        payload.content,
        None,
    )?;

    let resources = repo.get_resources(&conn, Some(payload.repository_id))?;
    let created = resources
        .into_iter()
        .find(|r| r.id == id)
        .ok_or("Failed to fetch created resource")?;

    Ok(Resource {
        id: created.id,
        repository_id: created.repository_id,
        title: created.title,
        type_: created.type_,
        path: created.path,
        content: created.content,
        tags: created.tags,
        created_at: created.created_at,
    })
}

#[tauri::command]
fn image_resize(
    input_path: String,
    output_path: String,
    width: u32,
    height: u32,
    mode: String,
) -> Result<String, String> {
    image_tools::image_resize(input_path, output_path, width, height, mode)
}

#[tauri::command]
fn image_convert(input_path: String, output_path: String) -> Result<String, String> {
    image_tools::image_convert(input_path, output_path)
}

#[tauri::command]
fn image_batch_optimize(
    input_paths: Vec<String>,
    output_dir: String,
    jpeg_quality: Option<u8>,
) -> Result<Vec<String>, String> {
    image_tools::image_batch_optimize(input_paths, output_dir, jpeg_quality)
}

#[tauri::command]
fn pdf_merge(input_paths: Vec<String>, output_path: String) -> Result<String, String> {
    pdf_tools::pdf_merge(input_paths, output_path)
}

#[tauri::command]
fn pdf_extract_pages(
    input_path: String,
    pages_spec: String,
    output_path: String,
) -> Result<String, String> {
    pdf_tools::pdf_extract_pages(input_path, pages_spec, output_path)
}

#[tauri::command]
fn pdf_compress(
    input_path: String,
    output_path: String,
    compression_level: Option<u8>,
) -> Result<String, String> {
    pdf_tools::pdf_compress(input_path, output_path, compression_level)
}

#[tauri::command]
fn pdf_to_markdown(input_path: String, output_path: String) -> Result<String, String> {
    pdf_tools::pdf_to_markdown(input_path, output_path)
}

#[tauri::command]
fn get_resources(state: State<DbState>, repository_id: Option<i64>) -> AppResult<Vec<Resource>> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteResourceRepository;
    let resources = repo.get_resources(&conn, repository_id)?;
    Ok(resources
        .into_iter()
        .map(|r| Resource {
            id: r.id,
            repository_id: r.repository_id,
            title: r.title,
            type_: r.type_,
            path: r.path,
            content: r.content,
            tags: r.tags,
            created_at: r.created_at,
        })
        .collect())
}
#[tauri::command]
fn create_link(state: State<DbState>, source_id: i64, target_id: i64) -> AppResult<i64> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteLinkRepository;
    repo.create_link(&conn, source_id, target_id)
}

#[tauri::command]
fn get_links(state: State<DbState>) -> AppResult<Vec<Link>> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteLinkRepository;
    repo.get_links(&conn)
}

#[tauri::command]
fn import_resource(
    app: tauri::AppHandle,
    state: State<DbState>,
    repository_id: i64,
    file_path: String,
) -> AppResult<i64> {
    tracing::info!(
        repository_id = repository_id,
        file_path = file_path,
        "Backend: import_resource called"
    );
    let path = Path::new(&file_path);
    let filename = path
        .file_name()
        .ok_or("Invalid file path")?
        .to_string_lossy();
    let ext = path
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_lowercase();

    // Generate unique filename
    let unique_name = format!("{}_{}", uuid::Uuid::new_v4(), filename);

    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let resources_dir = app_dir.join("resources");
    if !resources_dir.exists() {
        std::fs::create_dir_all(&resources_dir).map_err(|e| e.to_string())?;
    }

    let dest_path = resources_dir.join(&unique_name);
    std::fs::copy(&file_path, &dest_path).map_err(|e| e.to_string())?;

    // Determine type
    let type_ = match ext.as_str() {
        "pdf" => "pdf",
        "png" | "jpg" | "jpeg" | "gif" | "bmp" | "webp" | "svg" => "image",
        "doc" | "docx" | "ppt" | "pptx" | "txt" | "md" | "rtf" => "document",
        // Book formats
        "epub" => "epub",
        "azw3" => "azw3",
        "fb2" => "fb2",
        "ibooks" => "ibooks",
        _ => "file",
    };

    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteResourceRepository;
    repo.create_resource(
        &conn,
        Some(repository_id),
        filename.to_string(),
        type_.to_string(),
        Some(dest_path.to_string_lossy().to_string()),
        None,
        None,
    )
}

#[tauri::command]
#[allow(non_snake_case)]
fn process_text_to_nodes(
    state: State<DbState>,
    repositoryId: i64,
    text: String,
    tags: Option<String>,
) -> AppResult<Vec<i64>> {
    tracing::info!(
        repository_id = repositoryId,
        text_len = text.len(),
        "Backend: process_text_to_nodes called"
    );
    // Create a single note with the full text instead of splitting
    // This preserves markdown formatting and keeps content intact
    let title = if text.len() > 50 {
        // Extract first line or first 50 chars as title
        let first_line = text.lines().next().unwrap_or("").trim();
        if !first_line.is_empty() && first_line.len() > 3 {
            first_line.chars().take(50).collect::<String>()
        } else {
            format!("{}...", &text.chars().take(50).collect::<String>())
        }
    } else {
        text.clone()
    };

    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteResourceRepository;
    let id = repo.create_resource(
        &conn,
        Some(repositoryId),
        title,
        "note".to_string(),
        None,
        Some(text),
        tags,
    )?;

    Ok(vec![id])
}

#[tauri::command]
fn get_user_profile(state: State<DbState>) -> AppResult<UserProfile> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // Try to get existing profile
    let profile = conn
        .query_row(
            "SELECT user_id, name, university, avatar_path FROM user_profiles LIMIT 1",
            [],
            |row| {
                Ok(UserProfile {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    university: row.get(2)?,
                    avatar_path: row.get(3)?,
                })
            },
        )
        .optional()
        .map_err(|e| AppError::Database(e.to_string()))?;

    if let Some(profile) = profile {
        Ok(profile)
    } else {
        // Profile doesn't exist, create a default one
        // Get current user ID from session
        let global_conn = state.db_manager.get_global_conn();
        let global_conn_lock = global_conn.lock().unwrap();
        let user_id: i64 = global_conn_lock
            .query_row(
                "SELECT current_user_id FROM session_state WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .map_err(|e| AppError::Database(e.to_string()))?;

        drop(global_conn_lock);

        // Insert default profile
        conn.execute(
            "INSERT INTO user_profiles (user_id, name, university) VALUES (?1, ?2, ?3)",
            (user_id, "Student", ""),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        Ok(UserProfile {
            id: user_id,
            name: Some("Student".to_string()),
            university: Some("".to_string()),
            avatar_path: None,
        })
    }
}

#[tauri::command]
fn set_user_profile(state: State<DbState>, profile: UserProfile) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // With profile DB, user_profiles has only 1 row relevant to the user usually (or keyed by user_id which is implicit context)
    // But schema has user_id FK to users.
    // We should update the row where user_id matches session, or just update the single relevant row if we assume 1-to-1 db.
    // Query assumes user_id column exists.

    conn.execute(
        "UPDATE user_profiles SET name = ?1, university = ?2, avatar_path = ?3 WHERE user_id = ?4",
        (
            &profile.name,
            &profile.university,
            &profile.avatar_path,
            &profile.id,
        ),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_app_settings(state: State<DbState>) -> Result<AppSettings, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM app_settings", [], |r| r.get(0))
        .unwrap_or(0);
    if count == 0 {
        conn.execute(
            "INSERT INTO app_settings (theme_style, theme_mode, accent, sidebar_hidden) VALUES ('glass', 'light', 'violet', 0)",
            [],
        ).map_err(|e| e.to_string())?;
    }

    conn.query_row(
        "SELECT id, theme_style, theme_mode, accent, sidebar_hidden, 
                graph_node_color, graph_link_color, graph_node_size, graph_link_width, 
                graph_show_labels, graph_label_size FROM app_settings LIMIT 1",
        [],
        |row| {
            Ok(AppSettings {
                id: row.get(0)?,
                theme_style: row.get(1)?,
                theme_mode: row.get(2)?,
                accent: row.get(3)?,
                sidebar_hidden: row.get(4).unwrap_or(0) == 1,
                graph_node_color: row.get(5).unwrap_or_else(|_| "#2383E2".to_string()),
                graph_link_color: row
                    .get(6)
                    .unwrap_or_else(|_| "rgba(255,255,255,0.15)".to_string()),
                graph_node_size: row.get(7).unwrap_or(3.0),
                graph_link_width: row.get(8).unwrap_or(0.5),
                graph_show_labels: row.get(9).unwrap_or(1) == 1,
                graph_label_size: row.get(10).unwrap_or(12.0),
                graph_show_legend: row.get(11).unwrap_or(1) == 1,
                graph_show_topology: row.get(12).unwrap_or(1) == 1,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_app_settings(state: State<DbState>, settings: AppSettings) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    conn.execute("DELETE FROM app_settings", [])
        .map_err(|e| e.to_string())?;
    let sidebar_hidden_int = if settings.sidebar_hidden { 1 } else { 0 };
    let graph_show_labels_int = if settings.graph_show_labels { 1 } else { 0 };
    conn.execute(
        "INSERT INTO app_settings (id, theme_style, theme_mode, accent, sidebar_hidden, 
                                   graph_node_color, graph_link_color, graph_node_size, 
                                   graph_link_width, graph_show_labels, graph_label_size,
                graph_show_legend, graph_show_topology) 
         VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        (
            &settings.theme_style,
            &settings.theme_mode,
            &settings.accent,
            &sidebar_hidden_int,
            &settings.graph_node_color,
            &settings.graph_link_color,
            &settings.graph_node_size,
            &settings.graph_link_width,
            &graph_show_labels_int,
            &settings.graph_label_size,
            &(if settings.graph_show_legend { 1 } else { 0 }),
            &(if settings.graph_show_topology { 1 } else { 0 }),
        ),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_repositories(state: State<DbState>) -> AppResult<Vec<Repository>> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteRepositoryRepository;
    repo.get_repositories(&conn)
}

#[tauri::command]
fn create_repository(
    state: State<DbState>,
    name: String,
    code: Option<String>,
    semester: Option<String>,
    description: Option<String>,
) -> AppResult<i64> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteRepositoryRepository;
    repo.create_repository(&conn, name, code, semester, description)
}

#[tauri::command]
fn get_lectures(state: State<DbState>, repository_id: i64) -> Result<Vec<Lecture>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteLectureRepository;
    repo.get_lectures(&conn, repository_id)
}

#[tauri::command]
fn create_lecture(
    state: State<DbState>,
    repository_id: i64,
    title: String,
    url: String,
    thumbnail: Option<String>,
    group_name: Option<String>,
    order_index: Option<i32>,
) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteLectureRepository;
    repo.create_lecture(
        &conn,
        repository_id,
        title,
        url,
        thumbnail,
        group_name,
        order_index,
    )
}

#[tauri::command]
fn delete_repository(state: State<DbState>, id: i64) -> AppResult<()> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteRepositoryRepository;
    repo.delete_repository(&conn, id)
}

#[tauri::command]
fn update_resource(
    state: State<DbState>,
    id: i64,
    title: Option<String>,
    content: Option<String>,
    tags: Option<String>,
) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteResourceRepository;
    repo.update_resource(&conn, id, title, content, tags)
}

#[tauri::command]
fn delete_resource(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteResourceRepository;
    repo.delete_resource(&conn, id)
}

#[tauri::command]
fn delete_lecture(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteLectureRepository;
    repo.delete_lecture(&conn, id)
}

// ---------- Task Commands ----------
#[tauri::command]
fn create_task(state: State<DbState>, title: String) -> AppResult<i64> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteTaskRepository;
    repo.create_task(&conn, title)
}

#[tauri::command]
fn get_tasks(state: State<DbState>) -> AppResult<Vec<Task>> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteTaskRepository;
    repo.get_tasks(&conn)
}

#[tauri::command]
fn update_task_status(state: State<DbState>, id: i64, completed: bool) -> AppResult<()> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteTaskRepository;
    repo.update_task_status(&conn, id, completed)
}

#[tauri::command]
fn delete_task(state: State<DbState>, id: i64) -> AppResult<()> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteTaskRepository;
    repo.delete_task(&conn, id)
}

// ---------- Planner Commands ----------
#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
struct CreatePlannerEventPayload {
    #[serde(rename = "repositoryId")]
    repository_id: Option<i64>,
    title: String,
    description: Option<String>,
    #[serde(rename = "startAt")]
    start_at: String,
    #[serde(rename = "endAt")]
    end_at: String,
    recurrence: Option<String>,
}

#[tauri::command]
fn create_planner_event(
    state: State<DbState>,
    payload: CreatePlannerEventPayload,
) -> AppResult<i64> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqlitePlannerRepository;
    repo.create_planner_event(
        &conn,
        payload.repository_id,
        payload.title,
        payload.description,
        payload.start_at,
        payload.end_at,
        payload.recurrence,
    )
}

#[tauri::command]
fn get_planner_events(
    state: State<DbState>,
    from: Option<String>,
    to: Option<String>,
) -> AppResult<Vec<PlannerEvent>> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqlitePlannerRepository;
    repo.get_planner_events(&conn, from, to)
}

#[tauri::command]
fn delete_planner_event(state: State<DbState>, id: i64) -> AppResult<()> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqlitePlannerRepository;
    repo.delete_planner_event(&conn, id)
}

// ---------- Ollama / LLM Commands ----------

#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
pub struct OllamaModelInfo {
    pub name: String,
    pub size: Option<u64>,
}

#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessageInput>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<i32>,
}

#[derive(Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct ChatMessageInput {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ChatResult {
    pub role: String,
    pub content: String,
}

#[tauri::command]
async fn check_ollama_connection(endpoint: Option<String>) -> Result<bool, String> {
    let client = OllamaClient::new(endpoint);
    client.check_connection().await
}

#[tauri::command]
async fn list_ollama_models(endpoint: Option<String>) -> Result<Vec<OllamaModelInfo>, String> {
    let client = OllamaClient::new(endpoint);
    let models = client.list_models().await?;
    Ok(models
        .into_iter()
        .map(|m| OllamaModelInfo {
            name: m.name,
            size: m.size,
        })
        .collect())
}

#[tauri::command]
async fn chat_with_ollama(
    endpoint: Option<String>,
    model: String,
    messages: Vec<ChatMessageInput>,
    temperature: Option<f32>,
    max_tokens: Option<i32>,
) -> Result<ChatResult, String> {
    let client = OllamaClient::new(endpoint);

    let chat_messages: Vec<ChatMessage> = messages
        .into_iter()
        .map(|m| ChatMessage {
            role: m.role,
            content: m.content,
        })
        .collect();

    let options = if temperature.is_some() || max_tokens.is_some() {
        Some(ChatOptions {
            temperature,
            num_predict: max_tokens,
        })
    } else {
        None
    };

    let response = client.chat(model, chat_messages, options).await?;

    Ok(ChatResult {
        role: response.message.role,
        content: response.message.content,
    })
}

// ---------- Direct GGUF Inference Commands ----------

#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ModelStatus {
    pub loaded: bool,
    pub model_path: Option<String>,
}

#[tauri::command]
fn load_gguf_model(
    model_state: State<SharedModelState>,
    model_path: String,
    n_gpu_layers: Option<u32>,
    n_ctx: Option<u32>,
    n_threads: Option<u32>,
) -> Result<String, String> {
    inference::load_model(&model_state, &model_path, n_gpu_layers, n_ctx, n_threads)
}

#[tauri::command]
fn unload_gguf_model(model_state: State<SharedModelState>) -> Result<String, String> {
    inference::unload_model(&model_state)
}

#[tauri::command]
fn get_model_status(model_state: State<SharedModelState>) -> ModelStatus {
    ModelStatus {
        loaded: inference::is_model_loaded(&model_state),
        model_path: inference::get_loaded_model_path(&model_state),
    }
}

#[tauri::command]
fn scan_local_models(directory: String) -> Result<Vec<String>, String> {
    inference::scan_for_models(&directory)
}

#[tauri::command]
async fn chat_direct(
    model_state: State<'_, SharedModelState>,
    prompt: String,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
) -> Result<inference::InferenceResult, String> {
    // Default + clamp to keep sanity
    let max = max_tokens.unwrap_or(1024).max(1);
    let temp = temperature.unwrap_or(0.7);

    // Clone the shared state so it can move into the blocking thread
    let state = model_state.inner().clone();
    let prompt_clone = prompt.clone();

    // Offload heavy CPU work to a blocking worker thread
    let result = tokio::task::spawn_blocking(move || {
        inference::generate_response(&state, &prompt_clone, max, temp)
    })
    .await
    .map_err(|e| format!("Chat worker panicked: {}", e))?;

    result
}

#[tauri::command]
fn get_ai_settings(state: State<DbState>) -> Result<OnboardingState, String> {
    // Reuse onboarding state which contains AI settings
    get_onboarding_state(state)
}

// ---------- Aliases for Frontend Compatibility ----------
#[tauri::command]
fn get_courses(state: State<DbState>) -> Result<Vec<String>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT DISTINCT name FROM repositories WHERE name IS NOT NULL")
        .map_err(|e| e.to_string())?;
    let names = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for n in names {
        result.push(n.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
async fn import_youtube_playlist(
    state: State<'_, DbState>,
    repository_id: i64,
    url: String,
    folder_name: Option<String>,
) -> Result<(), String> {
    let playlist_data = youtube::fetch_playlist_data(&url)
        .await
        .map_err(|e| format!("Failed to fetch playlist: {}", e))?;

    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    let group = folder_name.unwrap_or(playlist_data.title);

    // Add Lectures to the existing repository
    for (idx, video) in playlist_data.videos.into_iter().enumerate() {
        let repo = SqliteLectureRepository;
        repo.create_lecture(
            &conn,
            repository_id,
            video.title,
            video.url,
            Some(video.thumbnail),
            Some(group.clone()),
            Some(idx as i32),
        )?;
    }

    Ok(())
}

#[tauri::command]
fn update_lecture_progress(state: State<DbState>, id: i64, completed: bool) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    conn.execute(
        "UPDATE lectures SET is_completed = ?1 WHERE id = ?2",
        (if completed { 1 } else { 0 }, id),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn create_course(
    state: State<DbState>,
    name: String,
    code: Option<String>,
    semester: Option<String>,
    description: Option<String>,
) -> AppResult<i64> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteRepositoryRepository;
    repo.create_repository(&conn, name, code, semester, description)
}

// ---------- Enhanced Node System Commands ----------

#[tauri::command]
fn get_link_types_cmd(state: State<DbState>) -> AppResult<Vec<LinkType>> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteLinkRepository;
    repo.get_link_types(&conn)
}

#[tauri::command]
fn get_resource_metadata_cmd(
    state: State<DbState>,
    resource_id: i64,
) -> AppResult<Option<ResourceMetadata>> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteLinkRepository;
    repo.get_resource_metadata(&conn, resource_id)
}

#[tauri::command]
fn update_resource_metadata_cmd(state: State<DbState>, meta: ResourceMetadata) -> AppResult<()> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteLinkRepository;
    repo.update_resource_metadata(&conn, meta)
}

#[tauri::command]
fn create_link_v2_cmd(
    state: State<DbState>,
    source_id: i64,
    target_id: i64,
    type_id: Option<i64>,
    strength: Option<f64>,
    bidirectional: bool,
) -> AppResult<i64> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteLinkRepository;
    repo.create_link_v2(
        &conn,
        source_id,
        target_id,
        type_id,
        strength,
        bidirectional,
    )
}

#[tauri::command]
fn get_links_v2_cmd(state: State<DbState>) -> AppResult<Vec<LinkV2>> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteLinkRepository;
    repo.get_links_v2(&conn)
}

#[tauri::command]
fn generate_large_graph(
    state: State<DbState>,
    repository_id: i64,
    node_count: i64,
    edges_per_node: i64,
) -> AppResult<()> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteGraphRepository;
    repo.generate_large_graph(&conn, repository_id, node_count, edges_per_node)
}

// ---------- Flashcard Commands ----------

#[tauri::command]
fn create_flashcard(
    state: State<DbState>,
    note_id: i64,
    front: String,
    back: String,
    heading_path: Option<String>,
) -> AppResult<i64> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteFlashcardRepository;
    repo.create_flashcard(&conn, note_id, front, back, heading_path)
}

#[tauri::command]
fn get_flashcards(state: State<DbState>, note_id: i64) -> AppResult<Vec<Flashcard>> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteFlashcardRepository;
    repo.get_flashcards_by_note(&conn, note_id)
}

#[tauri::command]
fn get_all_flashcards(state: State<DbState>) -> AppResult<Vec<Flashcard>> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteFlashcardRepository;
    repo.get_all_flashcards(&conn)
}

#[tauri::command]
fn delete_flashcard(state: State<DbState>, id: i64) -> AppResult<()> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteFlashcardRepository;
    repo.delete_flashcard(&conn, id)
}

#[tauri::command]
async fn generate_flashcards(
    model_state: State<'_, SharedModelState>,
    text: String,
) -> Result<inference::InferenceResult, String> {
    let system_prompt = "You are an expert educational content creator. Your task is to extract flashcards from the provided text. \
    Return strictly a JSON array of objects, where each object has 'front' (question) and 'back' (answer) keys. \
    Keep questions concise and answers accurate. Do not include any other text, markdown formatting, or explanations outside the JSON array.";

    let prompt = format!(
        "<|im_start|>system\n{}<|im_end|>\n<|im_start|>user\nCreate flashcards from this text:\n\n{}<|im_end|>\n<|im_start|>assistant\n",
        system_prompt, text
    );

    // Use a reasonable max tokens limit for flashcards
    let max_tokens = 2048;
    let temperature = 0.3; // Low temperature for deterministic output

    let state = model_state.inner().clone();

    let result = tokio::task::spawn_blocking(move || {
        inference::generate_response(&state, &prompt, max_tokens, temperature)
    })
    .await
    .map_err(|e| format!("Generation worker panicked: {}", e))?;

    result
}

#[derive(Deserialize)]
struct DocumentGenerationRequest {
    title: String,
    topic: String,
    description: String,
    target_audience: String,
    tone: String,
    length: String,
    language: String,
    document_type: String,
    formatting: String,
    section_structure: String,
    reference_material: Option<String>,
}

#[tauri::command]
async fn generate_document(
    model_state: State<'_, SharedModelState>,
    request: DocumentGenerationRequest,
) -> Result<inference::InferenceResult, String> {
    let system_prompt = format!(
        "You are an expert content creator specializing in educational materials. \
        Create a {} document in {} format for a {} audience. \
        The tone should be {}. The length should be {}. \
        Use {} language. Structure: {}.",
        request.document_type,
        request.formatting,
        request.target_audience,
        request.tone,
        request.length,
        request.language,
        request.section_structure
    );

    let reference_text = request
        .reference_material
        .filter(|s| !s.is_empty())
        .map(|s| format!("\n\nReference material:\n{}", s))
        .unwrap_or_default();

    let prompt = format!(
        "<|im_start|>system\n{}<|im_end|>\n<|im_start|>user\n\
        Title: {}\n\
        Topic: {}\n\
        Description: {}\n\
        {}\n\
        Please generate the complete document.<|im_end|>\n<|im_start|>assistant\n",
        system_prompt, request.title, request.topic, request.description, reference_text
    );

    let max_tokens = match request.length.as_str() {
        "short" => 1024,
        "medium" => 2048,
        "long" => 4096,
        _ => 2048,
    };

    let temperature = 0.7; // Balanced creativity and coherence

    let state = model_state.inner().clone();

    let result = tokio::task::spawn_blocking(move || {
        inference::generate_response(&state, &prompt, max_tokens, temperature)
    })
    .await
    .map_err(|e| format!("Generation worker panicked: {}", e))?;

    result
}

#[derive(Deserialize)]
struct PresentationGenerationRequest {
    title: String,
    topic: String,
    description: String,
    target_audience: String,
    tone: String,
    slide_count: String,
    language: String,
    slide_style: String,
    bullet_preference: String,
    include_speaker_notes: bool,
    reference_material: Option<String>,
}

#[tauri::command]
async fn generate_presentation(
    model_state: State<'_, SharedModelState>,
    request: PresentationGenerationRequest,
) -> Result<inference::InferenceResult, String> {
    let speaker_notes_instruction = if request.include_speaker_notes {
        "Include detailed speaker notes for each slide."
    } else {
        ""
    };

    let system_prompt = format!(
        "You are an expert presentation designer. \
        Create a {} presentation with {} slides in {} style. \
        Target audience: {}. Tone: {}. Bullet points: {}. \
        Language: {}. {}",
        request.slide_style,
        request.slide_count,
        request.slide_style,
        request.target_audience,
        request.tone,
        request.bullet_preference,
        request.language,
        speaker_notes_instruction
    );

    let reference_text = request
        .reference_material
        .filter(|s| !s.is_empty())
        .map(|s| format!("\n\nReference material:\n{}", s))
        .unwrap_or_default();

    let prompt = format!(
        "<|im_start|>system\n{}<|im_end|>\n<|im_start|>user\n\
        Title: {}\n\
        Topic: {}\n\
        Description: {}\n\
        {}\n\
        Generate a complete presentation with {} slides. \
        Format each slide with a title and content. \
        {}\
        <|im_end|>\n<|im_start|>assistant\n",
        system_prompt,
        request.title,
        request.topic,
        request.description,
        request.slide_count,
        reference_text,
        if request.include_speaker_notes {
            "Include speaker notes for each slide.\n"
        } else {
            ""
        }
    );

    let max_tokens = 4096; // Presentations need more tokens
    let temperature = 0.7;

    let state = model_state.inner().clone();

    let result = tokio::task::spawn_blocking(move || {
        inference::generate_response(&state, &prompt, max_tokens, temperature)
    })
    .await
    .map_err(|e| format!("Generation worker panicked: {}", e))?;

    result
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize tracing with file output
    let app_data_dir = std::env::current_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .join("app.log");

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "uni_study_app=info".into()),
        )
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(move || {
                    std::fs::OpenOptions::new()
                        .create(true)
                        .append(true)
                        .open(&app_data_dir)
                        .expect("Failed to open log file")
                })
                .with_ansi(false),
        )
        .init();

    tracing::info!("Starting Uni Study App");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let db_manager =
                DatabaseManager::new(app.handle().clone()).expect("failed to init db manager");
            app.manage(DbState { db_manager });
            // Initialize model state for direct inference
            app.manage(inference::create_model_state());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            read_file_base64,
            add_resource,
            create_resource,
            get_resources,
            image_resize,
            image_convert,
            image_batch_optimize,
            pdf_merge,
            pdf_extract_pages,
            pdf_compress,
            pdf_to_markdown,
            create_link,
            get_links,
            import_resource,
            process_text_to_nodes,
            register_user,
            login,
            get_current_user,
            logout,
            set_remembered_user,
            get_remembered_user,
            get_user_profile,
            set_user_profile,
            get_app_settings,
            set_app_settings,
            get_repositories,
            create_repository,
            delete_repository,
            get_lectures,
            create_lecture,
            delete_lecture,
            delete_resource,
            update_resource,
            create_task,
            get_tasks,
            update_task_status,
            delete_task,
            create_planner_event,
            get_planner_events,
            delete_planner_event,
            get_courses,
            create_course,
            get_onboarding_state,
            set_onboarding_state,
            check_ollama_connection,
            list_ollama_models,
            chat_with_ollama,
            get_ai_settings,
            // Direct GGUF inference
            load_gguf_model,
            unload_gguf_model,
            get_model_status,
            scan_local_models,
            chat_direct,
            debug_db_schema,
            delete_profile,
            // Enhanced Node System
            get_link_types_cmd,
            get_resource_metadata_cmd,
            update_resource_metadata_cmd,
            create_link_v2_cmd,
            get_links_v2_cmd,
            generate_large_graph,
            // Grades - Data Access Layer
            grades::get_semesters,
            grades::create_semester,
            grades::delete_semester,
            grades::update_course_grade_details,
            grades::get_gpa_summary,
            // Grading Scales Management
            grades::get_grading_scales,
            grades::get_grading_scale,
            import_youtube_playlist,
            update_lecture_progress,
            grades::create_grading_scale,
            // Programs Management
            grades::get_programs,
            grades::get_program,
            grades::create_program,
            grades::set_user_program,
            grades::get_user_program,
            grades::delete_program,
            // Projection Settings
            grades::save_projection_settings,
            grades::get_projection_settings,
            // Conversion Functions
            grades::convert_score_to_points,
            grades::convert_letter_to_points,
            grades::calculate_weighted_component_score,
            grades::convert_course_grade_to_points,
            // Projection Functions
            grades::project_grades,
            grades::get_semester_targets,
            grades::get_course_targets,
            projection::estimate_study_hours,
            projection::add_study_tasks_to_planner,
            // Flashcards
            create_flashcard,
            get_flashcards,
            get_all_flashcards,
            delete_flashcard,
            generate_flashcards,
            generate_document,
            generate_presentation,
            // Finance
            get_finance_summary,
            create_finance_transaction,
            get_finance_transactions,
            get_finance_budgets,
            update_finance_budget,
            get_savings_goals,
            update_savings_goal,
            get_finance_assets,
            // Expanded Finance
            update_finance_transaction,
            delete_finance_transaction,
            create_finance_asset,
            update_finance_asset,
            delete_finance_asset,
            create_finance_budget,
            delete_finance_budget,
            get_expense_flows,
            // Book Progress & Bookmarks
            book_commands::save_book_progress,
            book_commands::get_book_progress,
            book_commands::create_bookmark,
            book_commands::get_bookmarks,
            book_commands::delete_bookmark,
            book_commands::create_highlight,
            book_commands::get_highlights,
            book_commands::delete_highlight,
            // Study Commands
            start_study_session,
            stop_study_session,
            get_study_sessions,
            create_d_day,
            get_d_days,
            delete_d_day
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn update_finance_transaction(
    state: State<DbState>,
    transaction: FinanceTransaction,
) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    finance::update_transaction(&conn, transaction)
}

#[tauri::command]
fn delete_finance_transaction(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    finance::delete_transaction(&conn, id)
}

#[tauri::command]
fn create_finance_asset(state: State<DbState>, asset: FinanceAsset) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    finance::create_asset(&conn, asset)
}

#[tauri::command]
fn update_finance_asset(state: State<DbState>, asset: FinanceAsset) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    finance::update_asset(&conn, asset)
}

#[tauri::command]
fn delete_finance_asset(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    finance::delete_asset(&conn, id)
}

#[tauri::command]
fn create_finance_budget(state: State<DbState>, budget: FinanceBudget) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    finance::create_budget(&conn, budget)
}

#[tauri::command]
fn delete_finance_budget(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    finance::delete_budget(&conn, id)
}

#[tauri::command]
fn get_expense_flows(state: State<DbState>) -> Result<Vec<ExpenseFlow>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    finance::get_expense_flows(&conn)
}

#[tauri::command]
fn get_finance_summary(state: State<DbState>) -> Result<FinanceSummary, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    finance::get_finance_summary(&conn)
}

#[tauri::command]
fn create_finance_transaction(
    state: State<DbState>,
    transaction: FinanceTransaction,
) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    finance::create_transaction(&conn, transaction)
}

#[tauri::command]
fn get_finance_transactions(state: State<DbState>) -> Result<Vec<FinanceTransaction>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    finance::get_transactions(&conn)
}

#[tauri::command]
fn get_finance_budgets(state: State<DbState>) -> Result<Vec<FinanceBudget>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    finance::get_budgets(&conn)
}

#[tauri::command]
fn update_finance_budget(state: State<DbState>, budget: FinanceBudget) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    finance::update_budget(&conn, budget)
}

#[tauri::command]
fn get_savings_goals(state: State<DbState>) -> Result<Vec<SavingsGoal>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    finance::get_savings_goals(&conn)
}

#[tauri::command]
fn update_savings_goal(state: State<DbState>, goal: SavingsGoal) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    finance::update_savings_goal(&conn, goal)
}

#[tauri::command]
fn get_finance_assets(state: State<DbState>) -> Result<Vec<FinanceAsset>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    finance::get_assets(&conn)
}

// ---------- Study Commands ----------
#[tauri::command]
fn start_study_session(
    state: State<DbState>,
    repository_id: Option<i64>,
    start_at: String,
    is_break: bool,
) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteStudySessionRepository;
    repo.create_study_session(&conn, repository_id, start_at, is_break)
}

#[tauri::command]
fn stop_study_session(
    state: State<DbState>,
    id: i64,
    end_at: String,
    duration: i32,
) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteStudySessionRepository;
    repo.stop_study_session(&conn, id, end_at, duration)
}

#[tauri::command]
fn get_study_sessions(
    state: State<DbState>,
    from: Option<String>,
) -> Result<Vec<StudySession>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteStudySessionRepository;
    repo.get_study_sessions(&conn, from)
}

#[tauri::command]
fn create_d_day(
    state: State<DbState>,
    title: String,
    target_date: String,
    color: Option<String>,
) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteDDayRepository;
    repo.create_d_day(&conn, title, target_date, color)
}

#[tauri::command]
fn get_d_days(state: State<DbState>) -> Result<Vec<DDay>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteDDayRepository;
    repo.get_d_days(&conn)
}

#[tauri::command]
fn delete_d_day(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let repo = SqliteDDayRepository;
    repo.delete_d_day(&conn, id)
}

#[tauri::command]
fn debug_db_schema(state: State<DbState>, table_name: String) -> Result<String, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({})", table_name))
        .map_err(|e| e.to_string())?;

    let columns = stmt
        .query_map([], |row| {
            let name: String = row.get(1)?;
            Ok(name)
        })
        .map_err(|e| e.to_string())?;

    let mut names = Vec::new();
    for c in columns {
        names.push(c.map_err(|e| e.to_string())?);
    }
    Ok(names.join(", "))
}
