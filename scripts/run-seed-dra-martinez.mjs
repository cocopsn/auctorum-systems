import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = 'postgresql://postgres:AjFs28092109!Miranda@db.tewvtgvvxcvkijqeeoky.supabase.co:5432/postgres';

const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function main() {
  try {
    console.log('Connecting to Supabase...');

    // Test connection
    const [{ now }] = await sql`SELECT NOW()`;
    console.log('Connected. Server time:', now);

    // Check if tenant already exists
    const existing = await sql`SELECT slug FROM tenants WHERE slug = 'dra-martinez'`;
    if (existing.length > 0) {
      console.log('Tenant dra-martinez already exists. Updating...');
    }

    // ── 1. Tenant ──
    await sql`
      INSERT INTO tenants (id, slug, name, logo_url, config, is_active, plan)
      VALUES (
        'a0000000-0000-0000-0000-000000000001',
        'dra-martinez',
        'Dra. Laura Martínez',
        NULL,
        ${JSON.stringify({
          colors: { primary: "#2E7D32", secondary: "#4CAF50", accent: "#81C784", background: "#FFFFFF" },
          contact: { phone: "844 123 4567", email: "consultorio@dramartinez.com", whatsapp: "528441234567", address: "Blvd. V. Carranza 2345, Consultorio 8, Saltillo, Coahuila" },
          business: { razon_social: "Dra. Laura Martínez García", rfc: "MAGL850215ABC", giro: "Dermatología" },
          medical: { specialty: "Dermatología", sub_specialty: "Dermatología Cosmética", cedula_profesional: "12345678", cedula_especialidad: "87654321", consultation_fee: 800, consultation_duration_min: 30, accepts_insurance: true, insurance_providers: ["GNP", "AXA", "Metlife", "Seguros Monterrey"] },
          schedule_settings: { timezone: "America/Monterrey", advance_booking_days: 30, min_booking_hours_ahead: 2, cancellation_hours: 4, auto_confirm: false, allow_online_payment: false, show_fee_on_portal: true },
          notifications: { whatsapp_on_new_appointment: true, whatsapp_reminder_24h: true, whatsapp_reminder_2h: true, whatsapp_post_consultation: true, email_on_new_appointment: true, notify_on_cancellation: true, daily_agenda_email: true },
          features: { intake_forms: true, clinical_notes: true, ai_scribe: false, telehealth: false, online_payment: false, prescription_pdf: true, receipt_pdf: true }
        })}::jsonb,
        true,
        'profesional'
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        config = EXCLUDED.config,
        plan = EXCLUDED.plan,
        updated_at = NOW()
    `;
    console.log('✓ Tenant dra-martinez created/updated');

    // ── 2. Doctor ──
    await sql`
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
      ON CONFLICT (id) DO UPDATE SET
        specialty = EXCLUDED.specialty,
        bio = EXCLUDED.bio,
        education = EXCLUDED.education
    `;
    console.log('✓ Doctor record created/updated');

    // ── 3. Schedules (Mon-Fri 9:00-14:00) ──
    for (const day of [1, 2, 3, 4, 5]) {
      await sql`
        INSERT INTO schedules (tenant_id, day_of_week, start_time, end_time, slot_duration_min, is_active, location)
        VALUES ('a0000000-0000-0000-0000-000000000001', ${day}, '09:00', '14:00', 30, true, 'Consultorio 8, Blvd. V. Carranza 2345')
        ON CONFLICT (tenant_id, day_of_week, start_time) DO NOTHING
      `;
    }
    console.log('✓ Schedules created (Mon-Fri 9:00-14:00)');

    // ── 4. Patients (5 demo) ──
    const patients = [
      { id: 'c0000000-0000-0000-0000-000000000001', name: 'María Elena Rodríguez', email: 'maria.rodriguez@email.com', phone: '8441112233', dob: '1988-03-15', gender: 'Femenino', allergies: null, chronic: null, insurance: 'GNP', appts: 5, spent: 4000 },
      { id: 'c0000000-0000-0000-0000-000000000002', name: 'Carlos Alberto Garza', email: 'carlos.garza@email.com', phone: '8442223344', dob: '1975-08-22', gender: 'Masculino', allergies: 'Penicilina', chronic: 'Diabetes tipo 2', insurance: 'AXA', appts: 3, spent: 2400 },
      { id: 'c0000000-0000-0000-0000-000000000003', name: 'Ana Sofía Villarreal', email: 'ana.villarreal@email.com', phone: '8443334455', dob: '1995-11-30', gender: 'Femenino', allergies: null, chronic: null, insurance: null, appts: 2, spent: 1600 },
      { id: 'c0000000-0000-0000-0000-000000000004', name: 'Roberto Treviño López', email: 'roberto.trevino@email.com', phone: '8444445566', dob: '1962-01-10', gender: 'Masculino', allergies: 'Sulfonamidas', chronic: 'Hipertensión', insurance: 'Metlife', appts: 8, spent: 6400 },
      { id: 'c0000000-0000-0000-0000-000000000005', name: 'Fernanda Castillo Reyes', email: null, phone: '8445556677', dob: '2001-06-25', gender: 'Femenino', allergies: null, chronic: null, insurance: null, appts: 1, spent: 800 },
    ];

    for (const p of patients) {
      await sql`
        INSERT INTO patients (id, tenant_id, name, email, phone, date_of_birth, gender, allergies, chronic_conditions, insurance_provider, total_appointments, total_spent)
        VALUES (${p.id}, 'a0000000-0000-0000-0000-000000000001', ${p.name}, ${p.email}, ${p.phone}, ${p.dob}, ${p.gender}, ${p.allergies}, ${p.chronic}, ${p.insurance}, ${p.appts}, ${p.spent})
        ON CONFLICT (tenant_id, phone) DO NOTHING
      `;
    }
    console.log('✓ 5 demo patients created');

    // ── 5. Appointments (3 demo) ──
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Today: scheduled
    await sql`
      INSERT INTO appointments (id, tenant_id, patient_id, date, start_time, end_time, status, reason, consultation_fee)
      VALUES ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', ${today}, '10:00', '10:30', 'scheduled', 'Revisión de lunares — seguimiento anual', 800.00)
      ON CONFLICT (id) DO NOTHING
    `;

    // Tomorrow: confirmed
    await sql`
      INSERT INTO appointments (id, tenant_id, patient_id, date, start_time, end_time, status, reason, consultation_fee, confirmed_by_patient, confirmed_at)
      VALUES ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', ${tomorrow}, '09:00', '09:30', 'confirmed', 'Consulta por acné — primera visita', 800.00, true, NOW() - INTERVAL '2 hours')
      ON CONFLICT (id) DO NOTHING
    `;

    // Yesterday: completed
    await sql`
      INSERT INTO appointments (id, tenant_id, patient_id, date, start_time, end_time, status, reason, consultation_fee, payment_status, payment_method, completed_at)
      VALUES ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', ${yesterday}, '11:00', '11:30', 'completed', 'Control de dermatitis — seguimiento mensual', 800.00, 'paid', 'Tarjeta de crédito', ${yesterday + ' 11:30:00'}::timestamptz)
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('✓ 3 demo appointments created (today, tomorrow, yesterday)');

    // ── 6. Appointment Events ──
    await sql`
      INSERT INTO appointment_events (tenant_id, appointment_id, event_type)
      VALUES
        ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'created'),
        ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'created'),
        ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'confirmed'),
        ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'created'),
        ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'completed')
    `;
    console.log('✓ Appointment events created');

    // ── Verification ──
    const tenant = await sql`SELECT slug, name, plan FROM tenants WHERE slug = 'dra-martinez'`;
    const doctor = await sql`SELECT specialty, consultation_fee FROM doctors WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001'`;
    const schedules = await sql`SELECT day_of_week, start_time, end_time FROM schedules WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001' ORDER BY day_of_week`;
    const patientCount = await sql`SELECT count(*) FROM patients WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001'`;
    const apptCount = await sql`SELECT count(*) FROM appointments WHERE tenant_id = 'a0000000-0000-0000-0000-000000000001'`;

    console.log('\n═══ VERIFICATION ═══');
    console.log('Tenant:', tenant[0]);
    console.log('Doctor:', doctor[0]);
    console.log('Schedules:', schedules.length, 'days configured');
    console.log('Patients:', patientCount[0].count);
    console.log('Appointments:', apptCount[0].count);
    console.log('\n✓ Seed completed successfully!');

  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
