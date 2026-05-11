-- 0060_clinical_signature_hash.sql
--
-- Add the NOM-004 cryptographic signature column to clinical_records.
-- See packages/db/src/clinical-signature.ts for the canonical payload
-- and the SHA-256 algorithm. P2-1 of the 2026-05-12 audit.
--
-- NULL on existing rows is fine — they were locked before crypto-sig
-- existed; the verification endpoint returns { signed: true,
-- hash_verifiable: false } for those. Future locks always populate
-- this column.

ALTER TABLE clinical_records
  ADD COLUMN IF NOT EXISTS signature_hash VARCHAR(64);

-- Lookup index for the public /api/verify endpoint.
CREATE INDEX IF NOT EXISTS idx_clinical_records_signature_hash
  ON clinical_records (signature_hash)
  WHERE signature_hash IS NOT NULL;
