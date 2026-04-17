-- CP11: Mini-CRM fields (notes + status) on clients table.
-- Adds two columns so the clients directory can track free-text notes
-- and a simple lifecycle (lead / customer / inactive). No DB enum —
-- the API layer (Zod) is the source of truth for valid values so we
-- stay flexible for future additions.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + a guarded backfill. Safe to
-- re-run after partial failures.

-- 1. Schema changes
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'lead';

-- 2. Backfill: promote clients with at least one accepted quote to
--    'customer'. Only touches rows still on the default 'lead' so a
--    re-run after a manual demotion won't clobber user intent.
DO $$
BEGIN
  UPDATE clients
    SET status = 'customer'
    WHERE total_accepted > 0
      AND status = 'lead';
END $$;
