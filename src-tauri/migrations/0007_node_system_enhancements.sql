-- Link Types Table
CREATE TABLE IF NOT EXISTS link_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL, -- Hex code or CSS color name
    stroke_style TEXT NOT NULL DEFAULT 'solid' -- solid, dashed, dotted
);

-- Resource Metadata Table (Extension to resources table)
CREATE TABLE IF NOT EXISTS resource_metadata (
    resource_id INTEGER PRIMARY KEY,
    importance INTEGER DEFAULT 1, -- 1-5
    status TEXT DEFAULT 'unreviewed', -- unreviewed, reviewing, mastered
    difficulty TEXT DEFAULT 'intermediate', -- beginner, intermediate, advanced
    time_estimate INTEGER DEFAULT 0, -- in minutes
    last_reviewed_at DATETIME,
    FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

-- Resource Links V2 (with types and metadata)
CREATE TABLE IF NOT EXISTS resource_links_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    type_id INTEGER,
    strength REAL DEFAULT 1.0, -- 0.0 to 1.0
    bidirectional BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(source_id) REFERENCES resources(id) ON DELETE CASCADE,
    FOREIGN KEY(target_id) REFERENCES resources(id) ON DELETE CASCADE,
    FOREIGN KEY(type_id) REFERENCES link_types(id)
);

-- Seed default link types
INSERT OR IGNORE INTO link_types (name, color, stroke_style) VALUES 
('prerequisite', '#FF0000', 'solid'), -- Red
('related', '#0000FF', 'dashed'),     -- Blue
('references', '#808080', 'dotted'),  -- Grey
('concept', '#00FF00', 'solid'),      -- Green
('example', '#FFA500', 'solid');      -- Orange
