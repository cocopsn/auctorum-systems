-- ═══════════════════════════════════════════════════════════
-- SEED: Dra. Laura Martínez — Concierge AI Médico
-- Run: psql $DATABASE_URL -f scripts/seed-dra-martinez.sql
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Tenant ────────────────────────────────────────────

INSERT INTO tenants (id, slug, name, logo_url, config, is_active, plan)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'dra-martinez',
  'Dra. Laura Martínez',
  NULL,
  '{
    "colors": {
      "primary": "#2E7D32",
      "secondary": "#4CAF50",
      "accent": "#81C784",
      "background": "#FFFFFF"
    },
    "contact": {
      "phone": "844 123 4567",
      "email": "consultorio@dramartinez.com",
      "whatsapp": "528441234567",
      "address": "Blvd. V. Carranza 2345, Consultorio 8, Saltillo, Coahuila"
    },
    "business": {
      "razon_social": "Dra. Laura Martínez García",
      "rfc": "MAGL850215ABC",
      "giro": "Dermatología"
    },
    "medical": {
      "specialty": "Dermatología",
      "sub_specialty": "Dermatología Cosmética",
      "cedula_profesional": "12345678",
      "cedula_especialidad": "87654321",
      "consultation_fee": 800,
      "consultation_duration_min": 30,
      "accepts_insurance": true,
      "insurance_providers": ["GNP", "AXA", "Metlife", "Seguros Monterrey"]
    },
    "schedule_settings": {
      "timezone": "America/Monterrey",
      "advance_booking_days": 30,
      "min_booking_hours_ahead": 2,
      "cancellation_hours": 4,
      "auto_confirm": false,
      "allow_online_payment": false,
      "show_fee_on_portal": true
    },
    "notifications": {
      "whatsapp_on_new_appointment": true,
      "whatsapp_reminder_24h": true,
      "whatsapp_reminder_2h": true,
      "whatsapp_post_consultation": true,
      "email_on_new_appointment": true,
      "notify_on_cancellation": true,
      "daily_agenda_email": true
    },
    "features": {
      "intake_forms": true,
      "clinical_notes": true,
      "ai_scribe": false,
      "telehealth": false,
      "online_payment": false,
      "prescription_pdf": true,
      "receipt_pdf": true
    }
  }'::jsonb,
  true,
  'profesional'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  config = EXCLUDED.config,
  plan = EXCLUDED.plan,
  updated_at = NOW();

-- ─── 2. Doctor ────────────────────────────────────────────

INSERT INTO doctors (id, tenant_id, specialty, sub_specialty, cedula_profesional, cedula_especialidad, consultation_fee, consultation_duration_min, bio, education, hospital_affiliations, languages, accepts_insurance, insurance_providers, photo_url)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Dermatología',
  'Dermatología Cosmética',
  '12345678',
  '87654321',
  800.00,
  30,
  'Especialista en dermatología clínica y cosmética con más de 15 años de experiencia. Enfoque integral en salud de la piel, diagnóstico temprano y tratamientos de última generación.',
  'Médico Cirujano — Universidad Autónoma de Coahuila (2004-2010). Especialidad en Dermatología — Hospital Universitario UANL (2010-2014). Fellowship en Dermatología Cosmética — Hospital ABC, CDMX (2014-2015).',
  'Hospital Christus Muguerza Saltillo, Clínica del Valle',
  'Español, Inglés',
  true,
  '["GNP", "AXA", "Metlife", "Seguros Monterrey"]'::jsonb,
  NULL
)
ON CONFLICT DO NOTHING;

-- ─── 3. Schedules (Lunes a Viernes, 9:00-14:00) ─────────

-- Monday (1)
INSERT INTO schedules (tenant_id, day_of_week, start_time, end_time, slot_duration_min, is_active, location)
VALUES ('a0000000-0000-0000-0000-000000000001', 1, '09:00', '14:00', 30, true, 'Consultorio 8, Blvd. V. Carranza 2345')
ON CONFLICT (tenant_id, day_of_week, start_time) DO NOTHING;

-- Tuesday (2)
INSERT INTO schedules (tenant_id, day_of_week, start_time, end_time, slot_duration_min, is_active, location)
VALUES ('a0000000-0000-0000-0000-000000000001', 2, '09:00', '14:00', 30, true, 'Consultorio 8, Blvd. V. Carranza 2345')
ON CONFLICT (tenant_id, day_of_week, start_time) DO NOTHING;

-- Wednesday (3)
INSERT INTO schedules (tenant_id, day_of_week, start_time, end_time, slot_duration_min, is_active, location)
VALUES ('a0000000-0000-0000-0000-000000000001', 3, '09:00', '14:00', 30, true, 'Consultorio 8, Blvd. V. Carranza 2345')
ON CONFLICT (tenant_id, day_of_week, start_time) DO NOTHING;

-- Thursday (4)
INSERT INTO schedules (tenant_id, day_of_week, start_time, end_time, slot_duration_min, is_active, location)
VALUES ('a0000000-0000-0000-0000-000000000001', 4, '09:00', '14:00', 30, true, 'Consultorio 8, Blvd. V. Carranza 2345')
ON CONFLICT (tenant_id, day_of_week, start_time) DO NOTHING;

-- Friday (5)
INSERT INTO schedules (tenant_id, day_of_week, start_time, end_time, slot_duration_min, is_active, location)
VALUES ('a0000000-0000-0000-0000-000000000001', 5, '09:00', '14:00', 30, true, 'Consultorio 8, Blvd. V. Carranza 2345')
ON CONFLICT (tenant_id, day_of_week, start_time) DO NOTHING;

-- ─── 4. Patients (5 demo) ────────────────────────────────

INSERT INTO patients (id, tenant_id, name, email, phone, date_of_birth, gender, allergies, chronic_conditions, insurance_provider, total_appointments, total_spent)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'María Elena Rodríguez', 'maria.rodriguez@email.com', '8441112233',
   '1988-03-15', 'Femenino', NULL, NULL, 'GNP', 5, 4000.00),

  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Carlos Alberto Garza', 'carlos.garza@email.com', '8442223344',
   '1975-08-22', 'Masculino', 'Penicilina', 'Diabetes tipo 2', 'AXA', 3, 2400.00),

  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'Ana Sofía Villarreal', 'ana.villarreal@email.com', '8443334455',
   '1995-11-30', 'Femenino', NULL, NULL, NULL, 2, 1600.00),

  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'Roberto Treviño López', 'roberto.trevino@email.com', '8444445566',
   '1962-01-10', 'Masculino', 'Sulfonamidas', 'Hipertensión', 'Metlife', 8, 6400.00),

  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
   'Fernanda Castillo Reyes', NULL, '8445556677',
   '2001-06-25', 'Femenino', NULL, NULL, NULL, 1, 800.00)
ON CONFLICT (tenant_id, phone) DO NOTHING;

-- ─── 5. Appointments (3 demo) ────────────────────────────

-- Today: scheduled appointment
INSERT INTO appointments (id, tenant_id, patient_id, date, start_time, end_time, status, reason, consultation_fee)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  CURRENT_DATE,
  '10:00', '10:30',
  'scheduled',
  'Revisión de lunares — seguimiento anual',
  800.00
)
ON CONFLICT DO NOTHING;

-- Tomorrow: confirmed appointment
INSERT INTO appointments (id, tenant_id, patient_id, date, start_time, end_time, status, reason, consultation_fee, confirmed_by_patient, confirmed_at)
VALUES (
  'd0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000003',
  CURRENT_DATE + INTERVAL '1 day',
  '09:00', '09:30',
  'confirmed',
  'Consulta por acné — primera visita',
  800.00,
  true,
  NOW() - INTERVAL '2 hours'
)
ON CONFLICT DO NOTHING;

-- Yesterday: completed appointment
INSERT INTO appointments (id, tenant_id, patient_id, date, start_time, end_time, status, reason, consultation_fee, payment_status, payment_method, completed_at)
VALUES (
  'd0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000004',
  CURRENT_DATE - INTERVAL '1 day',
  '11:00', '11:30',
  'completed',
  'Control de dermatitis — seguimiento mensual',
  800.00,
  'paid',
  'Tarjeta de crédito',
  CURRENT_DATE - INTERVAL '1 day' + TIME '11:30'
)
ON CONFLICT DO NOTHING;

-- ─── 6. Appointment Events ───────────────────────────────

INSERT INTO appointment_events (tenant_id, appointment_id, event_type)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'created'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'created'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'confirmed'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'created'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'completed')
ON CONFLICT DO NOTHING;

COMMIT;

-- ═══════════════════════════════════════════════════════════
-- VERIFICATION: Run after seed to confirm data
-- ═══════════════════════════════════════════════════════════
-- SELECT slug, name, plan FROM tenants WHERE slug = 'dra-martinez';
-- SELECT specialty, consultation_fee FROM doctors WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';
-- SELECT day_of_week, start_time, end_time FROM schedules WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001' ORDER BY day_of_week;
-- SELECT name, phone FROM patients WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001';
-- SELECT date, start_time, status FROM appointments WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001' ORDER BY date;
