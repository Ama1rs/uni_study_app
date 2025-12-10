CREATE TABLE IF NOT EXISTS planner_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    recurrence TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);
