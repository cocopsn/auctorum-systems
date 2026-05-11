-- 0057_whatsapp_opt_in.sql
--
-- Add WhatsApp opt-in / opt-out tracking on patients + clients. Required
-- by WhatsApp Business Policy: "Businesses must obtain opt-in from users
-- before sending them messages." Pre-2026-05-12 there was no opt-in
-- column, so the default audience for `whatsapp_campaigns` was "every
-- client with a phone" — a one-way ticket to WABA quality-rating
-- demotion.
--
-- Semantics:
--   - opted_in_at  IS NOT NULL AND opted_out_at IS NULL  → may receive marketing
--   - opted_in_at  IS NULL                                → never marketed (transactional only)
--   - opted_out_at IS NOT NULL                            → STOP / BAJA received
--
-- The worker (scripts/worker.ts) detects opt-out keywords on inbound
-- messages and updates `opted_out_at`. The campaign worker filters its
-- audience by these columns.

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS whatsapp_opted_in_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_opted_out_at TIMESTAMPTZ;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS whatsapp_opted_in_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_opted_out_at TIMESTAMPTZ;

-- Patients/clients who already booked / paid for a service have given
-- implicit transactional consent. We backfill the opt-in for existing
-- rows so the bot can keep responding to current users. New rows must
-- get explicit opt-in via the agendar flow.
UPDATE patients
   SET whatsapp_opted_in_at = created_at
 WHERE whatsapp_opted_in_at IS NULL
   AND whatsapp_opted_out_at IS NULL;

UPDATE clients
   SET whatsapp_opted_in_at = created_at
 WHERE whatsapp_opted_in_at IS NULL
   AND whatsapp_opted_out_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_patients_whatsapp_opt
  ON patients (tenant_id, whatsapp_opted_out_at)
  WHERE whatsapp_opted_out_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clients_whatsapp_opt
  ON clients (tenant_id, whatsapp_opted_out_at)
  WHERE whatsapp_opted_out_at IS NULL;
