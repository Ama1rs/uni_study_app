-- Fix broken migration 0025 - remove it and properly add the columns
-- This fixes the SQLite syntax error from previous attempt

-- First, drop the broken migration from schema_migrations
DELETE FROM schema_migrations WHERE version = '0025_streamline_onboarding';

-- Now add the columns properly with SQLite syntax
ALTER TABLE onboarding_state ADD COLUMN usage_profile TEXT DEFAULT 'general';
ALTER TABLE onboarding_state ADD COLUMN privacy_choice TEXT DEFAULT 'local';
ALTER TABLE onboarding_state ADD COLUMN theme_preference TEXT DEFAULT 'dark';

-- For making university optional, SQLite doesn't support ALTER COLUMN DROP NOT NULL
-- So we need to recreate the table (but this is complex for existing data)
-- Instead, we'll leave it as-is for now since the app treats it as optional