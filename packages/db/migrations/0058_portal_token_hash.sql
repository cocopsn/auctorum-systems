-- 0058_portal_token_hash.sql
--
-- Hash the patient portal token so a DB-read leak (anon key abuse,
-- backup theft) doesn't immediately compromise every patient portal.
--
-- The raw token continues to be returned to the patient in the URL we
-- send via WhatsApp; the server-side stores only its SHA-256 hash for
-- comparison. Existing rows are migrated by computing the hash of the
-- current plaintext token in-place.
--
-- Also adds `portal_token_expires_at` for time-bound access (default 90
-- days; rotated on each access by the portal route).

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS portal_token_hash       VARCHAR(64),
  ADD COLUMN IF NOT EXISTS portal_token_expires_at TIMESTAMPTZ;

-- Backfill: hash existing plaintext tokens with sha256.
-- pgcrypto's `digest()` returns bytea; we hex-encode for storage match.
UPDATE patients
   SET portal_token_hash = encode(digest(portal_token, 'sha256'), 'hex')
 WHERE portal_token IS NOT NULL
   AND portal_token_hash IS NULL;

-- Existing rows get a 90-day expiry from now; new rows set it at
-- patient creation time.
UPDATE patients
   SET portal_token_expires_at = NOW() + INTERVAL '90 days'
 WHERE portal_token_expires_at IS NULL
   AND portal_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_portal_token_hash
  ON patients (tenant_id, portal_token_hash)
  WHERE portal_token_hash IS NOT NULL;
