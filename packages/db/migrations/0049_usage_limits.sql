-- Migration 0049: per-tenant usage tracking + add-on packages
--
-- tenant_usage   — running counters per (tenant, period). One row per
--                  YYYY-MM. Updated transactionally by usage-tracker.ts.
-- usage_addons   — add-on packs purchased to extend a metric beyond the
--                  plan's monthly cap. Consumed FIFO (oldest first) when
--                  the plan budget is exhausted.

CREATE TABLE IF NOT EXISTS tenant_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL,                -- 'YYYY-MM'
  whatsapp_messages   INTEGER NOT NULL DEFAULT 0,
  api_calls           INTEGER NOT NULL DEFAULT 0,
  ai_tokens           BIGINT  NOT NULL DEFAULT 0,
  storage_bytes       BIGINT  NOT NULL DEFAULT 0,
  patients_count      INTEGER NOT NULL DEFAULT 0,
  appointments_count  INTEGER NOT NULL DEFAULT 0,
  campaigns_sent      INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_usage_period_unique UNIQUE (tenant_id, period)
);

CREATE INDEX IF NOT EXISTS idx_tenant_usage_lookup
  ON tenant_usage(tenant_id, period);

CREATE TABLE IF NOT EXISTS usage_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- Logical type matched against PLAN_LIMITS metrics:
  -- 'whatsapp_messages' | 'api_calls' | 'ai_tokens' | 'storage_bytes'
  addon_type VARCHAR(40) NOT NULL,
  -- Canonical package id from ADDON_PACKAGES (e.g. 'whatsapp_500')
  package_id VARCHAR(40) NOT NULL,
  -- Total units granted by this purchase
  quantity BIGINT NOT NULL,
  -- Units still available to consume
  remaining BIGINT NOT NULL,
  -- Price paid in centavos MXN
  price INTEGER NOT NULL,
  payment_id UUID,
  payment_processor VARCHAR(20),    -- 'stripe' | 'mercadopago' | 'manual'
  external_payment_id VARCHAR(255), -- charge / payment_intent / preference id
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,           -- NULL = never expires (consumed by use)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_addons_lookup
  ON usage_addons(tenant_id, addon_type, purchased_at)
  WHERE remaining > 0;

CREATE INDEX IF NOT EXISTS idx_usage_addons_external
  ON usage_addons(payment_processor, external_payment_id)
  WHERE external_payment_id IS NOT NULL;

ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_usage_tenant ON tenant_usage;
CREATE POLICY tenant_usage_tenant ON tenant_usage
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

ALTER TABLE usage_addons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usage_addons_tenant ON usage_addons;
CREATE POLICY usage_addons_tenant ON usage_addons
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
