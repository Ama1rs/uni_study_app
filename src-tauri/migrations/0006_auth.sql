CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INTEGER PRIMARY KEY,
    name TEXT,
    university TEXT,
    avatar_path TEXT,
    bio TEXT,
    preferences TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS session_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_user_id INTEGER,
    last_user_id INTEGER,
    FOREIGN KEY(current_user_id) REFERENCES users(id),
    FOREIGN KEY(last_user_id) REFERENCES users(id)
);
