-- Streamline onboarding: make academic fields optional and add usage profile
-- This migration supports the new 3-step onboarding flow

-- SQLite syntax for adding new columns
ALTER TABLE onboarding_state ADD COLUMN usage_profile TEXT DEFAULT 'general';
ALTER TABLE onboarding_state ADD COLUMN privacy_choice TEXT DEFAULT 'local';
ALTER TABLE onboarding_state ADD COLUMN theme_preference TEXT DEFAULT 'dark';

-- For SQLite, we need to recreate the table to make university optional
CREATE TABLE onboarding_state_new (
    id INTEGER PRIMARY KEY,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    ai_provider TEXT,
    ai_api_key TEXT,
    ai_endpoint TEXT,
    db_type TEXT,
    db_url TEXT,
    user_name TEXT,
    university TEXT,  -- Now optional (no NOT NULL constraint)
    n_gpu_layers INTEGER DEFAULT 0,
    n_ctx INTEGER DEFAULT 2048,
    n_threads INTEGER DEFAULT 4,
    system_prompt TEXT DEFAULT 'You are a helpful AI assistant.',
    temperature REAL DEFAULT 0.7,
    top_p REAL DEFAULT 0.95,
    max_tokens INTEGER DEFAULT 1024,
    usage_profile TEXT DEFAULT 'general',
    privacy_choice TEXT DEFAULT 'local',
    theme_preference TEXT DEFAULT 'dark'
);

INSERT INTO onboarding_state_new SELECT 
    id, completed, ai_provider, ai_api_key, ai_endpoint, db_type, db_url, 
    user_name, university, n_gpu_layers, n_ctx, n_threads, system_prompt,
    temperature, top_p, max_tokens, usage_profile, privacy_choice, theme_preference
FROM onboarding_state;

DROP TABLE onboarding_state;
ALTER TABLE onboarding_state_new RENAME TO onboarding_state;