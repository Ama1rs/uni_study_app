use crate::DbState;
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize, Deserialize, Clone)]
pub struct BookProgress {
    pub id: i64,
    pub resource_id: i64,
    pub user_id: i64,
    pub current_location: String,
    pub progress_percentage: f64,
    pub last_read_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BookBookmark {
    pub id: i64,
    pub resource_id: i64,
    pub user_id: i64,
    pub location: String,
    pub chapter_title: Option<String>,
    pub note: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct BookHighlight {
    pub id: i64,
    pub resource_id: i64,
    pub user_id: i64,
    pub cfi_range: String,
    pub highlighted_text: Option<String>,
    pub color: String,
    pub note: Option<String>,
    pub created_at: String,
}

#[tauri::command]
pub fn save_book_progress(
    state: State<DbState>,
    resource_id: i64,
    current_location: String,
    progress_percentage: f64,
) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // Get current user ID from global DB
    let global_conn = state.db_manager.get_global_conn();
    let global_lock = global_conn.lock().unwrap();
    let user_id: i64 = global_lock
        .query_row(
            "SELECT current_user_id FROM session_state WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to get user ID: {}", e))?;
    drop(global_lock);

    conn.execute(
        "INSERT INTO book_progress (resource_id, user_id, current_location, progress_percentage, last_read_at)
         VALUES (?1, ?2, ?3, ?4, datetime('now'))
         ON CONFLICT(resource_id, user_id) DO UPDATE SET
             current_location = excluded.current_location,
             progress_percentage = excluded.progress_percentage,
             last_read_at = excluded.last_read_at",
        (&resource_id, &user_id, &current_location, &progress_percentage),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_book_progress(
    state: State<DbState>,
    resource_id: i64,
) -> Result<Option<BookProgress>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    let global_conn = state.db_manager.get_global_conn();
    let global_lock = global_conn.lock().unwrap();
    let user_id: i64 = global_lock
        .query_row(
            "SELECT current_user_id FROM session_state WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to get user ID: {}", e))?;
    drop(global_lock);

    let result = conn
        .query_row(
            "SELECT id, resource_id, user_id, current_location, progress_percentage, last_read_at
             FROM book_progress
             WHERE resource_id = ?1 AND user_id = ?2",
            [&resource_id, &user_id],
            |row| {
                Ok(BookProgress {
                    id: row.get(0)?,
                    resource_id: row.get(1)?,
                    user_id: row.get(2)?,
                    current_location: row.get(3)?,
                    progress_percentage: row.get(4)?,
                    last_read_at: row.get(5)?,
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
pub fn create_bookmark(
    state: State<DbState>,
    resource_id: i64,
    location: String,
    chapter_title: Option<String>,
    note: Option<String>,
) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    let global_conn = state.db_manager.get_global_conn();
    let global_lock = global_conn.lock().unwrap();
    let user_id: i64 = global_lock
        .query_row(
            "SELECT current_user_id FROM session_state WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to get user ID: {}", e))?;
    drop(global_lock);

    conn.execute(
        "INSERT INTO book_bookmarks (resource_id, user_id, location, chapter_title, note)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        (&resource_id, &user_id, &location, &chapter_title, &note),
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn get_bookmarks(state: State<DbState>, resource_id: i64) -> Result<Vec<BookBookmark>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    let global_conn = state.db_manager.get_global_conn();
    let global_lock = global_conn.lock().unwrap();
    let user_id: i64 = global_lock
        .query_row(
            "SELECT current_user_id FROM session_state WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to get user ID: {}", e))?;
    drop(global_lock);

    let mut stmt = conn
        .prepare(
            "SELECT id, resource_id, user_id, location, chapter_title, note, created_at
             FROM book_bookmarks
             WHERE resource_id = ?1 AND user_id = ?2
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let bookmarks = stmt
        .query_map([&resource_id, &user_id], |row| {
            Ok(BookBookmark {
                id: row.get(0)?,
                resource_id: row.get(1)?,
                user_id: row.get(2)?,
                location: row.get(3)?,
                chapter_title: row.get(4)?,
                note: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for bookmark in bookmarks {
        result.push(bookmark.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

#[tauri::command]
pub fn delete_bookmark(state: State<DbState>, bookmark_id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    conn.execute("DELETE FROM book_bookmarks WHERE id = ?1", [&bookmark_id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn create_highlight(
    state: State<DbState>,
    resource_id: i64,
    cfi_range: String,
    highlighted_text: Option<String>,
    color: String,
    note: Option<String>,
) -> Result<i64, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    let global_conn = state.db_manager.get_global_conn();
    let global_lock = global_conn.lock().unwrap();
    let user_id: i64 = global_lock
        .query_row(
            "SELECT current_user_id FROM session_state WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to get user ID: {}", e))?;
    drop(global_lock);

    conn.execute(
        "INSERT INTO book_highlights (resource_id, user_id, cfi_range, highlighted_text, color, note)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (&resource_id, &user_id, &cfi_range, &highlighted_text, &color, &note),
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn get_highlights(
    state: State<DbState>,
    resource_id: i64,
) -> Result<Vec<BookHighlight>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    let global_conn = state.db_manager.get_global_conn();
    let global_lock = global_conn.lock().unwrap();
    let user_id: i64 = global_lock
        .query_row(
            "SELECT current_user_id FROM session_state WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to get user ID: {}", e))?;
    drop(global_lock);

    let mut stmt = conn
        .prepare(
            "SELECT id, resource_id, user_id, cfi_range, highlighted_text, color, note, created_at
             FROM book_highlights
             WHERE resource_id = ?1 AND user_id = ?2
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let highlights = stmt
        .query_map([&resource_id, &user_id], |row| {
            Ok(BookHighlight {
                id: row.get(0)?,
                resource_id: row.get(1)?,
                user_id: row.get(2)?,
                cfi_range: row.get(3)?,
                highlighted_text: row.get(4)?,
                color: row.get(5)?,
                note: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for highlight in highlights {
        result.push(highlight.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

#[tauri::command]
pub fn delete_highlight(state: State<DbState>, highlight_id: i64) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    conn.execute("DELETE FROM book_highlights WHERE id = ?1", [&highlight_id])
        .map_err(|e| e.to_string())?;

    Ok(())
}
