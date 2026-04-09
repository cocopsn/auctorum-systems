-- CP8: per-tenant folio consecutivo
-- Adds tenants.quote_sequence (atomic counter) and quotes.tenant_seq,
-- backfills existing quotes deterministically, and enforces per-tenant
-- uniqueness going forward. The global quotes.quote_number SERIAL is
-- intentionally kept for backwards compat with analytics / tracking URLs.

-- 1. Schema changes
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS quote_sequence INTEGER NOT NULL DEFAULT 0;

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS tenant_seq INTEGER;

-- 2. Backfill tenant_seq for existing quotes (partitioned by tenant,
--    ordered by created_at with id as a deterministic tiebreaker).
--    Wrapped in a DO block so re-runs after partial failures are safe.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM quotes WHERE tenant_seq IS NULL LIMIT 1) THEN
    WITH ordered AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id) AS rn
      FROM quotes
      WHERE tenant_seq IS NULL
    )
    UPDATE quotes SET tenant_seq = ordered.rn
    FROM ordered
    WHERE quotes.id = ordered.id;
  END IF;
END $$;

-- 3. Sync tenants.quote_sequence to MAX(tenant_seq) per tenant so the
--    next atomic increment produces a gap-free continuation.
UPDATE tenants SET quote_sequence = COALESCE(
  (SELECT MAX(tenant_seq) FROM quotes WHERE quotes.tenant_id = tenants.id),
  0
);

-- 4. Enforce per-tenant uniqueness for all future inserts.
CREATE UNIQUE INDEX IF NOT EXISTS quotes_tenant_seq_unique
  ON quotes (tenant_id, tenant_seq);
