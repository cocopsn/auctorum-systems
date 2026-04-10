-- CP13: Clinical records — patient medications + file attachments.
-- Adds free-text medications column on patients and creates a new
-- patient_files table for clinical document attachments (lab PDFs,
-- prescription photos, scans). File blobs live in Supabase storage
-- bucket `patient-files`; this table only stores metadata pointing
-- at the storage path.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE TABLE IF NOT EXISTS
-- + CREATE INDEX IF NOT EXISTS. Safe to re-run after partial failures.

-- 1. medications column on patients (free text, no length cap at DB layer;
--    Zod enforces 4000-char cap at the API layer).
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS medications TEXT;

-- 2. patient_files — metadata table for file attachments.
CREATE TABLE IF NOT EXISTS patient_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for common access patterns: patient detail page lists all
--    files for one patient; tenant-wide queries (audit, cleanup) scan
--    by tenant.
CREATE INDEX IF NOT EXISTS idx_patient_files_patient ON patient_files(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_files_tenant ON patient_files(tenant_id);
