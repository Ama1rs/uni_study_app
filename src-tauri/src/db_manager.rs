use rusqlite::{Connection, OptionalExtension, Result};
use std::collections::HashMap;
use std::fs;

use std::sync::{Arc, Mutex, RwLock};
use tauri::AppHandle;
use tauri::Manager;

use crate::db;

pub struct DatabaseManager {
    pub global_conn: Arc<Mutex<Connection>>,
    // Cache of open profile connections: user_id -> Connection
    profile_connections: Arc<RwLock<HashMap<i64, Arc<Mutex<Connection>>>>>,
    app_handle: AppHandle,
}

impl DatabaseManager {
    pub fn new(app_handle: AppHandle) -> Result<Self, String> {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .expect("failed to get app data dir");

        if !app_dir.exists() {
            fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
        }

        // Initialize Global Database (Auth, Sessions, Registry)
        let global_db_path = app_dir.join("study_app.db");
        let global_conn = Connection::open(global_db_path).map_err(|e| e.to_string())?;

        // Run global migrations
        db::run_global_migrations(&global_conn).map_err(|e| e.to_string())?;

        let manager = Self {
            global_conn: Arc::new(Mutex::new(global_conn)),
            profile_connections: Arc::new(RwLock::new(HashMap::new())),
            app_handle,
        };

        // Try to migrate legacy data if first run of split DB
        manager.migrate_legacy_data().map_err(|e| {
            println!("Migration Warning: {}", e);
            e
        })?;

        Ok(manager)
    }

    pub fn get_global_conn(&self) -> Arc<Mutex<Connection>> {
        self.global_conn.clone()
    }

    pub fn get_profile_db(&self, user_id: i64) -> Result<Arc<Mutex<Connection>>, String> {
        // Check if connection is already open
        {
            let cache = self.profile_connections.read().unwrap();
            if let Some(conn) = cache.get(&user_id) {
                return Ok(conn.clone());
            }
        }

        // If not, open it
        let app_dir = self
            .app_handle
            .path()
            .app_data_dir()
            .expect("failed to get app data dir");

        // Naming scheme: profile_{user_id}.db
        let db_name = format!("profile_{}.db", user_id);
        let db_path = app_dir.join(db_name);

        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

        // Run profile migrations
        db::run_profile_migrations(&conn).map_err(|e| e.to_string())?;

        let conn_arc = Arc::new(Mutex::new(conn));

        // Cache it
        {
            let mut cache = self.profile_connections.write().unwrap();
            cache.insert(user_id, conn_arc.clone());
        }

        Ok(conn_arc)
    }

    /// Close a profile database connection (e.g. on logout) to release resources
    pub fn close_profile_db(&self, user_id: i64) {
        let mut cache = self.profile_connections.write().unwrap();
        cache.remove(&user_id);
    }

    pub fn get_active_profile_db(&self) -> Result<Arc<Mutex<Connection>>, String> {
        let global_lock = self.global_conn.lock().unwrap();
        // Check if there is a current_user_id in session_state
        // user_id might be NULL in DB, so use Option<i64>
        let user_id: Option<i64> = global_lock
            .query_row(
                "SELECT current_user_id FROM session_state WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .unwrap_or(None); // If query fails (table missing?), return None

        drop(global_lock);

        match user_id {
            Some(uid) => self.get_profile_db(uid),
            None => Err("No active user session found".to_string()),
        }
    }

    /// Delete a user profile and its associated database
    pub fn delete_profile(&self, user_id: i64) -> Result<(), String> {
        // 1. Close connection if open
        self.close_profile_db(user_id);

        // 2. Delete database file
        let app_dir = self
            .app_handle
            .path()
            .app_data_dir()
            .expect("failed to get app data dir");
        let db_name = format!("profile_{}.db", user_id);
        let db_path = app_dir.join(db_name);

        if db_path.exists() {
            fs::remove_file(db_path).map_err(|e| e.to_string())?;
        }

        // 3. Remove from users table (Global)
        let global_conn = self.global_conn.lock().unwrap();
        global_conn
            .execute("DELETE FROM users WHERE id = ?1", [user_id])
            .map_err(|e| e.to_string())?;
        global_conn
            .execute("DELETE FROM profile_registry WHERE user_id = ?1", [user_id])
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Migrates data from the monolithic study_app.db to profile-specific databases
    fn migrate_legacy_data(&self) -> Result<(), String> {
        let global_conn = self.global_conn.lock().unwrap();

        // Check if repositories table still exists in global DB (Legacy indicator)
        let table_exists: bool = global_conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='repositories')",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if !table_exists {
            return Ok(()); // Already migrated or fresh install
        }

        println!("Legacy data detected in global DB. Starting migration...");

        // 1. Create backup
        let app_dir = self
            .app_handle
            .path()
            .app_data_dir()
            .expect("failed to get app data dir");
        let legacy_db_path = app_dir.join("study_app.db");
        let backup_path = app_dir.join("study_app.db.bak");

        // Use a temporary connection to backup since global_conn is open
        // SQLite supports online backup but for simplicity we'll just copy the file if we can
        // since we are in early initialization.
        // Actually, copying might fail if file is locked. Let's try to copy it.
        if let Err(e) = fs::copy(&legacy_db_path, &backup_path) {
            println!("Migration Backup Warning: Could not create backup: {}", e);
        }

        // 2. Find target user for migration (pick the first one found, or skip if no users)
        let first_user_id: Option<i64> = global_conn
            .query_row("SELECT id FROM users ORDER BY id ASC LIMIT 1", [], |row| {
                row.get(0)
            })
            .optional()
            .map_err(|e| e.to_string())?
            .flatten();

        let target_user_id = match first_user_id {
            Some(id) => id,
            None => {
                println!("No users found for migration. Skipping until user registration.");
                return Ok(());
            }
        };

        println!("Migrating legacy data to user ID: {}", target_user_id);

        // 3. Open profile DB
        drop(global_conn); // Release global lock to avoid deadlocks if get_profile_db needs it
        let profile_conn_arc = self.get_profile_db(target_user_id)?;

        let global_conn = self.global_conn.lock().unwrap();

        // 4. Copy tables
        let tables_to_migrate = [
            "repositories",
            "resources",
            "resource_links",
            "grades",
            "lectures",
            "onboarding_state",
            "app_settings",
            "flashcards",
            "tasks",
            "planner_events",
            "semester_settings", // Added common ones
            "academic_programs",
            "semesters",
            "resource_metadata",
            "resource_links_v2",
            "link_types",
        ];

        // We use ATTACH DATABASE to copy data directly in SQL
        let profile_db_path = app_dir.join(format!("profile_{}.db", target_user_id));
        let profile_path_str = profile_db_path.to_string_lossy();

        global_conn
            .execute(
                &format!("ATTACH DATABASE '{}' AS profile_db", profile_path_str),
                [],
            )
            .map_err(|e| e.to_string())?;

        for table in tables_to_migrate {
            // Check if table has data in main
            let count: i64 = global_conn
                .query_row(
                    &format!("SELECT COUNT(*) FROM main.{} WHERE 1=1", table),
                    [],
                    |row| row.get(0),
                )
                .unwrap_or(0);

            if count > 0 {
                println!("Migrating table {} ({} rows)...", table, count);

                // Get columns of both tables to find intersection and handle mapping
                let mut target_cols = Vec::new();
                let mut stmt = global_conn
                    .prepare(&format!("PRAGMA profile_db.table_info({})", table))
                    .map_err(|e| e.to_string())?;
                let cols_iter = stmt
                    .query_map([], |row| row.get::<_, String>(1))
                    .map_err(|e| e.to_string())?;
                for col in cols_iter {
                    target_cols.push(col.map_err(|e| e.to_string())?);
                }

                let mut source_cols = Vec::new();
                let mut stmt = global_conn
                    .prepare(&format!("PRAGMA main.table_info({})", table))
                    .map_err(|e| e.to_string())?;
                let cols_iter = stmt
                    .query_map([], |row| row.get::<_, String>(1))
                    .map_err(|e| e.to_string())?;
                for col in cols_iter {
                    source_cols.push(col.map_err(|e| e.to_string())?);
                }

                // Intersection of columns
                let common_cols: Vec<String> = source_cols
                    .iter()
                    .filter(|c| target_cols.contains(c))
                    .cloned()
                    .collect();

                if common_cols.is_empty() {
                    println!(
                        "Warning: No common columns found for table {}. Skipping.",
                        table
                    );
                    continue;
                }

                let mut insert_cols = common_cols.clone();
                let mut select_cols = common_cols.clone();

                // Special handling for legacy mappings
                // 1. repository_id vs course_id
                if (table == "resources" || table == "lectures")
                    && target_cols.contains(&"repository_id".to_string())
                    && !source_cols.contains(&"repository_id".to_string())
                    && source_cols.contains(&"course_id".to_string())
                {
                    insert_cols.push("repository_id".to_string());
                    select_cols.push("course_id".to_string());
                }

                let insert_str = insert_cols.join(", ");
                let select_str = select_cols.join(", ");

                global_conn
                    .execute(
                        &format!(
                            "INSERT OR IGNORE INTO profile_db.{} ({}) SELECT {} FROM main.{}",
                            table, insert_str, select_str, table
                        ),
                        [],
                    )
                    .map_err(|e| format!("Failed to migrate table {}: {}", table, e))?;
            }
        }

        global_conn
            .execute("DETACH DATABASE profile_db", [])
            .map_err(|e| e.to_string())?;

        // 4b. Special case for user_profiles (migrate from Main DB to Profile DB)
        // Check if user_profiles exists in main and has data
        let has_profiles: bool = global_conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND (name='user_profiles' OR name='user_profile'))",
            [],
            |row| row.get(0)
        ).unwrap_or(false);

        if has_profiles {
            let profile_conn = profile_conn_arc.lock().unwrap();
            // Try to migrate from user_profiles first, then user_profile
            let profile_data: Option<(Option<String>, Option<String>, Option<String>)> = global_conn
                .query_row(
                    "SELECT name, university, avatar_path FROM user_profiles WHERE user_id = ?1 OR id = ?1 LIMIT 1",
                    [target_user_id],
                    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
                )
                .optional()
                .unwrap_or(None);

            let data = if profile_data.is_some() {
                profile_data
            } else {
                global_conn
                    .query_row(
                        "SELECT name, university, avatar_path FROM user_profile LIMIT 1",
                        [],
                        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
                    )
                    .optional()
                    .unwrap_or(None)
            };

            if let Some((name, university, avatar)) = data {
                profile_conn
                    .execute(
                        "UPDATE user_profiles SET name = ?1, university = ?2, avatar_path = ?3 WHERE user_id = ?4",
                        (name, university, avatar, target_user_id),
                    )
                    .map_err(|e| e.to_string())?;
            }
        }

        // 5. Cleanup Global DB
        println!("Cleaning up global database...");
        global_conn
            .execute("PRAGMA foreign_keys = OFF", [])
            .map_err(|e| e.to_string())?;

        for table in tables_to_migrate {
            global_conn
                .execute(&format!("DROP TABLE IF EXISTS {}", table), [])
                .map_err(|e| e.to_string())?;
        }

        // Also drop legacy user_profile/user_profiles table (moved to profile_auth)
        global_conn
            .execute("DROP TABLE IF EXISTS user_profile", [])
            .map_err(|e| e.to_string())?;
        global_conn
            .execute("DROP TABLE IF EXISTS user_profiles", [])
            .map_err(|e| e.to_string())?;

        global_conn
            .execute("PRAGMA foreign_keys = ON", [])
            .map_err(|e| e.to_string())?;

        println!("Migration completed successfully.");
        Ok(())
    }
}

pub struct DbState {
    pub db_manager: DatabaseManager,
}
