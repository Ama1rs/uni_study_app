use serde::{Deserialize, Serialize};
use ts_rs::TS;
use tauri::State;
use rusqlite::OptionalExtension;
use crate::DbState;

#[derive(Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct DeviceIdentity {
    pub device_id: String,
    pub device_name: Option<String>,
    pub platform: String,
    pub created_at: Option<String>,
    pub last_seen_at: Option<String>,
    pub is_active: bool,
}

#[derive(Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct SyncState {
    pub is_sync_enabled: bool,
    pub supabase_user_id: Option<String>,
    pub last_synced_at: Option<String>,
    pub sync_protocol_version: i32,
    pub is_premium_active: bool,
    pub device_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct DeviceRegistration {
    pub device_id: String,
    pub device_name: String,
    pub platform: String,
    pub user_id: String,
}

#[tauri::command]
pub fn get_device_id(state: State<DbState>, platform: String) -> Result<DeviceIdentity, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    let identity = conn
        .query_row(
            "SELECT device_id, device_name, platform, created_at FROM device_identity LIMIT 1",
            [],
            |row| {
                Ok(DeviceIdentity {
                    device_id: row.get(0)?,
                    device_name: row.get(1)?,
                    platform: row.get(2)?,
                    created_at: row.get(3)?,
                    last_seen_at: None,
                    is_active: true,
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;

    if let Some(id) = identity {
        Ok(id)
    } else {
        // Generate new identity
        let new_id = uuid::Uuid::new_v4().to_string();
        let name = format!("New Device ({})", platform);
        conn.execute(
            "INSERT INTO device_identity (device_id, device_name, platform) VALUES (?1, ?2, ?3)",
            (&new_id, &name, &platform),
        )
        .map_err(|e| e.to_string())?;

        Ok(DeviceIdentity {
            device_id: new_id,
            device_name: Some(name),
            platform,
            created_at: None,
            last_seen_at: None,
            is_active: true,
        })
    }
}

#[tauri::command]
pub fn get_sync_state(state: State<DbState>) -> Result<SyncState, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    conn.query_row(
        "SELECT is_sync_enabled, supabase_user_id, last_synced_at, sync_protocol_version, is_premium_active FROM sync_state WHERE id = 1",
        [],
        |row| {
            Ok(SyncState {
                is_sync_enabled: row.get(0)?,
                supabase_user_id: row.get(1)?,
                last_synced_at: row.get(2)?,
                sync_protocol_version: row.get(3)?,
                is_premium_active: row.get(4)?,
                device_id: None,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_sync_state(state: State<DbState>, sync_state: SyncState) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    conn.execute(
        "UPDATE sync_state SET 
            is_sync_enabled = ?1, 
            supabase_user_id = ?2, 
            last_synced_at = ?3, 
            sync_protocol_version = ?4, 
            is_premium_active = ?5 
         WHERE id = 1",
        (
            sync_state.is_sync_enabled,
            sync_state.supabase_user_id,
            sync_state.last_synced_at,
            sync_state.sync_protocol_version,
            sync_state.is_premium_active,
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn update_device_last_seen(state: State<DbState>, device_id: String) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    conn.execute(
        "UPDATE device_identity SET last_seen_at = CURRENT_TIMESTAMP WHERE device_id = ?1",
        [&device_id],
    )
    .map_err(|e: rusqlite::Error| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn revoke_device(state: State<DbState>, device_id: String) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    conn.execute(
        "UPDATE device_identity SET is_active = 0 WHERE device_id = ?1",
        [&device_id],
    )
    .map_err(|e: rusqlite::Error| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn check_first_time_sync_guard(state: State<DbState>) -> Result<bool, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // Check if this is a first-time sync scenario
    let sync_state = conn
        .query_row(
            "SELECT last_synced_at FROM sync_state WHERE id = 1",
            [],
            |row| row.get::<_, Option<String>>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    // First time sync if no last_synced_at OR it's a zero timestamp (migration guard marker)
    match sync_state.flatten() {
        Some(timestamp) => {
            // Check for migration guard marker (epoch timestamp)
            let is_migration_marker = timestamp == "1970-01-01T00:00:00Z" || 
                                   timestamp == "1970-01-01 00:00:00" ||
                                   timestamp == "0";
            Ok(is_migration_marker)
        },
        None => Ok(true) // No sync state means first time
    }
}

#[tauri::command]
pub fn clear_first_time_sync_guard(state: State<DbState>) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    conn.execute(
        "UPDATE sync_state SET last_synced_at = NULL WHERE id = 1",
        [],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn is_database_encrypted(state: State<DbState>) -> Result<bool, String> {
    let conn_arc = state.db_manager.get_global_conn();
    let conn = conn_arc.lock().unwrap();

    // Check if encryption metadata table exists and database is marked as encrypted
    let table_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='encryption_metadata')",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !table_exists {
        return Ok(false);
    }

    let is_encrypted: bool = conn
        .query_row(
            "SELECT is_encrypted FROM encryption_metadata WHERE id = 1",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    Ok(is_encrypted)
}

#[tauri::command]
pub fn get_encryption_status(state: State<DbState>) -> Result<EncryptionStatus, String> {
    let conn_arc = state.db_manager.get_global_conn();
    let conn = conn_arc.lock().unwrap();

    let table_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='encryption_metadata')",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !table_exists {
        return Ok(EncryptionStatus {
            is_encrypted: false,
            encryption_version: None,
            migration_applied_at: None,
        });
    }

    let status = conn
        .query_row(
            "SELECT is_encrypted, encryption_version, migration_applied_at FROM encryption_metadata WHERE id = 1",
            [],
            |row| {
                Ok(EncryptionStatus {
                    is_encrypted: row.get(0)?,
                    encryption_version: row.get(1)?,
                    migration_applied_at: row.get(2)?,
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(status.unwrap_or_else(|| EncryptionStatus {
        is_encrypted: false,
        encryption_version: None,
        migration_applied_at: None,
    }))
}

#[derive(Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct EncryptionStatus {
    pub is_encrypted: bool,
    pub encryption_version: Option<String>,
    pub migration_applied_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct MigrationProgress {
    pub phase: String,
    pub completed_steps: Vec<String>,
    pub total_steps: u32,
    pub bytes_uploaded: u64,
    pub conflicts_detected: u32,
    pub estimated_time_remaining: Option<u32>,
    pub progress_percentage: u32,
}

#[derive(Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct MigrationEligibility {
    pub is_eligible: bool,
    pub reasons: Vec<String>,
    pub data_size_estimate: u64,
    pub requires_premium: bool,
}

#[derive(Serialize, Deserialize, Clone, TS)]
#[ts(export)]
pub struct MigrationConflict {
    pub id: String,
    pub table_name: String,
    pub record_id: String,
    pub local_data: String,
    pub cloud_data: String,
    pub conflict_type: String,
    pub resolution: Option<String>,
}

#[tauri::command]
pub fn check_migration_eligibility(state: State<DbState>) -> Result<MigrationEligibility, String> {
    // Check if migration is possible
    let global_conn = state.db_manager.get_global_conn();
    let conn = global_conn.lock().unwrap();

    // Check if there's already a migration in progress
    let active_migration: Option<String> = conn
        .query_row(
            "SELECT migration_id FROM migration_state WHERE phase NOT IN ('completed', 'failed')",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    if active_migration.is_some() {
        return Ok(MigrationEligibility {
            is_eligible: false,
            reasons: vec!["Migration already in progress".to_string()],
            data_size_estimate: 0,
            requires_premium: false,
        });
    }

    // Estimate data size (simple approximation)
    let data_size: u64 = conn
        .query_row(
            "SELECT COUNT(*) FROM repositories",
            [],
            |row| {
                let count: i64 = row.get(0)?;
                Ok(count as u64 * 1024) // Rough estimate: 1KB per repository
            },
        )
        .unwrap_or(0);
        
    Ok(MigrationEligibility {
        is_eligible: true,
        reasons: vec![],
        data_size_estimate: data_size,
        requires_premium: false,
    })
}

#[tauri::command]
pub fn initiate_local_to_cloud_migration(
    state: State<DbState>,
    migration_id: String,
) -> Result<MigrationProgress, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // Create migration state record
    conn.execute(
        "INSERT OR REPLACE INTO migration_state 
         (id, migration_id, phase, from_mode, to_mode, started_at) 
         VALUES (1, ?1, 'preparing', 'local', 'cloud', CURRENT_TIMESTAMP)",
        [&migration_id],
    )
    .map_err(|e| e.to_string())?;

    // Log migration start
    conn.execute(
        "INSERT INTO migration_log (migration_id, level, message) VALUES (?1, 'info', ?2)",
        [&migration_id, "Migration started: local to cloud"],
    )
    .map_err(|e| e.to_string())?;

    Ok(MigrationProgress {
        phase: "preparing".to_string(),
        completed_steps: vec![],
        total_steps: 4,
        bytes_uploaded: 0,
        conflicts_detected: 0,
        estimated_time_remaining: Some(300), // 5 minutes
        progress_percentage: 0,
    })
}

#[tauri::command]
pub fn get_migration_progress(state: State<DbState>) -> Result<Option<MigrationProgress>, String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    let migration: Option<MigrationProgress> = conn
        .query_row(
            "SELECT phase, progress_percentage FROM migration_state WHERE phase NOT IN ('completed', 'failed')",
            [],
            |row| {
                let phase: String = row.get(0)?;
                let progress: i32 = row.get(1).unwrap_or(0);
                Ok(MigrationProgress {
                    phase,
                    completed_steps: vec!["preparing".to_string()], // Simplified for now
                    total_steps: 4,
                    bytes_uploaded: 0,
                    conflicts_detected: 0,
                    estimated_time_remaining: Some(300 - (progress as u32 * 3)),
                    progress_percentage: progress as u32,
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(migration)
}

#[tauri::command]
pub fn complete_migration(state: State<DbState>) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // Mark migration as completed
    conn.execute(
        "UPDATE migration_state SET phase = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = 1",
        [],
    )
    .map_err(|e| e.to_string())?;

    // Log completion
    conn.execute(
        "INSERT INTO migration_log (migration_id, level, message) VALUES (
            (SELECT migration_id FROM migration_state WHERE id = 1), 
            'info', 
            'Migration completed successfully'
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn rollback_migration(state: State<DbState>) -> Result<(), String> {
    let conn_arc = state.db_manager.get_active_profile_db()?;
    let conn = conn_arc.lock().unwrap();

    // Mark migration as failed
    conn.execute(
        "UPDATE migration_state SET phase = 'failed', error_message = 'User requested rollback' WHERE id = 1",
        [],
    )
    .map_err(|e| e.to_string())?;

    // Log rollback
    conn.execute(
        "INSERT INTO migration_log (migration_id, level, message) VALUES (
            (SELECT migration_id FROM migration_state WHERE id = 1), 
            'warning', 
            'Migration rolled back by user'
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}