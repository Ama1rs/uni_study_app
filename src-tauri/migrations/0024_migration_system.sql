-- Migration tracking and state management

CREATE TABLE IF NOT EXISTS migration_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    migration_id TEXT UNIQUE NOT NULL,
    phase TEXT NOT NULL, -- 'preparing', 'uploading', 'conflicts', 'finalizing', 'completed', 'failed'
    from_mode TEXT NOT NULL, -- 'local' or 'cloud'
    to_mode TEXT NOT NULL, -- 'local' or 'cloud'
    started_at DATETIME,
    completed_at DATETIME,
    backup_path TEXT,
    conflicts_resolved INTEGER DEFAULT 0,
    error_message TEXT,
    progress_percentage INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS migration_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    level TEXT NOT NULL, -- 'info', 'warning', 'error'
    message TEXT NOT NULL,
    details TEXT -- JSON for structured data
);

CREATE TABLE IF NOT EXISTS migration_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    local_data TEXT, -- JSON
    cloud_data TEXT, -- JSON
    conflict_type TEXT NOT NULL, -- 'update', 'delete', 'create', 'schema'
    resolution TEXT, -- 'keep_local', 'keep_cloud', 'merge', 'manual'
    resolved_at DATETIME
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_migration_log_migration_id ON migration_log(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_conflicts_migration_id ON migration_conflicts(migration_id);
CREATE INDEX IF NOT EXISTS idx_migration_conflicts_resolved ON migration_conflicts(resolved_at);