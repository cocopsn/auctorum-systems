import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { tenants, doctors, patients, schedules, appointments, appointmentEvents } from '@quote-engine/db'
import type { TenantConfig } from '@quote-engine/db'

const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString, { prepare: false })
const db = drizzle(client)

async function seed() {
  console.log('Seeding database...')

  // 1. Create tenant
  const tenantConfig: TenantConfig = {
    colors: {
      primary: '#2E7D32',
      secondary: '#4CAF50',
      accent: '#81C784',
      background: '#FFFFFF',
    },
    contact: {
      phone: '844 123 4567',
      email: 'consultorio@dramartinez.com',
      whatsapp: '528441234567',
      address: 'Blvd. V. Carranza 2345, Consultorio 8, Saltillo, Coahuila',
    },
    business: {
      razon_social: 'Dra. Laura Martínez García',
      rfc: 'MAGL850215ABC',
      giro: 'Dermatología',
    },
    medical: {
      specialty: 'Dermatología',
      sub_specialty: 'Dermatología Cosmética',
      cedula_profesional: '12345678',
      cedula_especialidad: '87654321',
      consultation_fee: 800,
      consultation_duration_min: 30,
      accepts_insurance: true,
      insurance_providers: ['GNP', 'AXA', 'Metlife', 'Seguros Monterrey'],
    },
    schedule_settings: {
      timezone: 'America/Monterrey',
      advance_booking_days: 30,
      min_booking_hours_ahead: 2,
      cancellation_hours: 4,
      auto_confirm: false,
      allow_online_payment: false,
      show_fee_on_portal: true,
    },
    notifications: {
      whatsapp_on_new_appointment: true,
      whatsapp_reminder_24h: true,
      whatsapp_reminder_2h: true,
      email_on_new_appointment: true,
    },
  }

  const [tenant] = await db.insert(tenants).values({
    slug: 'dra-martinez',
    name: 'Dra. Laura Martínez',
    logoUrl: null,
    config: tenantConfig,
    isActive: true,
    plan: 'profesional',
  }).returning()

  console.log(`Created tenant: ${tenant.slug} (${tenant.id})`)

  // 2. Create doctor
  const [doctor] = await db.insert(doctors).values({
    tenantId: tenant.id,
    specialty: 'Dermatología',
    subSpecialty: 'Dermatología Cosmética',
    cedulaProfesional: '12345678',
    cedulaEspecialidad: '87654321',
    consultationFee: '800.00',
    consultationDurationMin: 30,
    bio: 'Dermatóloga certificada con más de 15 años de experiencia. Especialista en dermatología cosmética, acné, rosácea y cáncer de piel. Egresada de la Universidad Autónoma de Coahuila con especialidad en el Hospital Universitario de Monterrey.',
    education: 'Medicina General — UAdeC 2005\nEspecialidad en Dermatología — Hospital Universitario UANL 2009\nSubespecialidad en Dermatología Cosmética — CDMX 2011',
    hospitalAffiliations: 'Hospital Christus Muguerza Saltillo\nHospital Universitario de Saltillo',
    languages: 'Español, Inglés',
    acceptsInsurance: true,
    insuranceProviders: ['GNP', 'AXA', 'Metlife', 'Seguros Monterrey'],
    photoUrl: null,
  }).returning()

  console.log(`Created doctor: ${doctor.specialty} (${doctor.id})`)

  // 3. Create schedules (Mon-Fri 9:00-14:00)
  for (let day = 1; day <= 5; day++) {
    await db.insert(schedules).values({
      tenantId: tenant.id,
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '14:00',
      slotDurationMin: 30,
      isActive: true,
      location: 'Blvd. V. Carranza 2345, Consultorio 8, Saltillo',
    })
  }

  console.log('Created schedules: Mon-Fri 9:00-14:00')

  // 4. Create 5 demo patients
  const patientData = [
    { name: 'María González Rodríguez', phone: '8441001001', email: 'maria.gonzalez@email.com', gender: 'Femenino', dateOfBirth: '1988-03-15' },
    { name: 'Carlos Hernández López', phone: '8441002002', email: 'carlos.hernandez@email.com', gender: 'Masculino', dateOfBirth: '1975-07-22' },
    { name: 'Ana Sofía Ramírez Torres', phone: '8441003003', email: 'ana.ramirez@email.com', gender: 'Femenino', dateOfBirth: '1992-11-08' },
    { name: 'Roberto Sánchez Garza', phone: '8441004004', email: 'roberto.sanchez@email.com', gender: 'Masculino', dateOfBirth: '1965-01-30' },
    { name: 'Lucía Fernández Castillo', phone: '8441005005', email: 'lucia.fernandez@email.com', gender: 'Femenino', dateOfBirth: '2000-06-12' },
  ]

  const insertedPatients = await db.insert(patients).values(
    patientData.map((p) => ({
      tenantId: tenant.id,
      name: p.name,
      phone: p.phone,
      email: p.email,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth,
    }))
  ).returning()

  console.log(`Created ${insertedPatients.length} patients`)

  // 5. Create 3 demo appointments
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  // Ensure it's a weekday
  while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
    tomorrow.setDate(tomorrow.getDate() + 1)
  }
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const appointmentData = [
    {
      patientId: insertedPatients[0].id,
      date: tomorrowStr,
      startTime: '09:00',
      endTime: '09:30',
      status: 'scheduled' as const,
      reason: 'Revisión de lunares',
      consultationFee: '800.00',
    },
    {
      patientId: insertedPatients[1].id,
      date: tomorrowStr,
      startTime: '09:30',
      endTime: '10:00',
      status: 'confirmed' as const,
      reason: 'Tratamiento de acné',
      consultationFee: '800.00',
    },
    {
      patientId: insertedPatients[2].id,
      date: tomorrowStr,
      startTime: '10:00',
      endTime: '10:30',
      status: 'scheduled' as const,
      reason: 'Consulta general dermatología',
      consultationFee: '800.00',
    },
  ]

  const insertedAppointments = await db.insert(appointments).values(
    appointmentData.map((a) => ({
      tenantId: tenant.id,
      ...a,
    }))
  ).returning()

  // Create events for each appointment
  for (const appt of insertedAppointments) {
    await db.insert(appointmentEvents).values({
      appointmentId: appt.id,
      tenantId: tenant.id,
      eventType: 'created',
      metadata: { source: 'seed' },
    })
  }

  // Mark second appointment as confirmed
  await db.insert(appointmentEvents).values({
    appointmentId: insertedAppointments[1].id,
    tenantId: tenant.id,
    eventType: 'confirmed',
    metadata: { source: 'seed', confirmed_by: 'patient' },
  })

  console.log(`Created ${insertedAppointments.length} appointments with events`)

  console.log('\nSeed completed successfully!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
