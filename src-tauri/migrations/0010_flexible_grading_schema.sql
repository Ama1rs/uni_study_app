-- Create grading_scales table
CREATE TABLE IF NOT EXISTS grading_scales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,         -- e.g. "US 4.0", "India 10-point"
    type TEXT NOT NULL,         -- "numeric", "letter", "percentage"
    config TEXT NOT NULL,       -- JSON string defining mappings/ranges
    is_default BOOLEAN DEFAULT 0
);

-- Create programs table
CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,         -- e.g. "BTech CS"
    total_required_credits REAL DEFAULT 160,
    grading_scale_id INTEGER REFERENCES grading_scales(id),
    duration_months INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add grading config to repositories (Courses)
-- component_config: JSON string e.g. [{"name":"exam","weight":0.7}, {"name":"lab","weight":0.3}]
ALTER TABLE repositories ADD COLUMN component_config TEXT;

-- Allow courses to have a specific grading scale overriding the program default
ALTER TABLE repositories ADD COLUMN grading_scale_id INTEGER REFERENCES grading_scales(id);

-- Store the actual scores for the components
-- component_scores: JSON string e.g. [{"name":"exam","score":85}, {"name":"lab","score":90}]
ALTER TABLE repositories ADD COLUMN component_scores TEXT;

-- Link user to a program
ALTER TABLE user_profiles ADD COLUMN program_id INTEGER REFERENCES programs(id);

-- seed some default scales
INSERT INTO grading_scales (name, type, config, is_default) VALUES 
('Standard 10-point', 'numeric', '{"max_point":10,"mappings":[{"min_percent":90,"point":10},{"min_percent":80,"point":9},{"min_percent":70,"point":8},{"min_percent":60,"point":7},{"min_percent":50,"point":6},{"min_percent":40,"point":5}]}', 1),
('US 4.0 Scale', 'letter', '{"max_point":4.0,"mappings":[{"letter":"A","point":4.0},{"letter":"A-","point":3.7},{"letter":"B+","point":3.3},{"letter":"B","point":3.0},{"letter":"B-","point":2.7},{"letter":"C+","point":2.3},{"letter":"C","point":2.0},{"letter":"F","point":0.0}]}', 0);

-- Insert a default program if none exists (placeholder for onboarding)
INSERT INTO programs (name, total_required_credits, grading_scale_id) 
SELECT 'Default Program', 120, id FROM grading_scales WHERE name = 'Standard 10-point' LIMIT 1;
