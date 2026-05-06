-- Migration 0048: persistent state for resilience fallbacks
--
-- pending_calendar_ops — operations against Google Calendar that failed
-- when Google was unreachable. The cron picks them up and retries.
--
-- webhook_failures — payment/webhook deliveries that hit transient errors.
-- A retry job processes them with exponential backoff.

CREATE TABLE IF NOT EXISTS pending_calendar_ops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  operation VARCHAR(20) NOT NULL,                  -- 'create' | 'update' | 'delete'
  appointment_id UUID NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_cal_ops_pending
  ON pending_calendar_ops(processed, next_retry_at)
  WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_pending_cal_ops_tenant
  ON pending_calendar_ops(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS webhook_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(20) NOT NULL,                     -- 'stripe' | 'mercadopago' | 'meta'
  external_id VARCHAR(255),                        -- payment id / event id, for dedup
  payload JSONB NOT NULL,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  dead_letter_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_failures_pending
  ON webhook_failures(resolved_at, dead_letter_at, next_retry_at)
  WHERE resolved_at IS NULL AND dead_letter_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_failures_dedup
  ON webhook_failures(source, external_id)
  WHERE external_id IS NOT NULL AND resolved_at IS NULL;

ALTER TABLE pending_calendar_ops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pending_calendar_ops_tenant ON pending_calendar_ops;
CREATE POLICY pending_calendar_ops_tenant ON pending_calendar_ops
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- webhook_failures is intentionally global (no tenant scoping) — webhooks
-- arrive without an authenticated tenant context.
