ALTER TABLE onboarding_state ADD COLUMN n_gpu_layers INTEGER DEFAULT 0;
ALTER TABLE onboarding_state ADD COLUMN n_ctx INTEGER DEFAULT 2048;
ALTER TABLE onboarding_state ADD COLUMN n_threads INTEGER DEFAULT 4;
ALTER TABLE onboarding_state ADD COLUMN system_prompt TEXT DEFAULT 'You are a helpful AI assistant.';
ALTER TABLE onboarding_state ADD COLUMN temperature REAL DEFAULT 0.7;
ALTER TABLE onboarding_state ADD COLUMN top_p REAL DEFAULT 0.95;
ALTER TABLE onboarding_state ADD COLUMN max_tokens INTEGER DEFAULT 1024;
