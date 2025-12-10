CREATE TABLE IF NOT EXISTS repositories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT,
    semester TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER, -- Legacy name, kept for compatibility, mapped to repository_id logic
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    path TEXT,
    content TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(course_id) REFERENCES repositories(id)
);

CREATE TABLE IF NOT EXISTS resource_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    FOREIGN KEY(source_id) REFERENCES resources(id),
    FOREIGN KEY(target_id) REFERENCES resources(id)
);

CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    score REAL NOT NULL,
    max_score REAL NOT NULL,
    weight REAL,
    FOREIGN KEY(course_id) REFERENCES repositories(id)
);

CREATE TABLE IF NOT EXISTS lectures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail TEXT,
    FOREIGN KEY(course_id) REFERENCES repositories(id)
);

CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    university TEXT,
    avatar_path TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    theme_style TEXT NOT NULL DEFAULT 'default',
    theme_mode TEXT NOT NULL DEFAULT 'dark',
    accent TEXT NOT NULL DEFAULT 'blue',
    sidebar_hidden INTEGER NOT NULL DEFAULT 0
);
