-- 0055_data_deletion_requests.sql
--
-- Real Meta Data Deletion + LFPDPPP ARCO request infrastructure.
--
-- Pre-2026-05-11 the /api/webhooks/meta-data-deletion endpoint returned
-- a confirmation code that resolved to nothing — Meta got a 200 + URL
-- but no data was queued for purge, no audit row, no operator visibility.
-- This violated Meta Platform Policy AND LFPDPPP Art. 32 (20-day mandatory
-- deletion timeline once an ARCO request is filed).
--
-- New shape:
--   - One row per deletion request (source = 'meta' | 'user' | 'admin')
--   - status: pending → processing → completed | failed
--   - scheduled_for: 20-business-day SLA deadline
--   - data_types_deleted: append-only audit of what got purged
--   - cron-data-deletion drains rows whose scheduled_for <= now()

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          VARCHAR(20) NOT NULL CHECK (source IN ('meta', 'user', 'admin')),
  external_user_id VARCHAR(100),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  patient_id      UUID REFERENCES patients(id) ON DELETE SET NULL,
  contact_email   VARCHAR(255),
  contact_phone   VARCHAR(50),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  data_types_deleted JSONB NOT NULL DEFAULT '[]'::jsonb,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for   TIMESTAMPTZ NOT NULL,
  processing_started_at TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error           TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ddr_status_scheduled
  ON data_deletion_requests (status, scheduled_for)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_ddr_external_user
  ON data_deletion_requests (external_user_id)
  WHERE external_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ddr_tenant
  ON data_deletion_requests (tenant_id, requested_at DESC)
  WHERE tenant_id IS NOT NULL;
