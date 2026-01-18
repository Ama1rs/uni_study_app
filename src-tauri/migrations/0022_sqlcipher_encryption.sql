-- SQLCipher Database Encryption Migration
-- Implements local database encryption for enhanced security

-- Note: This migration assumes the application has been rebuilt with SQLCipher support
-- The actual encryption key will be managed by the Rust backend

-- Add encryption metadata table
CREATE TABLE IF NOT EXISTS encryption_metadata (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    is_encrypted BOOLEAN DEFAULT 0,
    encryption_version TEXT DEFAULT '1.0',
    key_derivation_info TEXT, -- Encrypted info about how the key was derived
    migration_applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed encryption metadata
INSERT OR IGNORE INTO encryption_metadata (id, is_encrypted) VALUES (1, 0);

-- Add encrypted storage path for sensitive resources
ALTER TABLE resources ADD COLUMN encrypted_storage_path TEXT;

-- Add flag to mark sensitive data that should be encrypted
ALTER TABLE resources ADD COLUMN is_sensitive BOOLEAN DEFAULT 0;

-- Add indexes for encrypted operations
CREATE INDEX IF NOT EXISTS idx_resources_encrypted_path ON resources(encrypted_storage_path);
CREATE INDEX IF NOT EXISTS idx_resources_sensitive ON resources(is_sensitive);

-- Store the fact that we've prepared for encryption
-- The actual encryption will be handled by the Rust backend using PRAGMA key commands