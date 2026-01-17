-- Add grouping and progress tracking to lectures
ALTER TABLE lectures ADD COLUMN group_name TEXT;
ALTER TABLE lectures ADD COLUMN is_completed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE lectures ADD COLUMN order_index INTEGER;
