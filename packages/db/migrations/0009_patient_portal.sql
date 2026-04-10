-- CP14: Patient portal — token-based read-only access.
-- Each patient gets a unique portal_token (UUID v4) used to access
-- their appointments, prescriptions, and medical summary at
-- /{slug}/portal/{token}. Token is distributed via WhatsApp + email
-- in booking confirmations.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, backfill only NULL rows,
-- guarded ALTER + CREATE UNIQUE INDEX IF NOT EXISTS.

-- 1. Add portal_token column (nullable initially for safe ADD).
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS portal_token VARCHAR(36);

-- 2. Backfill all existing patients that don't have a token yet.
UPDATE patients
  SET portal_token = gen_random_uuid()
  WHERE portal_token IS NULL;

-- 3. Make NOT NULL + add default for future inserts.
ALTER TABLE patients
  ALTER COLUMN portal_token SET NOT NULL;

ALTER TABLE patients
  ALTER COLUMN portal_token SET DEFAULT gen_random_uuid();

-- 4. Unique index for O(1) lookup by token (the primary access pattern).
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_portal_token
  ON patients(portal_token);
