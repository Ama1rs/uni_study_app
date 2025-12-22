-- Migration: Add study sessions and D-Days
CREATE TABLE IF NOT EXISTS study_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id INTEGER, -- Optional, links to a specific course
    start_at DATETIME NOT NULL,
    end_at DATETIME,
    duration INTEGER, -- in seconds
    is_break BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS d_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    target_date DATE NOT NULL,
    color TEXT, -- Hex color for UI
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
