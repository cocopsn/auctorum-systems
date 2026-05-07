-- Patient document storage with AI-extracted metadata.
-- Each row = one uploaded file. The actual bytes live in Supabase Storage
-- (`documents` bucket); this table stores the pointer + AI summary.
--
-- status flow: pending_assignment → assigned → archived
--   pending_assignment: AI couldn't auto-match a patient (or no name in doc)
--   assigned: linked to patient_id
--   archived: doctor marked done, hidden from default views
--
-- document_type vocabulary (from AI):
--   lab_result | radiology | prescription | referral | insurance | other
--
-- RLS via tenant_id matches every other table in this schema.

CREATE TABLE IF NOT EXISTS documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id      UUID REFERENCES patients(id) ON DELETE SET NULL,

  file_name       VARCHAR(255) NOT NULL,
  file_type       VARCHAR(100),         -- MIME type (application/pdf, image/png, …)
  file_size       INTEGER,              -- bytes
  storage_path    TEXT NOT NULL,        -- key inside the documents bucket
  storage_bucket  VARCHAR(50) NOT NULL DEFAULT 'documents',

  document_type   VARCHAR(30),          -- lab_result | radiology | prescription | referral | insurance | other
  extracted_text  TEXT,                 -- first ~5kB of OCR/PDF text (for search + audit)
  ai_summary      TEXT,                 -- 1-2 line human summary
  ai_metadata     JSONB DEFAULT '{}',   -- raw structured output from the LLM
  document_date   DATE,                 -- date stamped on the document itself (NOT created_at)

  uploaded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  status          VARCHAR(30) NOT NULL DEFAULT 'pending_assignment',

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_status   ON documents (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_patient  ON documents (tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_created  ON documents (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_type     ON documents (tenant_id, document_type);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_tenant_isolation ON documents;
CREATE POLICY documents_tenant_isolation ON documents
  USING      (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE OR REPLACE FUNCTION documents_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION documents_set_updated_at();
