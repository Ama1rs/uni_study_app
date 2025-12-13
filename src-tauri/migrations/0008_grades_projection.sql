-- Create semesters table
CREATE TABLE IF NOT EXISTS semesters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,         -- e.g. "Fall 2024", "Semester 1"
    start_date DATETIME,
    end_date DATETIME,
    planned_credits REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add columns to repositories (Courses)
-- We use ALTER TABLE to add columns one by one as SQLite has limited ALTER TABLE support
ALTER TABLE repositories ADD COLUMN credits REAL DEFAULT 3.0;
ALTER TABLE repositories ADD COLUMN semester_id INTEGER REFERENCES semesters(id);
ALTER TABLE repositories ADD COLUMN manual_grade REAL; -- Final grade point (e.g. 4.0, 9.5) override or distinct from calculated
ALTER TABLE repositories ADD COLUMN status TEXT DEFAULT 'in_progress'; -- 'completed', 'in_progress', 'planned'

-- Add target_cgpa and horizon to user_profiles
ALTER TABLE user_profiles ADD COLUMN target_cgpa REAL;
ALTER TABLE user_profiles ADD COLUMN horizon INTEGER;
