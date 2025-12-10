mod db;
mod inference;
mod ollama;

use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use db::DbState;
use inference::SharedModelState;
use ollama::{ChatMessage, ChatOptions, OllamaClient};
use rand_core::OsRng;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;
use rusqlite::OptionalExtension;
use tauri::{Manager, State};

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
pub use db::Link;
pub use db::PlannerEvent;

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
fn register_user(state: State<DbState>, username: String, password: String) -> Result<UserPublic, String> {
    if username.trim().is_empty() || password.trim().is_empty() {
        return Err("Username and password are required".to_string());
    }
    if password.len() < 6 {
        return Err("Password must be at least 6 characters".to_string());
    }

    let conn = state.conn.lock().unwrap();
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

    fetch_user_public(&conn, user_id)
}

#[tauri::command]
fn login(state: State<DbState>, username: String, password: String) -> Result<UserPublic, String> {
    let conn = state.conn.lock().unwrap();
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

    fetch_user_public(&conn, user_id)
}

#[tauri::command]
fn get_current_user(state: State<DbState>) -> Result<Option<UserPublic>, String> {
    let conn = state.conn.lock().unwrap();
    if let Some(uid) = get_session_user_id(&conn)? {
        let user = fetch_user_public(&conn, uid)?;
        Ok(Some(user))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn logout(state: State<DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO session_state (id, current_user_id) VALUES (1, NULL)
         ON CONFLICT(id) DO UPDATE SET current_user_id=NULL",
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_remembered_user(state: State<DbState>, user_id: Option<i64>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
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
    let conn = state.conn.lock().unwrap();
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
}

#[tauri::command]
fn get_onboarding_state(state: State<DbState>) -> Result<OnboardingState, String> {
    println!("get_onboarding_state called");
    let conn = state.conn.lock().unwrap();
    println!("get_onboarding_state: lock acquired");

    let mut stmt = conn
        .prepare("SELECT completed, ai_provider, ai_api_key, ai_endpoint, db_type, db_url, user_name, university FROM onboarding_state WHERE id = 1")
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
        })
    } else {
        println!("No onboarding state found, returning default");
        Ok(OnboardingState::default())
    }
}

#[tauri::command]
fn set_onboarding_state(state: State<DbState>, data: OnboardingState) -> Result<(), String> {
    println!(
        "set_onboarding_state called with completed={}",
        data.completed
    );
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO onboarding_state (id, completed, ai_provider, ai_api_key, ai_endpoint, db_type, db_url, user_name, university) 
         VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        (
            &data.completed,
            &data.ai_provider,
            &data.ai_api_key,
            &data.ai_endpoint,
            &data.db_type,
            &data.db_url,
            &data.user_name,
            &data.university
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
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO resources (repository_id, title, type, path, content, tags) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (&repository_id, &title, &type_, &path, &content, &tags),
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn get_resources(
    state: State<DbState>,
    repository_id: Option<i64>,
) -> Result<Vec<Resource>, String> {
    let conn = state.conn.lock().unwrap();

    let mut query =
        "SELECT id, repository_id, title, type, path, content, tags, created_at FROM resources"
            .to_string();

    if repository_id.is_some() {
        query.push_str(" WHERE repository_id = ?1");
    }
    query.push_str(" ORDER BY created_at DESC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let result: Result<Vec<Resource>, String> = if let Some(cid) = repository_id {
        stmt.query_map([cid], |row| {
            Ok(Resource {
                id: row.get(0)?,
                repository_id: row.get(1)?,
                title: row.get(2)?,
                type_: row.get(3)?,
                path: row.get(4)?,
                content: row.get(5)?,
                tags: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
    } else {
        stmt.query_map([], |row| {
            Ok(Resource {
                id: row.get(0)?,
                repository_id: row.get(1)?,
                title: row.get(2)?,
                type_: row.get(3)?,
                path: row.get(4)?,
                content: row.get(5)?,
                tags: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
    };

    result
}
#[tauri::command]
fn create_link(state: State<DbState>, source_id: i64, target_id: i64) -> Result<i64, String> {
    db::create_link(&state, source_id, target_id)
}

#[tauri::command]
fn get_links(state: State<DbState>) -> Result<Vec<Link>, String> {
    db::get_links(&state)
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

    create_resource(
        state,
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

        let id = create_resource(
            state.clone(),
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
            let _ = create_link(state.clone(), pid, id);
        }
        prev_id = Some(id);
    }

    Ok(created_ids)
}

#[tauri::command]
fn get_user_profile(state: State<DbState>) -> Result<UserProfile, String> {
    let conn = state.conn.lock().unwrap();
    let user_id = get_session_user_id(&conn)?.unwrap_or(0);
    if user_id == 0 {
        return Ok(UserProfile {
            id: 0,
            name: None,
            university: None,
            avatar_path: None,
        });
    }

    let mut stmt = conn
        .prepare("SELECT user_id, name, university, avatar_path FROM user_profiles WHERE user_id = ?1")
        .map_err(|e| e.to_string())?;
    let profile_result = stmt.query_row([user_id], |row| {
        Ok(UserProfile {
            id: row.get(0)?,
            name: row.get(1)?,
            university: row.get(2)?,
            avatar_path: row.get(3)?,
        })
    });

    match profile_result {
        Ok(profile) => Ok(profile),
        Err(_) => Ok(UserProfile {
            id: user_id,
            name: None,
            university: None,
            avatar_path: None,
        }),
    }
}

#[tauri::command]
fn set_user_profile(state: State<DbState>, profile: UserProfile) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    let user_id = if profile.id > 0 {
        profile.id
    } else {
        get_session_user_id(&conn)?.ok_or("No active user")?
    };
    conn.execute(
        "INSERT INTO user_profiles (user_id, name, university, avatar_path) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(user_id) DO UPDATE SET name=excluded.name, university=excluded.university, avatar_path=excluded.avatar_path",
        (
            &user_id,
            &profile.name,
            &profile.university,
            &profile.avatar_path,
        ),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_app_settings(state: State<DbState>) -> Result<AppSettings, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT id, theme_style, theme_mode, accent, sidebar_hidden FROM app_settings LIMIT 1",
        )
        .map_err(|e| e.to_string())?;
    let settings_result = stmt.query_row([], |row| {
        let hidden_int: i64 = row.get(4)?;
        Ok(AppSettings {
            id: row.get(0)?,
            theme_style: row.get(1)?,
            theme_mode: row.get(2)?,
            accent: row.get(3)?,
            sidebar_hidden: hidden_int != 0,
        })
    });

    match settings_result {
        Ok(settings) => Ok(settings),
        Err(_) => Ok(AppSettings {
            id: 1,
            theme_style: "default".to_string(),
            theme_mode: "dark".to_string(),
            accent: "blue".to_string(),
            sidebar_hidden: false,
            // Default settings
        }),
    }
}

#[tauri::command]
fn set_app_settings(state: State<DbState>, settings: AppSettings) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
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
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, name, code, semester, description FROM repositories")
        .map_err(|e| e.to_string())?;
    let repositories = stmt
        .query_map([], |row| {
            Ok(Repository {
                id: row.get(0)?,
                name: row.get(1)?,
                code: row.get(2)?,
                semester: row.get(3)?,
                description: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for r in repositories {
        result.push(r.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn create_repository(
    state: State<DbState>,
    name: String,
    code: Option<String>,
    semester: Option<String>,
    description: Option<String>,
) -> Result<i64, String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO repositories (name, code, semester, description) VALUES (?1, ?2, ?3, ?4)",
        (&name, &code, &semester, &description),
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn get_lectures(state: State<DbState>, repository_id: i64) -> Result<Vec<Lecture>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT id, COALESCE(repository_id, course_id) as repo_id, title, url, thumbnail 
             FROM lectures 
             WHERE repository_id = ?1 OR course_id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let lectures = stmt
        .query_map([repository_id], |row| {
            Ok(Lecture {
                id: row.get(0)?,
                repository_id: row.get(1)?,
                title: row.get(2)?,
                url: row.get(3)?,
                thumbnail: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for l in lectures {
        result.push(l.map_err(|e| e.to_string())?);
    }
    Ok(result)
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
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO lectures (repository_id, course_id, title, url, thumbnail) VALUES (?1, ?1, ?2, ?3, ?4)",
        (&repository_id, &title, &url, &thumbnail),
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn delete_repository(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    // First, get all resources in this repository
    let resource_ids: Vec<i64> = conn
        .prepare("SELECT id FROM resources WHERE repository_id = ?1")
        .and_then(|mut stmt| {
            stmt.query_map([&id], |row| Ok(row.get(0)?))
                .and_then(|iter| iter.collect::<Result<Vec<_>, _>>())
        })
        .map_err(|e| e.to_string())?;

    // Delete all links that reference any of these resources
    for resource_id in &resource_ids {
        conn.execute(
            "DELETE FROM resource_links WHERE source_id = ?1 OR target_id = ?1",
            [resource_id],
        )
        .map_err(|e| e.to_string())?;
    }

    // Delete all resources in this repository
    conn.execute("DELETE FROM resources WHERE repository_id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    // Delete all lectures in this repository
    conn.execute("DELETE FROM lectures WHERE repository_id = ?1", [&id])
        .map_err(|e| e.to_string())?;

    // Finally, delete the repository itself
    conn.execute("DELETE FROM repositories WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn update_resource(
    state: State<DbState>,
    id: i64,
    title: Option<String>,
    content: Option<String>,
    tags: Option<String>,
) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();

    // Build update clauses
    let mut updates = Vec::<String>::new();

    if title.is_some() {
        updates.push("title = ?1".to_string());
    }
    if content.is_some() {
        let param_num = if title.is_some() { "?2" } else { "?1" };
        updates.push(format!("content = {}", param_num));
    }
    if tags.is_some() {
        let param_num = match (title.is_some(), content.is_some()) {
            (true, true) => "?3",
            (true, false) => "?2",
            (false, true) => "?2",
            (false, false) => "?1",
        };
        updates.push(format!("tags = {}", param_num));
    }

    if updates.is_empty() {
        return Ok(());
    }

    // Calculate the id parameter number
    let id_param_num = match (title.is_some(), content.is_some(), tags.is_some()) {
        (true, true, true) => "?4",
        (true, true, false) => "?3",
        (true, false, true) => "?3",
        (true, false, false) => "?2",
        (false, true, true) => "?3",
        (false, true, false) => "?2",
        (false, false, true) => "?2",
        (false, false, false) => "?1",
    };

    let query = format!(
        "UPDATE resources SET {} WHERE id = {}",
        updates.join(", "),
        id_param_num
    );

    // Execute with parameters in order
    match (title, content, tags) {
        (Some(t), Some(c), Some(tags_val)) => {
            conn.execute(&query, (&t, &c, &tags_val, &id))
                .map_err(|e| e.to_string())?;
        }
        (Some(t), Some(c), None) => {
            conn.execute(&query, (&t, &c, &id))
                .map_err(|e| e.to_string())?;
        }
        (Some(t), None, Some(tags_val)) => {
            conn.execute(&query, (&t, &tags_val, &id))
                .map_err(|e| e.to_string())?;
        }
        (Some(t), None, None) => {
            conn.execute(&query, (&t, &id)).map_err(|e| e.to_string())?;
        }
        (None, Some(c), Some(tags_val)) => {
            conn.execute(&query, (&c, &tags_val, &id))
                .map_err(|e| e.to_string())?;
        }
        (None, Some(c), None) => {
            conn.execute(&query, (&c, &id)).map_err(|e| e.to_string())?;
        }
        (None, None, Some(tags_val)) => {
            conn.execute(&query, (&tags_val, &id))
                .map_err(|e| e.to_string())?;
        }
        (None, None, None) => {
            return Ok(());
        }
    }

    Ok(())
}

#[tauri::command]
fn delete_resource(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    // First, delete all links that reference this resource (as source or target)
    conn.execute(
        "DELETE FROM resource_links WHERE source_id = ?1 OR target_id = ?1",
        [&id],
    )
    .map_err(|e| e.to_string())?;
    // Then delete the resource itself
    conn.execute("DELETE FROM resources WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_lecture(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM lectures WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
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
    db::create_planner_event(
        &state,
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
    db::get_planner_events(&state, from, to)
}

#[tauri::command]
fn delete_planner_event(state: State<DbState>, id: i64) -> Result<(), String> {
    db::delete_planner_event(&state, id)
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
    tokenizer_path: Option<String>,
) -> Result<String, String> {
    inference::load_model(&model_state, &model_path, tokenizer_path.as_deref())
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
) -> Result<String, String> {
    // Default + clamp to keep CPU sane
    let max = max_tokens.unwrap_or(512).min(16); // you can bump to 32 later
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
fn get_courses(state: State<DbState>) -> Result<Vec<Repository>, String> {
    get_repositories(state)
}

#[tauri::command]
fn create_course(
    state: State<DbState>,
    name: String,
    code: Option<String>,
    semester: Option<String>,
    description: Option<String>,
) -> Result<i64, String> {
    create_repository(state, name, code, semester, description)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let conn = db::init_db(app.handle()).expect("failed to init db");
            app.manage(DbState {
                conn: Mutex::new(conn),
            });
            // Initialize model state for direct inference
            app.manage(inference::create_model_state());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            create_resource,
            get_resources,
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
            debug_db_schema
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn debug_db_schema(state: State<DbState>, table_name: String) -> Result<String, String> {
    let conn = state.conn.lock().unwrap();
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
