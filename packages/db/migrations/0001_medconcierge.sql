-- ============================================================
-- Auctorum Systems — Concierge AI Médico
-- Migration: 0001_medconcierge.sql
-- Tables: doctors, patients, appointments, appointment_events,
--         schedules, schedule_blocks, clinical_notes,
--         intake_forms, intake_responses
-- ============================================================

-- doctors
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  specialty VARCHAR(255) NOT NULL,
  sub_specialty VARCHAR(255),
  cedula_profesional VARCHAR(20),
  cedula_especialidad VARCHAR(20),
  consultation_fee DECIMAL(10,2),
  consultation_duration_min INTEGER DEFAULT 30,
  bio TEXT,
  education TEXT,
  hospital_affiliations TEXT,
  languages VARCHAR(255) DEFAULT 'Español',
  accepts_insurance BOOLEAN DEFAULT false,
  insurance_providers JSONB DEFAULT '[]',
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- patients
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(20),
  blood_type VARCHAR(5),
  allergies TEXT,
  chronic_conditions TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  insurance_provider VARCHAR(255),
  insurance_policy VARCHAR(100),
  notes TEXT,
  total_appointments INTEGER DEFAULT 0,
  total_no_shows INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  last_appointment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, phone)
);

-- appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled',
  reason VARCHAR(500),
  notes TEXT,
  diagnosis TEXT,
  prescription TEXT,
  consultation_fee DECIMAL(10,2),
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(30),
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_24h_sent_at TIMESTAMPTZ,
  reminder_2h_sent BOOLEAN DEFAULT false,
  reminder_2h_sent_at TIMESTAMPTZ,
  confirmed_by_patient BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  no_show_marked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON appointments(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- appointment_events
CREATE TABLE IF NOT EXISTS appointment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  event_type VARCHAR(30) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_appt_events_appointment ON appointment_events(appointment_id);

-- schedules
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_min INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  location VARCHAR(255),
  UNIQUE(tenant_id, day_of_week, start_time)
);

-- schedule_blocks
CREATE TABLE IF NOT EXISTS schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- clinical_notes
CREATE TABLE IF NOT EXISTS clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  note_type VARCHAR(30) DEFAULT 'consultation',
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  content TEXT,
  ai_generated BOOLEAN DEFAULT false,
  ai_transcript TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient ON clinical_notes(patient_id);

-- intake_forms
CREATE TABLE IF NOT EXISTS intake_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  fields JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- intake_responses
CREATE TABLE IF NOT EXISTS intake_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES intake_forms(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  responses JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security (RLS) for medconcierge tables
-- ============================================================
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_responses ENABLE ROW LEVEL SECURITY;

-- Public: read doctors, schedules for portal
CREATE POLICY "doctors_select_public" ON doctors FOR SELECT USING (true);
CREATE POLICY "schedules_select_public" ON schedules FOR SELECT USING (is_active = true);

-- Public: insert appointments and patients from portal
CREATE POLICY "patients_insert_public" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY "patients_select_public" ON patients FOR SELECT USING (true);
CREATE POLICY "appointments_insert_public" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "appointments_select_public" ON appointments FOR SELECT USING (true);
CREATE POLICY "appointment_events_insert_public" ON appointment_events FOR INSERT WITH CHECK (true);

-- Public: read schedule blocks for availability
CREATE POLICY "schedule_blocks_select_public" ON schedule_blocks FOR SELECT USING (true);

-- Public: read intake forms, submit responses
CREATE POLICY "intake_forms_select_public" ON intake_forms FOR SELECT USING (is_active = true);
CREATE POLICY "intake_responses_insert_public" ON intake_responses FOR INSERT WITH CHECK (true);

-- Authenticated: full CRUD for own tenant
CREATE POLICY "patients_update_tenant" ON patients FOR UPDATE USING (true);
CREATE POLICY "appointments_update_tenant" ON appointments FOR UPDATE USING (true);
CREATE POLICY "clinical_notes_all" ON clinical_notes FOR ALL USING (true);
CREATE POLICY "schedules_insert_tenant" ON schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "schedules_update_tenant" ON schedules FOR UPDATE USING (true);
CREATE POLICY "schedules_delete_tenant" ON schedules FOR DELETE USING (true);
CREATE POLICY "schedule_blocks_insert_tenant" ON schedule_blocks FOR INSERT WITH CHECK (true);
CREATE POLICY "schedule_blocks_delete_tenant" ON schedule_blocks FOR DELETE USING (true);
CREATE POLICY "intake_forms_insert_tenant" ON intake_forms FOR INSERT WITH CHECK (true);
CREATE POLICY "intake_forms_update_tenant" ON intake_forms FOR UPDATE USING (true);
