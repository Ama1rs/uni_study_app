CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_user_id INTEGER,
    last_user_id INTEGER,
    FOREIGN KEY(current_user_id) REFERENCES users(id),
    FOREIGN KEY(last_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_session_state_current_user_id ON session_state(current_user_id);
CREATE INDEX IF NOT EXISTS idx_session_state_last_user_id ON session_state(last_user_id);

CREATE TABLE IF NOT EXISTS profile_registry (
    user_id INTEGER PRIMARY KEY,
    db_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
