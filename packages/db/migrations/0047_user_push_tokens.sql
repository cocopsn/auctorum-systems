-- Migration 0047: Expo push notification tokens per user
-- Used by the mobile app (apps/mobile) to deliver push notifications via
-- Expo's push service. Stored on the user (one device per user for MVP).

ALTER TABLE users ADD COLUMN IF NOT EXISTS expo_push_token       VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_platform         VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(expo_push_token) WHERE expo_push_token IS NOT NULL;
