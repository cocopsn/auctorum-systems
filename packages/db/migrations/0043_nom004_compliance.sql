-- NOM-004-SSA3-2012 Compliance migration.
-- Adds the columns required by the Mexican federal medical-records standard:
--   - patient identity (CURP, occupation, marital status, full address)
--   - record immutability (is_locked + locked_at + locked_by; signed records
--     cannot be edited or deleted per section 4.4)
--   - structured diagnosis (ICD-10 + text), treatment, prognosis, vital signs
--   - doctor credentials (cédula profesional already exists; adds university,
--     SSA registration, digital signature)
--   - informed_consents table for procedures requiring patient consent.

-- ─────────────────────────── PATIENTS ───────────────────────────
ALTER TABLE patients ADD COLUMN IF NOT EXISTS curp                 VARCHAR(18);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS occupation           VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS marital_status       VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address              TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance_policy_number        VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_signed       BOOLEAN DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_signed_at    TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_patients_curp
  ON patients(curp) WHERE curp IS NOT NULL;

-- ─────────────────────────── DOCTORS ───────────────────────────
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS university       VARCHAR(255);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS ssa_registration VARCHAR(50);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS digital_signature TEXT; -- base64 image (PNG)

-- ─────────────────────────── CLINICAL RECORDS ───────────────────────────
-- Lock state: once the doctor signs the record, it becomes immutable per
-- NOM-004 §4.4. The PATCH/DELETE endpoints must refuse changes when locked.
ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS is_locked      BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS locked_at      TIMESTAMPTZ;
ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS locked_by      UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS doctor_id      UUID REFERENCES doctors(id) ON DELETE SET NULL;
ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS doctor_cedula  VARCHAR(20);   -- snapshot at lock time
ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS doctor_name    VARCHAR(255);  -- snapshot at lock time

-- Structured medical fields (NOM-004 requires diagnosis, plan, prognosis)
ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS vital_signs    JSONB DEFAULT '{}'::jsonb;
ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS diagnosis_icd10 VARCHAR(10);
ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS diagnosis_text  TEXT;
ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS treatment_plan  TEXT;
ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS prognosis       TEXT;

CREATE INDEX IF NOT EXISTS idx_clinical_records_locked
  ON clinical_records(tenant_id, is_locked);

-- ─────────────────────────── INFORMED CONSENTS ───────────────────────────
CREATE TABLE IF NOT EXISTS informed_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id     UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id      UUID REFERENCES doctors(id) ON DELETE SET NULL,
  procedure_name VARCHAR(255) NOT NULL,
  description    TEXT NOT NULL,
  risks          TEXT NOT NULL,
  alternatives   TEXT,
  patient_signature TEXT,    -- base64 PNG of touch/mouse signature
  doctor_signature  TEXT,    -- base64 PNG (or copy of doctor.digital_signature)
  signed_at      TIMESTAMPTZ,
  revoked_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consents_patient ON informed_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_consents_tenant  ON informed_consents(tenant_id);

-- RLS: tenant-scoped. The connection sets app.tenant_id on auth.
ALTER TABLE informed_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS consents_tenant ON informed_consents;
CREATE POLICY consents_tenant ON informed_consents
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
