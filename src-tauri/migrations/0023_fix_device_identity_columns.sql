-- Add missing columns to device_identity table for sync functionality

ALTER TABLE device_identity ADD COLUMN last_seen_at DATETIME;
ALTER TABLE device_identity ADD COLUMN is_active BOOLEAN DEFAULT 1;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_device_identity_active ON device_identity(is_active);
CREATE INDEX IF NOT EXISTS idx_device_identity_last_seen ON device_identity(last_seen_at);

-- Add missing device_id column to sync_state table
ALTER TABLE sync_state ADD COLUMN device_id TEXT;