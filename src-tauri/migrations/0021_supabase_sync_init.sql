-- src-tauri/migrations/0021_supabase_sync_init.sql

-- Tracking device identity for multi-device sync
CREATE TABLE IF NOT EXISTS device_identity (
    device_id TEXT PRIMARY KEY, -- Stable UUID generated on first run
    device_name TEXT,           -- User-friendly name (e.g., "My iPhone")
    platform TEXT,              -- "windows", "macos", "linux", "android", "ios"
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Global sync state and cloud connectivity settings
CREATE TABLE IF NOT EXISTS sync_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    is_sync_enabled BOOLEAN DEFAULT 0,
    supabase_user_id TEXT,      -- Cloud user ID once authenticated
    last_synced_at DATETIME,    -- Last successful full sync timestamp
    sync_protocol_version TEXT DEFAULT '1.0',
    local_encryption_key TEXT,  -- Encrypted version of the local key (for backup purposes if implemented)
    is_premium_active BOOLEAN DEFAULT 0
);

-- Seed sync_state if it doesn't exist
INSERT OR IGNORE INTO sync_state (id, is_sync_enabled) VALUES (1, 0);
