-- Browser Web Push subscriptions (PWA / desktop notifications).
-- One row per device/browser combination; endpoint URL is the natural key.

CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  endpoint     TEXT NOT NULL UNIQUE,
  p256dh       TEXT NOT NULL,
  auth_key     TEXT NOT NULL,
  user_agent   VARCHAR(512),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS web_push_subs_tenant_idx ON web_push_subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS web_push_subs_user_idx   ON web_push_subscriptions (user_id);

-- RLS — only the row's tenant can read/write its subscriptions
ALTER TABLE web_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS web_push_tenant_isolation ON web_push_subscriptions;
CREATE POLICY web_push_tenant_isolation ON web_push_subscriptions
  USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
