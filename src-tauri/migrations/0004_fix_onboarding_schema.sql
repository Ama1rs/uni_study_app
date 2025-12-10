DROP TABLE IF EXISTS onboarding_state;

CREATE TABLE onboarding_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    completed INTEGER NOT NULL DEFAULT 0,
    ai_provider TEXT,
    ai_api_key TEXT,
    ai_endpoint TEXT,
    db_type TEXT,
    db_url TEXT,
    user_name TEXT,
    university TEXT
);
