-- Clean fix for onboarding migration conflicts
-- This safely recreates the onboarding_state table with the correct schema

-- First, create the new table with all desired columns
CREATE TABLE onboarding_state_new (
    id INTEGER PRIMARY KEY,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    ai_provider TEXT,
    ai_api_key TEXT,
    ai_endpoint TEXT,
    db_type TEXT,
    db_url TEXT,
    user_name TEXT,
    university TEXT,
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

-- Copy existing data, providing defaults for new columns
INSERT INTO onboarding_state_new (
    id, completed, ai_provider, ai_api_key, ai_endpoint, db_type, db_url, 
    user_name, university, n_gpu_layers, n_ctx, n_threads, system_prompt,
    temperature, top_p, max_tokens
)
SELECT 
    id, completed, ai_provider, ai_api_key, ai_endpoint, db_type, db_url, 
    user_name, university, n_gpu_layers, n_ctx, n_threads, system_prompt,
    temperature, top_p, max_tokens
FROM onboarding_state;

-- Drop the old table and rename the new one
DROP TABLE onboarding_state;
ALTER TABLE onboarding_state_new RENAME TO onboarding_state;