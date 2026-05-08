/**
 * Seed dra-martinez with a complete month of realistic activity so the
 * dashboard, reports, and conversation surfaces have enough mass to look
 * and behave like a real practice.
 *
 *   - 30 patients (Mexican names, Saltillo addresses)
 *   - ~80 appointments distributed across the past 30 days + tomorrow
 *     (mix of completed / cancelled / no_show / scheduled)
 *   - patient_payments for each completed appointment (most succeeded)
 *   - 36 conversations (WhatsApp + Instagram) with realistic message threads
 *   - 25 ad_leads from facebook / instagram / google / website / manual
 *     (mixed pipeline statuses)
 *   - 18 documents (lab results, radiology, prescriptions, referrals)
 *   - ~120 patient_communications timeline entries
 *
 * Idempotent: every row is tagged with a stable marker (phone range,
 * external_id prefix, metadata.seeded flag) so re-running cleans the
 * previous batch before inserting fresh data. The KB, AI config, tenant
 * settings, and any non-seeded patient remain untouched.
 *
 * Run:
 *   ssh -p 2222 root@<vps> "cd /opt/auctorum-systems/repo && \
 *     DATABASE_URL='...' npx tsx scripts/seed-dra-martinez-month.ts"
 */

import { db } from '../packages/db/index'
import { sql } from 'drizzle-orm'

const TENANT_ID = 'a0000000-0000-0000-0000-000000000001'

// ----------------------------------------------------------------------
// Markers used to make the seed re-runnable. Anything NOT matching these
// is left alone — real patients/leads keep their data.
// ----------------------------------------------------------------------
const SEED_PHONE_PREFIX = '+52844999' // patients we own
const SEED_LEAD_PHONE_PREFIX = '+52844998' // leads we own (phone range)
const SEED_CONV_EXTID_PREFIX = 'seed-conv-' // conversations we own
const SEED_DOC_PREFIX = 'seed-' // documents we own (file_name)

// ----------------------------------------------------------------------
// Realistic source material. Names + reasons are dermatology-flavoured
// so the dashboard reads like a real cosmetic-derm practice.
// ----------------------------------------------------------------------
const FIRST_NAMES = [
  'María', 'Sofía', 'Valentina', 'Camila', 'Isabella', 'Lucía', 'Mariana',
  'Renata', 'Ximena', 'Daniela', 'Andrea', 'Paula', 'Fernanda', 'Regina',
  'Ana', 'Laura', 'Elena', 'Carmen', 'Patricia', 'Lorena',
  'Carlos', 'Diego', 'Andrés', 'Fernando', 'Jorge', 'Roberto', 'Miguel',
  'Pablo', 'Eduardo', 'Ricardo',
]
const LAST_NAMES = [
  'González', 'Hernández', 'Martínez', 'Rodríguez', 'García', 'Pérez',
  'Sánchez', 'López', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez',
  'Díaz', 'Cruz', 'Morales', 'Ortiz', 'Reyes', 'Castillo', 'Vargas',
  'Ramos', 'Mendoza', 'Aguilar', 'Jiménez', 'Vázquez',
]
const STREETS = [
  'Blvd. V. Carranza', 'Av. Universidad', 'Periférico Luis Echeverría',
  'Calle Allende', 'Calle Hidalgo', 'Av. Las Torres', 'Calle Juárez',
  'Calle Morelos', 'Blvd. Francisco Coss', 'Av. La Salle',
]
const COLONIAS = [
  'Los Maestros', 'República Norte', 'Burócratas', 'Centro', 'Topo Chico',
  'Zona Centro', 'Saltillo 400', 'Las Mañanitas', 'Real del Sol',
]
const APPT_REASONS = [
  'Consulta de acné', 'Revisión de lunares con dermatoscopia',
  'Tratamiento de manchas', 'Limpieza facial profunda',
  'Valoración de rosácea', 'Aplicación de toxina botulínica',
  'Tratamiento de melasma', 'Peeling químico',
  'Revisión post-tratamiento', 'Consulta de primera vez',
  'Consulta de psoriasis', 'Eliminación de verrugas',
  'Crioterapia de queratosis', 'Valoración de alopecia',
  'Microneedling con plasma',
]
const LEAD_MESSAGES = [
  'Vi su anuncio y me interesa información sobre tratamiento de acné',
  'Quería saber precios para limpieza facial profunda',
  'Tengo manchas en la cara y quiero una valoración',
  'Necesito información sobre toxina botulínica',
  'Mi hija de 16 tiene acné severo, ¿me podrían ayudar?',
  'Me gustaría agendar una consulta de primera vez',
  'Vi sus reseñas en Google y quería contactar',
  'Información de tratamiento de melasma por favor',
]
const BOT_REPLIES = [
  '¡Hola! Soy el asistente virtual de la Dra. Laura Martínez. ¿En qué le puedo ayudar?',
  'Claro, le puedo agendar una consulta de primera vez. ¿Qué día le acomoda?',
  'La consulta general tiene un costo de $800 MXN e incluye valoración completa.',
  'Tenemos disponibilidad este jueves a las 11:00 o el viernes a las 16:30. ¿Cuál prefiere?',
  'Perfecto, he agendado su cita. Le enviaremos un recordatorio 24h antes.',
  'Para cancelar o reprogramar, simplemente avísenos por este chat con al menos 24h de anticipación.',
]
const CLIENT_MESSAGES = [
  'Hola, buenas tardes. Quería agendar una cita',
  '¿Cuánto cuesta la consulta?',
  '¿Tienen disponibilidad esta semana?',
  'Sí, el jueves a las 11 me acomoda',
  'Perfecto, gracias',
  'Nos vemos entonces',
  'Una pregunta más, ¿aceptan tarjeta?',
  'Muchas gracias',
]
const DOCUMENT_NAMES: Array<{ type: string; name: string; summary: string }> = [
  { type: 'lab_result', name: 'biometria-hematica.pdf', summary: 'Biometría hemática completa, sin alteraciones significativas.' },
  { type: 'lab_result', name: 'quimica-sanguinea.pdf', summary: 'Química sanguínea — glucosa y perfil lipídico dentro de rangos normales.' },
  { type: 'radiology', name: 'dermatoscopia-lunar-espalda.jpg', summary: 'Dermatoscopia de lunar en región dorsal — patrón regular, sin signos de alarma.' },
  { type: 'prescription', name: 'receta-isotretinoina.pdf', summary: 'Isotretinoína 20mg c/24h por 4 meses + protector solar SPF 50.' },
  { type: 'referral', name: 'referencia-cirugia-plastica.pdf', summary: 'Referencia a cirugía plástica para evaluación de cicatriz hipertrófica.' },
  { type: 'lab_result', name: 'biopsia-cutanea.pdf', summary: 'Biopsia cutánea — queratosis seborreica, lesión benigna.' },
  { type: 'prescription', name: 'receta-tretinoina.pdf', summary: 'Tretinoína al 0.05% aplicación nocturna + ácido azelaico.' },
  { type: 'radiology', name: 'foto-clinica-rosacea.jpg', summary: 'Documentación fotográfica de rosácea fase II en mejillas.' },
  { type: 'insurance', name: 'autorizacion-gnp.pdf', summary: 'Autorización GNP Seguros para tratamiento dermatológico.' },
  { type: 'lab_result', name: 'cultivo-bacteriano.pdf', summary: 'Cultivo bacteriano de pústulas — Cutibacterium acnes positivo.' },
  { type: 'prescription', name: 'receta-clindamicina.pdf', summary: 'Clindamicina tópica 1% + peróxido de benzoilo 5%.' },
  { type: 'referral', name: 'referencia-endocrinologia.pdf', summary: 'Referencia a endocrinología por sospecha de SOP en paciente con acné resistente.' },
  { type: 'lab_result', name: 'perfil-hormonal.pdf', summary: 'Perfil hormonal — testosterona libre ligeramente elevada.' },
  { type: 'other', name: 'consentimiento-informado-toxina.pdf', summary: 'Consentimiento informado firmado para aplicación de toxina botulínica.' },
  { type: 'radiology', name: 'foto-clinica-melasma.jpg', summary: 'Foto clínica de melasma centrofacial — control mes 3 de tratamiento.' },
  { type: 'prescription', name: 'receta-hidroquinona.pdf', summary: 'Hidroquinona 4% nocturna por 3 meses, suspender los fines de semana.' },
  { type: 'other', name: 'plan-tratamiento-acne.pdf', summary: 'Plan de tratamiento integral para acné nodular grado IV.' },
  { type: 'insurance', name: 'cobertura-axa.pdf', summary: 'Validación de cobertura AXA — incluye consulta y tratamiento tópico.' },
]

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
/** Random YYYY-MM-DD between (today - daysAgo) and (today + daysAhead). */
function randomDate(daysAgo: number, daysAhead: number): Date {
  const today = new Date()
  today.setUTCHours(12, 0, 0, 0)
  const offset = rand(-daysAgo, daysAhead)
  const d = new Date(today.getTime() + offset * 86_400_000)
  return d
}
function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0]
}
function fmtTimeOfDay(hour: number, minute: number): string {
  // Normalise out-of-range minute (e.g. start.minute + 30 may overflow 60)
  const h = (hour + Math.floor(minute / 60)) % 24
  const m = minute % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}
/** Compute end time = start time + 30 minutes, returning the same string format. */
function plus30(start: string): string {
  const [h, m] = start.split(':').map((s) => parseInt(s, 10))
  return fmtTimeOfDay(h, m + 30)
}
function isoMinus(daysAgo: number, hoursOffset = 0): string {
  return new Date(Date.now() - daysAgo * 86_400_000 - hoursOffset * 3_600_000).toISOString()
}

// ----------------------------------------------------------------------
// Wipe seeded rows so the script is re-runnable.
// ----------------------------------------------------------------------
async function wipeSeeded(): Promise<void> {
  console.log('→ Wiping previous seed batch (matching markers only)…')

  // patient_communications: matched by metadata.seeded
  await db.execute(sql`
    DELETE FROM patient_communications
    WHERE tenant_id = ${TENANT_ID}::uuid AND metadata->>'seeded' = '1'
  `)
  // patient_payments: matched by metadata.seeded
  await db.execute(sql`
    DELETE FROM patient_payments
    WHERE tenant_id = ${TENANT_ID}::uuid AND metadata->>'seeded' = '1'
  `)
  // ad_leads: matched by raw_data.seeded
  await db.execute(sql`
    DELETE FROM ad_leads
    WHERE tenant_id = ${TENANT_ID}::uuid AND raw_data->>'seeded' = '1'
  `)
  // documents: matched by ai_metadata.seeded
  await db.execute(sql`
    DELETE FROM documents
    WHERE tenant_id = ${TENANT_ID}::uuid AND ai_metadata->>'seeded' = '1'
  `)
  // appointments: matched via seeded patients (phone prefix). Has no
  // cascade from patients so we delete here first.
  await db.execute(sql`
    DELETE FROM appointments
    WHERE tenant_id = ${TENANT_ID}::uuid
      AND patient_id IN (
        SELECT id FROM patients
        WHERE tenant_id = ${TENANT_ID}::uuid
          AND phone LIKE ${SEED_PHONE_PREFIX + '%'}
      )
  `)
  // messages: matched via seeded conversations (cascade clears messages
  // automatically when we drop the conversation, but we do it explicit so
  // the order is obvious).
  await db.execute(sql`
    DELETE FROM messages
    WHERE conversation_id IN (
      SELECT id FROM conversations
      WHERE tenant_id = ${TENANT_ID}::uuid
        AND external_id LIKE ${SEED_CONV_EXTID_PREFIX + '%'}
    )
  `)
  await db.execute(sql`
    DELETE FROM conversations
    WHERE tenant_id = ${TENANT_ID}::uuid
      AND external_id LIKE ${SEED_CONV_EXTID_PREFIX + '%'}
  `)
  // patients last
  await db.execute(sql`
    DELETE FROM patients
    WHERE tenant_id = ${TENANT_ID}::uuid AND phone LIKE ${SEED_PHONE_PREFIX + '%'}
  `)
  // clients matched by phone prefix — referenced by conversations.client_id
  // (separate FK from patients.id, not handled by patient cascade).
  await db.execute(sql`
    DELETE FROM clients
    WHERE tenant_id = ${TENANT_ID}::uuid AND phone LIKE ${SEED_PHONE_PREFIX + '%'}
  `)
  console.log('  ✓ wiped')
}

// ----------------------------------------------------------------------
// Insert helpers — each returns the new ids.
// ----------------------------------------------------------------------
type SeededPatient = { id: string; clientId: string; name: string; phone: string; gender: string }

async function seedPatients(count: number): Promise<SeededPatient[]> {
  console.log(`→ Inserting ${count} patients…`)
  const out: SeededPatient[] = []
  for (let i = 0; i < count; i++) {
    const isFemale = Math.random() < 0.78 // dermatology skews female
    const first = pick(FIRST_NAMES)
    const last = `${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`
    const fullName = `${first} ${last}`
    const phone = `${SEED_PHONE_PREFIX}${String(100 + i).padStart(3, '0')}`
    const email = `${first.toLowerCase().replace(/[^a-z]/g, '')}${i}@example.com`
    const dob = `${rand(1960, 2005)}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`
    const address = `${pick(STREETS)} #${rand(100, 9999)}, Col. ${pick(COLONIAS)}, Saltillo, Coah.`
    const createdAgo = rand(0, 28)
    const r = (await db.execute(sql`
      INSERT INTO patients (
        tenant_id, name, email, phone, date_of_birth, gender,
        address, occupation, marital_status, consent_signed, consent_signed_at,
        notes, created_at, updated_at
      )
      VALUES (
        ${TENANT_ID}::uuid, ${fullName}, ${email}, ${phone}, ${dob}::date,
        ${isFemale ? 'female' : 'male'},
        ${address},
        ${pick(['Profesional', 'Estudiante', 'Empleada', 'Empresaria', 'Ama de casa', 'Maestra'])},
        ${pick(['single', 'married', 'divorced'])},
        ${true}, ${isoMinus(createdAgo)}::timestamptz,
        ${'SEED-MONTH paciente ' + i},
        ${isoMinus(createdAgo)}::timestamptz,
        ${isoMinus(createdAgo)}::timestamptz
      )
      RETURNING id::text
    `)) as unknown as Array<{ id: string }>
    // Mirror to clients (the table conversations.client_id points at —
    // separate from patients). Without this, every WhatsApp conversation
    // shows "Sin nombre" in the inbox.
    const c = (await db.execute(sql`
      INSERT INTO clients (
        tenant_id, name, email, phone, status, notes, created_at, updated_at
      )
      VALUES (
        ${TENANT_ID}::uuid, ${fullName}, ${email}, ${phone}, ${'lead'},
        ${'SEED-MONTH cliente ' + i},
        ${isoMinus(createdAgo)}::timestamptz, ${isoMinus(createdAgo)}::timestamptz
      )
      RETURNING id::text
    `)) as unknown as Array<{ id: string }>
    out.push({
      id: r[0].id,
      clientId: c[0].id,
      name: fullName,
      phone,
      gender: isFemale ? 'female' : 'male',
    })
  }
  console.log(`  ✓ ${out.length} patients`)
  return out
}

type SeededAppointment = {
  id: string
  patientId: string
  patientName: string
  date: string
  status: string
  fee: number
}

async function seedAppointments(patients: SeededPatient[]): Promise<SeededAppointment[]> {
  console.log('→ Inserting appointments (mixed statuses, 30d window + 7d future)…')
  const out: SeededAppointment[] = []

  // Always have 4 appointments today: 09:30 completed, 11:00 in-progress
  // (status=scheduled), 14:30 scheduled, 17:00 scheduled
  const todayDate = fmtDate(new Date())
  const todaySlots: Array<{ start: string; end: string; status: string }> = [
    { start: fmtTimeOfDay(9, 30), end: fmtTimeOfDay(10, 0), status: 'completed' },
    { start: fmtTimeOfDay(11, 0), end: fmtTimeOfDay(11, 30), status: 'completed' },
    { start: fmtTimeOfDay(14, 30), end: fmtTimeOfDay(15, 0), status: 'scheduled' },
    { start: fmtTimeOfDay(17, 0), end: fmtTimeOfDay(17, 30), status: 'scheduled' },
  ]
  for (const slot of todaySlots) {
    const p = pick(patients)
    const fee = pick([800, 950, 1200, 1500])
    const reason = pick(APPT_REASONS)
    const r = (await db.execute(sql`
      INSERT INTO appointments (
        tenant_id, patient_id, date, start_time, end_time, status,
        reason, consultation_fee, payment_status, created_at
      )
      VALUES (
        ${TENANT_ID}::uuid, ${p.id}::uuid, ${todayDate}::date,
        ${slot.start}::time, ${slot.end}::time, ${slot.status},
        ${reason}, ${fee}::numeric,
        ${slot.status === 'completed' ? 'paid' : 'pending'},
        ${isoMinus(rand(1, 14))}::timestamptz
      )
      RETURNING id::text
    `)) as unknown as Array<{ id: string }>
    out.push({ id: r[0].id, patientId: p.id, patientName: p.name, date: todayDate, status: slot.status, fee })
  }

  // Past 28 days: ~3 appointments per day with mixed statuses.
  for (let daysAgo = 28; daysAgo >= 1; daysAgo--) {
    const apptCount = rand(2, 4)
    const date = new Date()
    date.setUTCDate(date.getUTCDate() - daysAgo)
    const dateStr = fmtDate(date)
    const dayOfWeek = date.getUTCDay() // 0=Sun, 6=Sat
    if (dayOfWeek === 0) continue // Sundays closed
    const max = dayOfWeek === 6 ? 2 : apptCount // Saturdays half day
    for (let i = 0; i < max; i++) {
      const p = pick(patients)
      const hour = pick([9, 10, 11, 12, 16, 17, 18])
      const start = fmtTimeOfDay(hour, pick([0, 30]))
      const end = plus30(start)
      // Past appointments: 70% completed, 12% cancelled, 12% no_show, 6% scheduled (left dangling)
      const r2 = Math.random()
      const status =
        r2 < 0.7 ? 'completed' : r2 < 0.82 ? 'cancelled' : r2 < 0.94 ? 'no_show' : 'scheduled'
      const fee = pick([800, 950, 1200, 1500])
      const reason = pick(APPT_REASONS)
      const r = (await db.execute(sql`
        INSERT INTO appointments (
          tenant_id, patient_id, date, start_time, end_time, status,
          reason, consultation_fee, payment_status,
          completed_at, cancelled_at, no_show_marked_at, created_at
        )
        VALUES (
          ${TENANT_ID}::uuid, ${p.id}::uuid, ${dateStr}::date,
          ${start}::time, ${end}::time, ${status},
          ${reason}, ${fee}::numeric,
          ${status === 'completed' ? 'paid' : status === 'no_show' ? 'pending' : 'pending'},
          ${status === 'completed' ? isoMinus(daysAgo, -hour) : null},
          ${status === 'cancelled' ? isoMinus(daysAgo + 1) : null},
          ${status === 'no_show' ? isoMinus(daysAgo, -hour - 1) : null},
          ${isoMinus(daysAgo + rand(1, 14))}::timestamptz
        )
        RETURNING id::text
      `)) as unknown as Array<{ id: string }>
      out.push({ id: r[0].id, patientId: p.id, patientName: p.name, date: dateStr, status, fee })
    }
  }

  // Future 7 days: scheduled
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const date = new Date()
    date.setUTCDate(date.getUTCDate() + daysAhead)
    const dateStr = fmtDate(date)
    const dayOfWeek = date.getUTCDay()
    if (dayOfWeek === 0) continue
    const max = dayOfWeek === 6 ? 1 : 3
    for (let i = 0; i < max; i++) {
      const p = pick(patients)
      const hour = pick([9, 10, 11, 12, 16, 17, 18])
      const start = fmtTimeOfDay(hour, pick([0, 30]))
      const end = plus30(start)
      const fee = pick([800, 950, 1200, 1500])
      const reason = pick(APPT_REASONS)
      const r = (await db.execute(sql`
        INSERT INTO appointments (
          tenant_id, patient_id, date, start_time, end_time, status,
          reason, consultation_fee, payment_status, created_at,
          confirmed_by_patient
        )
        VALUES (
          ${TENANT_ID}::uuid, ${p.id}::uuid, ${dateStr}::date,
          ${start}::time, ${end}::time, ${'scheduled'},
          ${reason}, ${fee}::numeric, ${'pending'},
          ${isoMinus(rand(1, 7))}::timestamptz,
          ${Math.random() < 0.6}
        )
        RETURNING id::text
      `)) as unknown as Array<{ id: string }>
      out.push({ id: r[0].id, patientId: p.id, patientName: p.name, date: dateStr, status: 'scheduled', fee })
    }
  }

  console.log(`  ✓ ${out.length} appointments`)
  return out
}

async function seedPayments(appointments: SeededAppointment[]): Promise<number> {
  console.log('→ Inserting patient_payments for completed appointments…')
  const completed = appointments.filter((a) => a.status === 'completed')
  let inserted = 0
  for (const a of completed) {
    // 92% succeeded, 5% pending, 3% refunded
    const r = Math.random()
    const status = r < 0.92 ? 'succeeded' : r < 0.97 ? 'pending' : 'refunded'
    const amount = a.fee * 100 // centavos
    const fee = Math.round(amount * 0.029) + 300 // ~Stripe + app fee
    const createdAt = `${a.date}T${String(rand(9, 18)).padStart(2, '0')}:${String(rand(0, 59)).padStart(2, '0')}:00Z`
    await db.execute(sql`
      INSERT INTO patient_payments (
        tenant_id, patient_id, appointment_id,
        amount, application_fee, currency, status,
        description, patient_name, payment_method,
        metadata, created_at, updated_at
      )
      VALUES (
        ${TENANT_ID}::uuid, ${a.patientId}::uuid, ${a.id}::uuid,
        ${amount}::int, ${fee}::int, ${'mxn'}, ${status},
        ${'Consulta dermatológica'}, ${a.patientName},
        ${pick(['card_visa', 'card_mastercard', 'spei', 'cash'])},
        ${JSON.stringify({ seeded: '1' })}::jsonb,
        ${createdAt}::timestamptz, ${createdAt}::timestamptz
      )
    `)
    inserted++
  }
  console.log(`  ✓ ${inserted} payments`)
  return inserted
}

async function seedConversationsAndMessages(patients: SeededPatient[]): Promise<number> {
  console.log('→ Inserting conversations + messages…')
  const subset = patients.slice(0, Math.min(36, patients.length))
  let convCount = 0
  let msgCount = 0
  for (let i = 0; i < subset.length; i++) {
    const p = subset[i]
    const channel = Math.random() < 0.85 ? 'whatsapp' : 'instagram'
    const externalId = `${SEED_CONV_EXTID_PREFIX}${i}`
    const createdAgo = rand(0, 28)
    const lastMsgAgo = createdAgo - rand(0, Math.min(2, createdAgo))
    const status = Math.random() < 0.7 ? 'open' : 'closed'
    const convRows = (await db.execute(sql`
      INSERT INTO conversations (
        tenant_id, client_id, channel, external_id, status, bot_paused,
        last_message_at, unread_count, created_at, updated_at
      )
      VALUES (
        ${TENANT_ID}::uuid, ${p.clientId}::uuid, ${channel}, ${externalId}, ${status},
        ${false}, ${isoMinus(lastMsgAgo)}::timestamptz,
        ${rand(0, 3)}, ${isoMinus(createdAgo)}::timestamptz,
        ${isoMinus(lastMsgAgo)}::timestamptz
      )
      RETURNING id::text
    `)) as unknown as Array<{ id: string }>
    const convId = convRows[0].id
    convCount++

    // 4–10 messages per conversation, alternating inbound/outbound
    const msgs = rand(4, 10)
    let cursor = createdAgo
    for (let m = 0; m < msgs; m++) {
      const inbound = m % 2 === 0
      const content = inbound ? pick(CLIENT_MESSAGES) : pick(BOT_REPLIES)
      cursor = Math.max(0, cursor - rand(0, 1) * 0.04)
      const at = isoMinus(createdAgo, -m * 0.1)
      await db.execute(sql`
        INSERT INTO messages (
          conversation_id, direction, sender_type, content, created_at
        )
        VALUES (
          ${convId}::uuid,
          ${inbound ? 'inbound' : 'outbound'},
          ${inbound ? 'client' : 'bot'},
          ${content},
          ${at}::timestamptz
        )
      `)
      msgCount++
    }
  }
  console.log(`  ✓ ${convCount} conversations, ${msgCount} messages`)
  return convCount
}

async function seedAdLeads(patients: SeededPatient[]): Promise<number> {
  console.log('→ Inserting ad_leads…')
  const sources = ['facebook', 'instagram', 'google', 'website', 'manual']
  const statuses = [
    { s: 'new', w: 0.18 },
    { s: 'contacted', w: 0.22 },
    { s: 'responded', w: 0.18 },
    { s: 'appointed', w: 0.16 },
    { s: 'converted', w: 0.14 },
    { s: 'lost', w: 0.12 },
  ]
  const campaigns = [
    'CAMP-Acne-Saltillo-Mar26',
    'CAMP-Manchas-Q1-2026',
    'CAMP-Toxina-Mayo',
    'GoogleAds-Dermatologa-CTA',
    'Instagram-Reels-Boost',
  ]
  const ads = ['Ad-Variant-A', 'Ad-Variant-B', 'Carousel-Antes-Despues', 'Reel-Testimonio']

  let inserted = 0
  for (let i = 0; i < 25; i++) {
    const source = pick(sources)
    const r = Math.random()
    let acc = 0
    let status = 'new'
    for (const s of statuses) {
      acc += s.w
      if (r <= acc) { status = s.s; break }
    }
    const linkedPatient = (status === 'converted' || status === 'appointed') && Math.random() < 0.85
      ? pick(patients)
      : null
    const phone = linkedPatient
      ? linkedPatient.phone
      : `${SEED_LEAD_PHONE_PREFIX}${String(100 + i).padStart(3, '0')}`
    const createdAgo = rand(0, 28)
    const whatsappSent = status !== 'new'
    const name = linkedPatient
      ? linkedPatient.name
      : `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`

    await db.execute(sql`
      INSERT INTO ad_leads (
        tenant_id, source, campaign_name, ad_name, form_id,
        name, phone, email, message, status,
        whatsapp_sent, whatsapp_sent_at, patient_id,
        raw_data, utm_source, utm_medium, utm_campaign,
        created_at, updated_at
      )
      VALUES (
        ${TENANT_ID}::uuid, ${source},
        ${pick(campaigns)}, ${pick(ads)}, ${'FORM-' + rand(100000, 999999)},
        ${name}, ${phone},
        ${name.toLowerCase().split(' ')[0] + i + '@gmail.com'},
        ${pick(LEAD_MESSAGES)}, ${status},
        ${whatsappSent}, ${whatsappSent ? isoMinus(createdAgo, -1) : null}::timestamptz,
        ${linkedPatient ? linkedPatient.id : null}::uuid,
        ${JSON.stringify({ seeded: '1', form_data: { age_range: pick(['18-25','26-35','36-45','46+']) } })}::jsonb,
        ${source}, ${'paid_social'}, ${pick(campaigns)},
        ${isoMinus(createdAgo)}::timestamptz, ${isoMinus(createdAgo)}::timestamptz
      )
    `)
    inserted++
  }
  console.log(`  ✓ ${inserted} ad_leads`)
  return inserted
}

async function seedDocuments(patients: SeededPatient[]): Promise<number> {
  console.log('→ Inserting documents…')
  let inserted = 0
  for (let i = 0; i < 18; i++) {
    const tpl = DOCUMENT_NAMES[i % DOCUMENT_NAMES.length]
    // 80% assigned to a patient, 20% pending
    const assigned = Math.random() < 0.8
    const p = assigned ? pick(patients) : null
    const fileName = `${SEED_DOC_PREFIX}${i}-${tpl.name}`
    const createdAgo = rand(0, 28)
    await db.execute(sql`
      INSERT INTO documents (
        tenant_id, patient_id, file_name, file_type, file_size,
        storage_path, storage_bucket, document_type,
        ai_summary, ai_metadata, document_date, status,
        created_at, updated_at
      )
      VALUES (
        ${TENANT_ID}::uuid, ${p ? p.id : null}::uuid,
        ${fileName},
        ${tpl.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'},
        ${rand(80_000, 2_400_000)}::int,
        ${'documents/' + TENANT_ID + '/' + fileName},
        ${'documents'}, ${tpl.type},
        ${tpl.summary},
        ${JSON.stringify({ seeded: '1', confidence: 0.9 })}::jsonb,
        ${isoMinus(createdAgo).split('T')[0]}::date,
        ${assigned ? 'assigned' : 'pending_assignment'},
        ${isoMinus(createdAgo)}::timestamptz, ${isoMinus(createdAgo)}::timestamptz
      )
    `)
    inserted++
  }
  console.log(`  ✓ ${inserted} documents`)
  return inserted
}

async function seedCommunications(patients: SeededPatient[]): Promise<number> {
  console.log('→ Inserting patient_communications…')
  let inserted = 0
  const types = [
    { t: 'whatsapp_sent', subj: 'Recordatorio de cita', content: 'Hola {name}, recordatorio de su cita mañana a las {time}. Confirme con CITA.' },
    { t: 'whatsapp_received', subj: 'Confirmación', content: 'Confirmada, gracias' },
    { t: 'email_sent', subj: 'Plan de tratamiento', content: 'Le envío adjunto el plan de tratamiento personalizado.' },
    { t: 'note', subj: 'Nota interna', content: 'Paciente mostró buena respuesta a tretinoína al 0.05%.' },
    { t: 'call', subj: 'Llamada de seguimiento', content: 'Llamada de seguimiento — paciente reporta mejoría.' },
    { t: 'sms_sent', subj: 'Recordatorio SMS', content: 'Su cita es mañana 11:00. Reagende: bit.ly/x' },
  ]
  for (const p of patients) {
    const events = rand(2, 6)
    for (let i = 0; i < events; i++) {
      const tpl = pick(types)
      const occurredAgo = rand(0, 28)
      await db.execute(sql`
        INSERT INTO patient_communications (
          tenant_id, patient_id, type, subject, content, recipient,
          metadata, occurred_at, created_at
        )
        VALUES (
          ${TENANT_ID}::uuid, ${p.id}::uuid, ${tpl.t},
          ${tpl.subj}, ${tpl.content.replace('{name}', p.name).replace('{time}', '11:00')},
          ${p.phone}, ${JSON.stringify({ seeded: '1' })}::jsonb,
          ${isoMinus(occurredAgo)}::timestamptz, ${isoMinus(occurredAgo)}::timestamptz
        )
      `)
      inserted++
    }
  }
  console.log(`  ✓ ${inserted} patient_communications`)
  return inserted
}

// ----------------------------------------------------------------------
// Entrypoint
// ----------------------------------------------------------------------
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set')
  console.log('Seeding dra-martinez (a0000000-0000-0000-0000-000000000001)…')
  console.log('Tenant DB:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@'))
  const t0 = Date.now()

  await wipeSeeded()
  const patients = await seedPatients(30)
  const appts = await seedAppointments(patients)
  const payments = await seedPayments(appts)
  const convs = await seedConversationsAndMessages(patients)
  const leads = await seedAdLeads(patients)
  const docs = await seedDocuments(patients)
  const comms = await seedCommunications(patients)

  console.log('\nSummary:')
  console.log(`  patients:               ${patients.length}`)
  console.log(`  appointments:           ${appts.length}`)
  console.log(`  patient_payments:       ${payments}`)
  console.log(`  conversations:          ${convs}`)
  console.log(`  ad_leads:               ${leads}`)
  console.log(`  documents:              ${docs}`)
  console.log(`  patient_communications: ${comms}`)
  console.log(`  elapsed:                ${((Date.now() - t0) / 1000).toFixed(1)}s`)
}

main()
  .then(() => {
    console.log('\nSeed complete.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('\nSeed FAILED:', err)
    process.exit(1)
  })
