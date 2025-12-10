use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

pub struct DbState {
    pub conn: Mutex<Connection>,
}

pub fn init_db(app_handle: &AppHandle) -> Result<Connection> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).expect("failed to create app data dir");
    }
    let db_path = app_dir.join("study_app.db");
    let conn = Connection::open(db_path)?;

    // Migration logic
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    let migrations: &[(&str, &str)] = &[
        ("0001_init", include_str!("../migrations/0001_init.sql")),
        (
            "0002_add_planner_events",
            include_str!("../migrations/0002_add_planner_events.sql"),
        ),
        (
            "0003_add_metrics_and_onboarding",
            include_str!("../migrations/0003_add_metrics_and_onboarding.sql"),
        ),
        (
            "0004_fix_onboarding_schema",
            include_str!("../migrations/0004_fix_onboarding_schema.sql"),
        ),
        (
            "0005_fix_missing_repository_columns",
            include_str!("../migrations/0005_fix_missing_repository_columns.sql"),
        ),
        (
            "0006_auth",
            include_str!("../migrations/0006_auth.sql"),
        ),
    ];

    for (version, sql) in migrations {
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE version = ?1",
            [version],
            |row| row.get(0),
        )?;

        if count == 0 {
            println!("Applying migration: {}", version);
            match conn.execute_batch(sql) {
                Ok(_) => println!("Migration {} batch executed successfully.", version),
                Err(e) => {
                    println!("Error executing batch for {}: {}", version, e);
                    return Err(e);
                }
            }

            println!("Updating schema_migrations for {}", version);
            conn.execute(
                "INSERT INTO schema_migrations (version) VALUES (?1)",
                [version],
            )?;
            println!("Migration {} applied successfully.", version);
        } else {
            println!("Skipping migration {} (already applied)", version);
        }
    }

    println!("Database initialization completed successfully.");
    Ok(conn)
}

// ---------- Link CRUD ----------
#[derive(Debug, Serialize, Deserialize)]
pub struct Link {
    pub id: i64,
    pub source_id: i64,
    pub target_id: i64,
}

pub fn create_link(state: &State<DbState>, source_id: i64, target_id: i64) -> Result<i64, String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO resource_links (source_id, target_id) VALUES (?1, ?2)",
        (&source_id, &target_id),
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub fn get_links(state: &State<DbState>) -> Result<Vec<Link>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, source_id, target_id FROM resource_links")
        .map_err(|e| e.to_string())?;
    let links_iter = stmt
        .query_map([], |row| {
            Ok(Link {
                id: row.get(0)?,
                source_id: row.get(1)?,
                target_id: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for l in links_iter {
        result.push(l.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

// ---------- Planner CRUD ----------
#[derive(Debug, Serialize, Deserialize)]
pub struct PlannerEvent {
    pub id: i64,
    pub repository_id: Option<i64>,
    pub title: String,
    pub description: Option<String>,
    pub start_at: String,
    pub end_at: String,
    pub recurrence: Option<String>,
}

pub fn create_planner_event(
    state: &State<DbState>,
    repository_id: Option<i64>,
    title: String,
    description: Option<String>,
    start_at: String,
    end_at: String,
    recurrence: Option<String>,
) -> Result<i64, String> {
    let conn = state.conn.lock().unwrap();
    conn.execute(
        "INSERT INTO planner_events (repository_id, title, description, start_at, end_at, recurrence) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        (&repository_id, &title, &description, &start_at, &end_at, &recurrence),
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

pub fn get_planner_events(
    state: &State<DbState>,
    from: Option<String>,
    to: Option<String>,
) -> Result<Vec<PlannerEvent>, String> {
    let conn = state.conn.lock().unwrap();

    let mut query = "SELECT id, repository_id, title, description, start_at, end_at, recurrence FROM planner_events".to_string();
    let mut params: Vec<&dyn rusqlite::ToSql> = Vec::new();

    // Simple filtering if provided (assumes ISO8601 string comparison works for SQLite DATETIME)
    if let (Some(f), Some(t)) = (&from, &to) {
        query.push_str(" WHERE start_at >= ?1 AND start_at <= ?2");
        params.push(f);
        params.push(t);
    }

    query.push_str(" ORDER BY start_at ASC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let events_iter = stmt
        .query_map(rusqlite::params_from_iter(params), |row| {
            Ok(PlannerEvent {
                id: row.get(0)?,
                repository_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                start_at: row.get(4)?,
                end_at: row.get(5)?,
                recurrence: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for e in events_iter {
        result.push(e.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

pub fn delete_planner_event(state: &State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM planner_events WHERE id = ?1", [&id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
