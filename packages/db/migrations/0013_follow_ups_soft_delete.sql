-- Add deleted_at column to follow_ups for soft delete
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;