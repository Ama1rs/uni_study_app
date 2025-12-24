mod conversion;
mod db;
mod db_manager;
mod image_tools;
mod finance;
mod grades;
mod inference;
mod ollama;
mod pdf_tools;
mod projection;

use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use base64::{engine::general_purpose, Engine as _};
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

// Redefine DbState to hold the DatabaseManager
pub struct DbState {
    pub db_manager: DatabaseManager,
}

#[derive(Serialize, Deserialize)]
pub struct Resource {
    id: i64,
    repository_id: Option<i64>,
    title: String,
    #[serde(rename = "type")]
    type_: String,
    path: Option<String>,
    content: Option<String>,
    tags: Option<String>,
    created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct UserProfile {
    pub id: i64,
    pub name: Option<String>,
    pub university: Option<String>,
    pub avatar_path: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub id: i64,
    pub theme_style: String,
    pub theme_mode: String,
    pub accent: String,
    pub sidebar_hidden: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct UserPublic {
    pub id: i64,
    pub username: String,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Repository {
    pub id: i64,
    pub name: String,
    pub code: Option<String>,
    pub semester: Option<String>,
    pub description: Option<String>,
    pub credits: f64,
    pub semester_id: Option<i64>,
    pub manual_grade: Option<f64>,
    pub status: String,
    pub component_config: Option<String>,
    pub component_scores: Option<String>,
    pub grading_scale_id: Option<i64>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Lecture {
    pub id: i64,
    pub repository_id: i64,
    pub title: String,
    pub url: String,
    pub thumbnail: Option<String>,
}

// Re-export Link from db
pub use conversion::{
    calculate_weighted_score, convert_course_score, convert_letter_grade, convert_numeric_score,
    get_letter_for_points,
};
pub use db::{
    DDay, Flashcard, Link, LinkType, LinkV2, PlannerEvent, ResourceMetadata, StudySession, Task,
};

fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| e.to_string())
        .map(|hash| hash.to_string())
}

fn verify_password(hash: &str, password: &str) -> Result<bool, String> {
    let parsed_hash = PasswordHash::new(hash).map_err(|e| e.to_string())?;
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map(|_| true)
        .map_err(|e| e.to_string())
}

fn get_session_user_id(conn: &rusqlite::Connection) -> Result<Option<i64>, String> {
    conn.query_row(
        "SELECT current_user_id FROM session_state WHERE id = 1",
        [],
        |row| row.get::<_, Option<i64>>(0),
    )
    .optional()
    .map_err(|e| e.to_string())
    .map(|opt| opt.flatten())
}

#[tauri::command]
fn read_file_base64(path: String) -> Result<String, String> {
    let mut file = File::open(&path).map_err(|e| e.to_string())?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
    Ok(general_purpose::STANDARD.encode(&buffer))
}

fn fetch_user_public(conn: &rusqlite::Connection, user_id: i64) -> Result<UserPublic, String> {
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
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn register_user(
    state: State<DbState>,
    username: String,
    password: String,
) -> Result<UserPublic, String> {
    if username.trim().is_empty() || password.trim().is_empty() {
        return Err("Username and password are required".to_string());
    }
    if password.len() < 6 {
        return Err("Password must be at least 6 characters".to_string());
    }

    let global_conn = state.db_manager.get_global_conn();
    let conn = global_conn.lock().unwrap();
    let hash = hash_password(&password)?;

    conn.execute(
        "INSERT INTO users (username, password_hash) VALUES (?1, ?2)",
        (&username, &hash),
    )
    .map_err(|e| e.to_string())?;
    let user_id = conn.last_insert_rowid();

    conn.execute(
        "INSERT INTO session_state (id, current_user_id, last_user_id) VALUES (1, ?1, NULL)
         ON CONFLICT(id) DO UPDATE SET current_user_id=excluded.current_user_id",
        [&user_id],
    )
    .map_err(|e| e.to_string())?;

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
        .map_err(|e| e.to_string())?;

    // Return public user info (re-acquire global lock or just execute query on global conn which is shared but we released lock)
    // Actually fetch_user_public takes &Connection, we can pass global conn after re-locking
    let conn = global_conn.lock().unwrap();
    fetch_user_public(&conn, user_id)
}

#[tauri::command]
fn login(state: State<DbState>, username: String, password: String) -> Result<UserPublic, String> {
    let global_conn = state.db_manager.get_global_conn();
    let conn = global_conn.lock().unwrap();
    let (user_id, stored_hash): (i64, String) = conn
        .query_row(
            "SELECT id, password_hash FROM users WHERE username = ?1",
            [&username],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "Invalid username or password".to_string())?;

    let is_valid = verify_password(&stored_hash, &password)?;
    if !is_valid {
        return Err("Invalid username or password".to_string());
    }

    conn.execute(
        "INSERT INTO session_state (id, current_user_id) VALUES (1, ?1)
         ON CONFLICT(id) DO UPDATE SET current_user_id=excluded.current_user_id",
        [&user_id],
    )
    .map_err(|e| e.to_string())?;

    // Warm up profile database
    drop(conn); // Release global lock
    state.db_manager.get_profile_db(user_id)?;

    // Return user info
    let conn = global_conn.lock().unwrap();
    fetch_user_public(&conn, user_id)
}

#[tauri::command]
fn get_current_user(state: State<DbState>) -> Result<Option<UserPublic>, String> {
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
fn logout(state: State<DbState>) -> Result<(), String> {
    let global_conn = state.db_manager.get_global_conn();
    let conn = global_conn.lock().unwrap();

    // Get current user to close connection
    let current_user_id = get_session_user_id(&conn)?;

    conn.execute(
        "INSERT INTO session_state (id, current_user_id) VALUES (1, NULL)
         ON CONFLICT(id) DO UPDATE SET current_user_id=NULL",
        [],
    )
    .map_err(|e| e.to_string())?;

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

#[derive(Serialize, Deserialize, Clone, Default)]
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
    println!("get_onboarding_state called");
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    println!("get_onboarding_state: lock acquired");

    let mut stmt = conn
        .prepare("SELECT completed, ai_provider, ai_api_key, ai_endpoint, db_type, db_url, user_name, university, n_gpu_layers, n_ctx, n_threads, system_prompt, temperature, top_p, max_tokens FROM onboarding_state WHERE id = 1")
        .map_err(|e| {
            println!("get_onboarding_state: prepare failed: {}", e);
            e.to_string()
        })?;
    println!("get_onboarding_state: prepare success");

    let mut rows = stmt.query([]).map_err(|e| {
        println!("get_onboarding_state: query failed: {}", e);
        e.to_string()
    })?;
    println!("get_onboarding_state: query success");

    if let Some(row) = rows.next().map_err(|e| {
        println!("get_onboarding_state: rows.next failed: {}", e);
        e.to_string()
    })? {
        println!("Found existing onboarding state");
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
        println!("No onboarding state found, returning default");
        Ok(OnboardingState::default())
    }
}

#[tauri::command]
fn set_onboarding_state(
    state: State<DbState>,
    onboarding_state: OnboardingState,
) -> Result<(), String> {
    println!(
        "set_onboarding_state called with completed={}",
        onboarding_state.completed
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

    println!("set_onboarding_state success");
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
) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::create_resource(&conn, repository_id, title, type_, path, content, tags)
}

#[derive(Serialize, Deserialize)]
struct AddResourcePayload {
    #[serde(rename = "repositoryId")]
    repository_id: i64,
    title: String,
    #[serde(rename = "resourceType")]
    resource_type: String,
    content: Option<String>,
}

#[tauri::command]
fn add_resource(state: State<DbState>, payload: AddResourcePayload) -> Result<Resource, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    let id = db::create_resource(
        &conn,
        Some(payload.repository_id),
        payload.title,
        payload.resource_type,
        None,
        payload.content,
        None,
    )?;

    let resources = db::get_resources(&conn, Some(payload.repository_id))?;
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
fn get_resources(
    state: State<DbState>,
    repository_id: Option<i64>,
) -> Result<Vec<Resource>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    let resources = db::get_resources(&conn, repository_id)?;
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
fn create_link(state: State<DbState>, source_id: i64, target_id: i64) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::create_link(&conn, source_id, target_id)
}

#[tauri::command]
fn get_links(state: State<DbState>) -> Result<Vec<Link>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::get_links(&conn)
}

#[tauri::command]
fn import_resource(
    app: tauri::AppHandle,
    state: State<DbState>,
    repository_id: i64,
    file_path: String,
) -> Result<i64, String> {
    println!(
        "Backend: import_resource called. Repo: {}, Path: {}",
        repository_id, file_path
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
        _ => "file",
    };

    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::create_resource(
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
fn process_text_to_nodes(
    state: State<DbState>,
    repository_id: i64,
    text: String,
) -> Result<Vec<i64>, String> {
    println!(
        "Backend: process_text_to_nodes called. Repo: {}, Text len: {}",
        repository_id,
        text.len()
    );
    // Simple heuristic: split by double newlines
    let chunks: Vec<&str> = text
        .split("\n\n")
        .filter(|s| !s.trim().is_empty())
        .collect();

    let mut created_ids = Vec::new();
    let mut prev_id = None;

    for chunk in chunks.iter() {
        let title = if chunk.len() > 30 {
            format!("{}...", &chunk[0..30])
        } else {
            chunk.to_string()
        };

        let conn_arc = state.db_manager.get_active_profile_db()?;
        let conn = conn_arc.lock().unwrap();
        let id = db::create_resource(
            &conn,
            Some(repository_id),
            title,
            "note".to_string(),
            None,
            Some(chunk.to_string()),
            Some("auto-generated".to_string()),
        )?;

        created_ids.push(id);

        // Link to previous node
        if let Some(pid) = prev_id {
            let _ = db::create_link(&conn, pid, id);
        }
        prev_id = Some(id);
    }

    Ok(created_ids)
}

#[tauri::command]
fn get_user_profile(state: State<DbState>) -> Result<UserProfile, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // Check if profile exists for user, if not create default
    // Wait, register_user creates it. But maybe migration needs to handle it.
    // Assuming it exists or migration made it.

    conn.query_row(
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
    .map_err(|e| e.to_string())
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
        "SELECT id, theme_style, theme_mode, accent, sidebar_hidden FROM app_settings LIMIT 1",
        [],
        |row| {
            Ok(AppSettings {
                id: row.get(0)?,
                theme_style: row.get(1)?,
                theme_mode: row.get(2)?,
                accent: row.get(3)?,
                sidebar_hidden: row.get(4)?,
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
    conn.execute(
        "INSERT INTO app_settings (id, theme_style, theme_mode, accent, sidebar_hidden) VALUES (1, ?1, ?2, ?3, ?4)",
        (&settings.theme_style, &settings.theme_mode, &settings.accent, &sidebar_hidden_int),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_repositories(state: State<DbState>) -> Result<Vec<Repository>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::get_repositories(&conn)
}

#[tauri::command]
fn create_repository(
    state: State<DbState>,
    name: String,
    code: Option<String>,
    semester: Option<String>,
    description: Option<String>,
) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::create_repository(&conn, name, code, semester, description)
}

#[tauri::command]
fn get_lectures(state: State<DbState>, repository_id: i64) -> Result<Vec<Lecture>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::get_lectures(&conn, repository_id)
}

#[tauri::command]
fn create_lecture(
    state: State<DbState>,
    repository_id: i64,
    title: String,
    url: String,
    thumbnail: Option<String>,
) -> Result<i64, String> {
    println!(
        "Backend: create_lecture called. Repo: {}, Title: {}",
        repository_id, title
    );
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::create_lecture(&conn, repository_id, title, url, thumbnail)
}

#[tauri::command]
fn delete_repository(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::delete_repository(&conn, id)
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
    db::update_resource(&conn, id, title, content, tags)
}

#[tauri::command]
fn delete_resource(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::delete_resource(&conn, id)
}

#[tauri::command]
fn delete_lecture(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::delete_lecture(&conn, id)
}

// ---------- Task Commands ----------
#[tauri::command]
fn create_task(state: State<DbState>, title: String) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::create_task(&conn, title)
}

#[tauri::command]
fn get_tasks(state: State<DbState>) -> Result<Vec<Task>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::get_tasks(&conn)
}

#[tauri::command]
fn update_task_status(state: State<DbState>, id: i64, completed: bool) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::update_task_status(&conn, id, completed)
}

#[tauri::command]
fn delete_task(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::delete_task(&conn, id)
}

// ---------- Planner Commands ----------
#[tauri::command]
fn create_planner_event(
    state: State<DbState>,
    repository_id: Option<i64>,
    title: String,
    description: Option<String>,
    start_at: String,
    end_at: String,
    recurrence: Option<String>,
) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::create_planner_event(
        &conn,
        repository_id,
        title,
        description,
        start_at,
        end_at,
        recurrence,
    )
}

#[tauri::command]
fn get_planner_events(
    state: State<DbState>,
    from: Option<String>,
    to: Option<String>,
) -> Result<Vec<PlannerEvent>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::get_planner_events(&conn, from, to)
}

#[tauri::command]
fn delete_planner_event(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::delete_planner_event(&conn, id)
}

// ---------- Ollama / LLM Commands ----------

#[derive(Serialize, Deserialize)]
pub struct OllamaModelInfo {
    pub name: String,
    pub size: Option<u64>,
}

#[derive(Serialize, Deserialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessageInput>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<i32>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ChatMessageInput {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Deserialize)]
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

#[derive(Serialize, Deserialize)]
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
fn create_course(
    state: State<DbState>,
    name: String,
    code: Option<String>,
    semester: Option<String>,
    description: Option<String>,
) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::create_repository(&conn, name, code, semester, description)
}

// ---------- Enhanced Node System Commands ----------

#[tauri::command]
fn get_link_types_cmd(state: State<DbState>) -> Result<Vec<LinkType>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::get_link_types(&conn)
}

#[tauri::command]
fn get_resource_metadata_cmd(
    state: State<DbState>,
    resource_id: i64,
) -> Result<Option<ResourceMetadata>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::get_resource_metadata(&conn, resource_id)
}

#[tauri::command]
fn update_resource_metadata_cmd(
    state: State<DbState>,
    meta: ResourceMetadata,
) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::update_resource_metadata(&conn, meta)
}

#[tauri::command]
fn create_link_v2_cmd(
    state: State<DbState>,
    source_id: i64,
    target_id: i64,
    type_id: Option<i64>,
    strength: Option<f64>,
    bidirectional: bool,
) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::create_link_v2(
        &conn,
        source_id,
        target_id,
        type_id,
        strength,
        bidirectional,
    )
}

#[tauri::command]
fn get_links_v2_cmd(state: State<DbState>) -> Result<Vec<LinkV2>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::get_links_v2(&conn)
}

#[tauri::command]
fn generate_large_graph(
    state: State<DbState>,
    repository_id: i64,
    node_count: i64,
    edges_per_node: i64,
) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::generate_large_graph(&conn, repository_id, node_count, edges_per_node)
}

// ---------- Flashcard Commands ----------

#[tauri::command]
fn create_flashcard(
    state: State<DbState>,
    note_id: i64,
    front: String,
    back: String,
    heading_path: Option<String>,
) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::create_flashcard(&conn, note_id, front, back, heading_path)
}

#[tauri::command]
fn get_flashcards(state: State<DbState>, note_id: i64) -> Result<Vec<Flashcard>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::get_flashcards_by_note(&conn, note_id)
}

#[tauri::command]
fn get_all_flashcards(state: State<DbState>) -> Result<Vec<Flashcard>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::get_all_flashcards(&conn)
}

#[tauri::command]
fn delete_flashcard(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::delete_flashcard(&conn, id)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
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
            grades::create_grading_scale,
            // Programs Management
            grades::get_programs,
            grades::get_program,
            grades::create_program,
            grades::set_user_program,
            grades::get_user_program,
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
            // Flashcards
            create_flashcard,
            get_flashcards,
            get_all_flashcards,
            delete_flashcard,
            generate_flashcards,
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
    db::create_study_session(&conn, repository_id, start_at, is_break)
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
    db::stop_study_session(&conn, id, end_at, duration)
}

#[tauri::command]
fn get_study_sessions(
    state: State<DbState>,
    from: Option<String>,
) -> Result<Vec<StudySession>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::get_study_sessions(&conn, from)
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
    db::create_d_day(&conn, title, target_date, color)
}

#[tauri::command]
fn get_d_days(state: State<DbState>) -> Result<Vec<DDay>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::get_d_days(&conn)
}

#[tauri::command]
fn delete_d_day(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();
    db::delete_d_day(&conn, id)
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
