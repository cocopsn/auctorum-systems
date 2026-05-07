-- Per-patient communication ledger. A unified timeline showing every email
-- we sent, every WhatsApp we exchanged, every call logged, and any manual
-- note the doctor adds. The patient detail page renders this as a single
-- chronological feed.
--
-- type vocabulary:
--   email_sent | email_received | whatsapp_sent | whatsapp_received |
--   sms_sent | call | note
--
-- This is APPEND-ONLY by convention — never UPDATE rows here. If the
-- doctor wants to edit a note, write a new row of type='note' referencing
-- the original timestamp in the body.

CREATE TABLE IF NOT EXISTS patient_communications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  type         VARCHAR(30) NOT NULL,
  subject      VARCHAR(500),       -- email subject, WA preview, call topic, …
  content      TEXT,               -- body or note, optional
  recipient    VARCHAR(255),       -- email address, phone, etc
  external_id  VARCHAR(255),       -- Resend message id, wamid, etc

  metadata     JSONB DEFAULT '{}',
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  occurred_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pcomms_patient_occurred
  ON patient_communications (patient_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_pcomms_tenant
  ON patient_communications (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pcomms_type
  ON patient_communications (tenant_id, type);

ALTER TABLE patient_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pcomms_tenant_isolation ON patient_communications;
CREATE POLICY pcomms_tenant_isolation ON patient_communications
  USING      (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
