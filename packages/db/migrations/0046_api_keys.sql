-- Migration 0046: Public API keys per tenant
-- Used to authenticate third-party integrations (labs, pharmacies, hospital systems)
-- against the /api/v1/* surface.

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Human-readable label, e.g. "Lab Integration", "Pharmacy System"
  name VARCHAR(100) NOT NULL,
  -- SHA-256 of the full key. Plaintext key is only returned at creation time.
  key_hash VARCHAR(64) NOT NULL,
  -- First N characters of the key (e.g. "ak_live_a1b2c3d4") shown in the UI
  -- so the user can identify which key is which without exposing it.
  key_prefix VARCHAR(20) NOT NULL,
  -- ["read"] | ["read","write"] | ["read","write","delete"]
  permissions JSONB NOT NULL DEFAULT '["read"]'::jsonb,
  -- Soft cap, requests per hour. Enforced via Redis counter.
  rate_limit INTEGER NOT NULL DEFAULT 100,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash    ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant  ON api_keys(tenant_id, is_active);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_keys_tenant ON api_keys;
CREATE POLICY api_keys_tenant ON api_keys
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
