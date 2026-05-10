/**
 * Tool executors — implementan la logica de cada tool del function calling.
 * Cada executor wrapea con withTenant() para que RLS permita operaciones.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { db, withTenant, conversations, type Tenant, type Doctor } from '@quote-engine/db';
import { sql, eq } from 'drizzle-orm';
import type { ToolCallResult } from './tools';

const TZ = process.env.DEFAULT_TIMEZONE || 'America/Monterrey';

// ============================================================
// Multi-doctor context (per-execution, NOT module-level)
//
// Pre-2026-05-10 this was a module-level mutable variable. The worker
// runs with concurrency=3 — three tenants' messages were processed in
// parallel and the last `setDoctorContext` call won for ALL three. That
// meant tenant A's patient could end up assigned tenant B's doctor on
// brand-new appointment rows. Cross-tenant data corruption.
//
// AsyncLocalStorage gives us request-scoped context: each `runWithDoctorContext`
// pushes a frame on the async stack, and any `await` inside that frame
// reads back the same frame regardless of how many other tenants are
// concurrently mutating their own contexts on different stacks.
// ============================================================
type DoctorContext = {
  doctors: Doctor[];
  selectedDoctor: Doctor | null;
  conversationId: string | null;
};

const EMPTY_CTX: DoctorContext = { doctors: [], selectedDoctor: null, conversationId: null };
const ctxStore = new AsyncLocalStorage<DoctorContext>();

/**
 * Read the current doctor context. Returns an empty context (no doctors,
 * no selection) when called outside a `runWithDoctorContext` frame —
 * tools that depend on a doctor will short-circuit with their normal
 * "no doctor configured" path.
 */
function currentCtx(): DoctorContext {
  return ctxStore.getStore() ?? EMPTY_CTX;
}

/**
 * Run `fn` with `value` as the active doctor context. Use this in the
 * worker (or any caller about to invoke tools) instead of the deprecated
 * `setDoctorContext` setter.
 */
export function runWithDoctorContext<T>(value: DoctorContext, fn: () => Promise<T>): Promise<T> {
  return ctxStore.run(value, fn);
}

/**
 * @deprecated Use `runWithDoctorContext(ctx, fn)` to get per-request
 * scoping. The setter survives so existing call sites keep compiling
 * during migration; under concurrency it loses correctness vs. ALS.
 */
export function setDoctorContext(value: DoctorContext) {
  // Best-effort: if we're inside an ALS frame, mutate it (so
  // select_doctor's persistent change works). Otherwise this is a no-op
  // — callers should migrate to runWithDoctorContext.
  const current = ctxStore.getStore();
  if (current) {
    current.doctors = value.doctors;
    current.selectedDoctor = value.selectedDoctor;
    current.conversationId = value.conversationId;
  }
}

// ============================================================
// Input Sanitization
// ============================================================
function sanitizeString(s: unknown, maxLen = 500): string {
  if (typeof s !== 'string') return '';
  return s.slice(0, maxLen).replace(/<[^>]*>/g, '').trim();
}

function isValidDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isValidUUID(s: unknown): s is string {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function sanitizePhone(s: unknown): string {
  if (typeof s !== 'string') return '';
  const digits = s.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return '';
  return digits;
}

function clampDuration(n: unknown, min = 5, max = 480): number {
  const val = typeof n === 'number' ? n : parseInt(String(n), 10);
  if (isNaN(val) || val < min) return 30;
  return Math.min(val, max);
}

// ============================================================
// Helpers
// ============================================================
function addMinutes(timeStr: string, minutes: number): string {
  const [h, m, s = '00'] = timeStr.split(':');
  const totalMin = parseInt(h, 10) * 60 + parseInt(m, 10) + minutes;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:${s}`;
}

function getScheduleForDate(
  tenant: Tenant,
  date: string,
  doctor?: Doctor | null
): { enabled: boolean; start?: string; end?: string } {
  if (doctor?.schedule) {
    const sched = doctor.schedule as Record<string, { start: string; end: string; enabled: boolean }>;
    const dow = new Date(date + 'T12:00:00-06:00')
      .toLocaleDateString('en-US', { weekday: 'long', timeZone: TZ })
      .toLowerCase();
    const dayConfig = sched[dow];
    if (dayConfig) return dayConfig;
  }
  const config = (tenant.config ?? {}) as Record<string, any>;
  const schedule = config.schedule;
  if (!schedule || typeof schedule !== 'object') return { enabled: true };
  const dow = new Date(date + 'T12:00:00-06:00')
    .toLocaleDateString('en-US', { weekday: 'long', timeZone: TZ })
    .toLowerCase();
  const dayConfig = schedule[dow];
  if (!dayConfig) return { enabled: false };
  return dayConfig;
}

function isWithinSchedule(tenant: Tenant, date: string, time: string, doctor?: Doctor | null): { valid: boolean; reason?: string } {
  const dayConfig = getScheduleForDate(tenant, date, doctor);
  if (!dayConfig?.enabled) {
    const dow = new Date(date + 'T12:00:00-06:00').toLocaleDateString('es-MX', { weekday: 'long', timeZone: TZ });
    return { valid: false, reason: `No hay atencion los ${dow}` };
  }
  if (dayConfig.start && dayConfig.end) {
    if (time < dayConfig.start || time >= dayConfig.end) {
      return { valid: false, reason: `El horario ${time} esta fuera del horario de atencion (${dayConfig.start}-${dayConfig.end})` };
    }
  }
  return { valid: true };
}

function formatBusinessHoursForDay(tenant: Tenant, date: string, doctor?: Doctor | null): string {
  const dayConfig = getScheduleForDate(tenant, date, doctor);
  const dow = new Date(date + 'T12:00:00-06:00').toLocaleDateString('es-MX', { weekday: 'long', timeZone: TZ });
  if (!dayConfig?.enabled) return `${dow}: cerrado`;
  return `${dow}: ${dayConfig.start || '?'} - ${dayConfig.end || '?'}`;
}

async function getAvailableSlotsForDay(tenant: Tenant, date: string, duration_min: number, doctorId?: string | null): Promise<string[]> {
  const doctor = doctorId ? currentCtx().doctors.find(d => d.id === doctorId) : null;
  const dayConfig = getScheduleForDate(tenant, date, doctor);
  if (!dayConfig?.enabled || !dayConfig.start || !dayConfig.end) return [];

  const doctorFilter = doctorId ? sql` AND doctor_id = ${doctorId}::uuid` : sql``;
  const busy = await withTenant(tenant.id, async (tx) => {
    return await tx.execute(sql`
      SELECT start_time::text as start_time, end_time::text as end_time
      FROM appointments
      WHERE tenant_id = ${tenant.id}::uuid AND date = ${date}::date
        AND status IN ('scheduled', 'confirmed') ${doctorFilter}
      ORDER BY start_time
    `);
  });
  const busyRows: any[] = Array.isArray(busy) ? busy : (busy as any)?.rows ?? [];
  const busySlots = busyRows.map((r) => ({ start: String(r.start_time).slice(0, 5), end: String(r.end_time).slice(0, 5) }));

  const slots: string[] = [];
  let cur = dayConfig.start;
  while (cur < dayConfig.end) {
    const slotEnd = addMinutes(cur, duration_min).slice(0, 5);
    if (slotEnd > dayConfig.end) break;
    const overlap = busySlots.some((b) => !(slotEnd <= b.start || cur >= b.end));
    if (!overlap) slots.push(cur);
    cur = addMinutes(cur, duration_min).slice(0, 5);
  }
  return slots;
}

function resolveDoctor(args: { doctor_id?: string }): { doctorId: string | null; error?: string } {
  const ctx = currentCtx();
  if (args.doctor_id && isValidUUID(args.doctor_id)) return { doctorId: args.doctor_id };
  if (ctx.selectedDoctor) return { doctorId: ctx.selectedDoctor.id };
  if (ctx.doctors.length === 1) return { doctorId: ctx.doctors[0].id };
  if (ctx.doctors.length > 1) {
    const names = ctx.doctors.map(d => d.name).join(', ');
    return { doctorId: null, error: `Este consultorio tiene ${ctx.doctors.length} doctores: ${names}. Primero pregunta al paciente con cual doctor desea agendar y llama select_doctor.` };
  }
  return { doctorId: null };
}

// ============================================================
// Tool: select_doctor
// ============================================================
export async function executeSelectDoctor(tenant: Tenant, args: { doctor_name: string }): Promise<ToolCallResult> {
  const ctx = currentCtx();
  const searchName = sanitizeString(args.doctor_name, 200).toLowerCase();
  if (!searchName) return { tool: 'select_doctor', success: false, result: {}, error: 'Nombre del doctor no proporcionado.' };
  if (ctx.doctors.length === 0) return { tool: 'select_doctor', success: false, result: {}, error: 'No hay doctores configurados para este consultorio.' };

  let matched = ctx.doctors.find(d => d.name.toLowerCase().includes(searchName));
  if (!matched) {
    const searchWords = searchName.split(/\s+/);
    matched = ctx.doctors.find(d => { const n = d.name.toLowerCase(); return searchWords.every(w => n.includes(w)); });
  }
  if (!matched) {
    matched = ctx.doctors.find(d => { const nw = d.name.toLowerCase().split(/\s+/); return nw.some(w => w.startsWith(searchName) || searchName.startsWith(w)); });
  }

  if (!matched) {
    const available = ctx.doctors.map(d => `- ${d.name}${d.specialty ? ` (${d.specialty})` : ''}`).join('\n');
    return { tool: 'select_doctor', success: false, result: { available_doctors: ctx.doctors.map(d => ({ id: d.id, name: d.name, specialty: d.specialty })) }, error: `No se encontro un doctor con el nombre "${args.doctor_name}". Doctores disponibles:\n${available}` };
  }

  if (ctx.conversationId) {
    try {
      await db.update(conversations).set({ doctorId: matched.id, updatedAt: new Date() }).where(eq(conversations.id, ctx.conversationId));
    } catch (e) { console.error('[select_doctor] failed to persist:', e); }
  }
  // Mutating the active ALS frame so subsequent tool calls in the SAME
  // execution see this selection. Cross-tenant isolation is preserved
  // because every parallel worker job runs in its own ALS frame.
  currentCtx().selectedDoctor = matched;

  const schedSummary = matched.schedule
    ? Object.entries(matched.schedule as Record<string, any>).filter(([, v]) => v?.enabled).map(([day, v]: [string, any]) => `${day}: ${v.start}-${v.end}`).join(', ')
    : 'Usa horarios del consultorio';

  return {
    tool: 'select_doctor', success: true,
    result: { doctor_id: matched.id, doctor_name: matched.name, specialty: matched.specialty || 'General', consultation_fee: matched.consultationFee, consultation_duration_min: matched.consultationDurationMin || 30, schedule_summary: schedSummary, message: `Doctor seleccionado: ${matched.name}${matched.specialty ? ` - ${matched.specialty}` : ''}` },
  };
}

// ============================================================
// Tool: check_availability
// ============================================================
export async function executeCheckAvailability(tenant: Tenant, args: { date: string; time?: string; duration_min?: number; doctor_id?: string }): Promise<ToolCallResult> {
  const { date, time, duration_min = 30 } = args;
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { tool: 'check_availability', success: false, result: {}, error: 'Formato de fecha invalido. Debe ser YYYY-MM-DD.' };
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) return { tool: 'check_availability', success: false, result: { available: false }, error: 'No se pueden agendar citas en fechas pasadas.' };

    const { doctorId, error: doctorError } = resolveDoctor(args);
    if (doctorError) return { tool: 'check_availability', success: false, result: {}, error: doctorError };
    const doctor = doctorId ? currentCtx().doctors.find(d => d.id === doctorId) : null;

    if (time) {
      const scheduleCheck = isWithinSchedule(tenant, date, time, doctor);
      if (!scheduleCheck.valid) return { tool: 'check_availability', success: true, result: { available: false, reason: scheduleCheck.reason, business_hours: formatBusinessHoursForDay(tenant, date, doctor) } };

      const doctorFilter = doctorId ? sql` AND doctor_id = ${doctorId}::uuid` : sql``;
      const rows = await withTenant(tenant.id, async (tx) => {
        return await tx.execute(sql`
          SELECT id FROM appointments
          WHERE tenant_id = ${tenant.id}::uuid AND date = ${date}::date AND status IN ('scheduled', 'confirmed') ${doctorFilter}
            AND ((start_time <= ${time}::time AND end_time > ${time}::time) OR (start_time < ${addMinutes(time, duration_min)}::time AND end_time >= ${addMinutes(time, duration_min)}::time) OR (start_time >= ${time}::time AND end_time <= ${addMinutes(time, duration_min)}::time))
        `);
      });
      const conflicts: any[] = Array.isArray(rows) ? rows : (rows as any)?.rows ?? [];
      if (conflicts.length > 0) {
        const alternatives = await getAvailableSlotsForDay(tenant, date, duration_min, doctorId);
        return { tool: 'check_availability', success: true, result: { available: false, requested_time: time, reason: 'Ese horario ya esta ocupado', alternative_slots: alternatives.slice(0, 5), business_hours: formatBusinessHoursForDay(tenant, date, doctor), ...(doctor ? { doctor_name: doctor.name } : {}) } };
      }
      return { tool: 'check_availability', success: true, result: { available: true, date, time, duration_min, ...(doctor ? { doctor_name: doctor.name, doctor_id: doctorId } : {}) } };
    }

    const slots = await getAvailableSlotsForDay(tenant, date, duration_min, doctorId);
    return { tool: 'check_availability', success: true, result: { date, available_slots: slots, business_hours: formatBusinessHoursForDay(tenant, date, doctor), ...(doctor ? { doctor_name: doctor.name, doctor_id: doctorId } : {}) } };
  } catch (err) {
    return { tool: 'check_availability', success: false, result: {}, error: (err as Error).message };
  }
}

// ============================================================
// Tool: create_appointment
// ============================================================
export async function executeCreateAppointment(tenant: Tenant, args: { patient_name: string; patient_phone: string; patient_email?: string; date: string; time: string; duration_min?: number; reason: string; doctor_id?: string }): Promise<ToolCallResult> {
  const patient_name = sanitizeString(args.patient_name, 200);
  const patient_phone = sanitizePhone(args.patient_phone);
  const patient_email = args.patient_email ? sanitizeString(args.patient_email, 254) : undefined;
  const date = String(args.date || '');
  const time = String(args.time || '');
  const duration_min = clampDuration(args.duration_min);
  const reason = sanitizeString(args.reason, 500);

  try {
    if (!patient_phone) return { tool: 'create_appointment', success: false, result: {}, error: 'Telefono invalido.' };
    if (!isValidDate(date)) return { tool: 'create_appointment', success: false, result: {}, error: 'Fecha invalida. Formato esperado: YYYY-MM-DD' };
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) return { tool: 'create_appointment', success: false, result: {}, error: 'Hora invalida. Formato esperado: HH:MM' };

    const { doctorId, error: doctorError } = resolveDoctor(args);
    if (doctorError) return { tool: 'create_appointment', success: false, result: {}, error: doctorError };
    const doctor = doctorId ? currentCtx().doctors.find(d => d.id === doctorId) : null;

    const timeNormalized = time.length === 5 ? `${time}:00` : time;
    const endTime = addMinutes(timeNormalized, duration_min);
    const phoneNormalized = patient_phone.replace(/\D/g, '');
    const config = (tenant.config ?? {}) as Record<string, any>;
    const consultationFee = doctor?.consultationFee ?? config.medical?.consultation_fee ?? null;

    const doctorFilter = doctorId ? sql` AND a.doctor_id = ${doctorId}::uuid` : sql``;
    const existing = await withTenant(tenant.id, async (tx) => {
      return await tx.execute(sql`
        SELECT a.id, a.status FROM appointments a JOIN patients p ON p.id = a.patient_id
        WHERE a.tenant_id = ${tenant.id}::uuid AND REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g') = ${phoneNormalized}
          AND a.date = ${date}::date AND a.start_time = ${timeNormalized}::time AND a.status IN ('scheduled', 'confirmed') ${doctorFilter}
        LIMIT 1
      `);
    });
    const existingRows: any[] = Array.isArray(existing) ? existing : (existing as any)?.rows ?? [];
    if (existingRows.length > 0) return { tool: 'create_appointment', success: true, result: { appointment_id: existingRows[0].id, is_duplicate: true, message: 'Ya tienes una cita agendada para esa fecha y hora', date, time, status: existingRows[0].status } };

    const scheduleCheck = isWithinSchedule(tenant, date, timeNormalized.slice(0, 5), doctor);
    if (!scheduleCheck.valid) return { tool: 'create_appointment', success: false, result: {}, error: scheduleCheck.reason };

    const conflicts = await withTenant(tenant.id, async (tx) => {
      return await tx.execute(sql`
        SELECT id FROM appointments
        WHERE tenant_id = ${tenant.id}::uuid AND date = ${date}::date AND status IN ('scheduled', 'confirmed') ${doctorFilter}
          AND ((start_time <= ${timeNormalized}::time AND end_time > ${timeNormalized}::time) OR (start_time < ${endTime}::time AND end_time >= ${endTime}::time) OR (start_time >= ${timeNormalized}::time AND end_time <= ${endTime}::time))
        LIMIT 1
      `);
    });
    const conflictRows: any[] = Array.isArray(conflicts) ? conflicts : (conflicts as any)?.rows ?? [];
    if (conflictRows.length > 0) return { tool: 'create_appointment', success: false, result: {}, error: 'El horario seleccionado ya esta ocupado.' };

    const doctorIdVal = doctorId || null;
    const doctorNameForNotif = doctor?.name || '';

    const appointmentId = await withTenant(tenant.id, async (tx) => {
      const upsertPatient: any = await tx.execute(sql`
        INSERT INTO patients (tenant_id, name, phone, email) VALUES (${tenant.id}::uuid, ${patient_name}, ${patient_phone}, ${patient_email ?? null})
        ON CONFLICT (tenant_id, phone) DO UPDATE SET name = EXCLUDED.name, email = COALESCE(EXCLUDED.email, patients.email), updated_at = now()
        RETURNING id
      `);
      const patientRows: any[] = Array.isArray(upsertPatient) ? upsertPatient : upsertPatient?.rows ?? [];
      const patientId = patientRows[0]?.id;
      if (!patientId) throw new Error('Patient upsert failed');

      const insertAppt: any = await tx.execute(sql`
        INSERT INTO appointments (tenant_id, patient_id, doctor_id, date, start_time, end_time, status, reason, consultation_fee)
        VALUES (${tenant.id}::uuid, ${patientId}::uuid, ${doctorIdVal}::uuid, ${date}::date, ${timeNormalized}::time, ${endTime}::time, 'scheduled', ${reason.slice(0, 500)}, ${consultationFee})
        RETURNING id
      `);
      const apptRows: any[] = Array.isArray(insertAppt) ? insertAppt : insertAppt?.rows ?? [];
      const apptId = apptRows[0]?.id;
      if (!apptId) throw new Error('Appointment insert failed');

      await tx.execute(sql`
        INSERT INTO appointment_events (appointment_id, tenant_id, event_type, metadata)
        VALUES (${apptId}::uuid, ${tenant.id}::uuid, 'created_via_whatsapp', ${JSON.stringify({ source: 'whatsapp_bot', patient_phone: phoneNormalized, reason, doctor_id: doctorIdVal, doctor_name: doctorNameForNotif })}::jsonb)
      `);

      try {
        const notifMsg = doctorNameForNotif ? `${patient_name} agendo cita con ${doctorNameForNotif} el ${date} a las ${time}` : `${patient_name} agendo cita el ${date} a las ${time}`;
        await tx.execute(sql`INSERT INTO notifications (tenant_id, type, title, message) VALUES (${tenant.id}::uuid, 'new_appointment', 'Nueva cita agendada', ${notifMsg})`);
      } catch { /* non-fatal */ }

      return apptId;
    });

    return { tool: 'create_appointment', success: true, result: { appointment_id: appointmentId, patient_name, date, time, duration_min, reason, consultation_fee: consultationFee, ...(doctor ? { doctor_name: doctor.name, doctor_id: doctorId } : {}), message: doctor ? `Cita agendada exitosamente con ${doctor.name}` : 'Cita agendada exitosamente' } };
  } catch (err) {
    return { tool: 'create_appointment', success: false, result: {}, error: (err as Error).message };
  }
}

// ============================================================
// Tool: get_consultation_info
// ============================================================
export async function executeGetConsultationInfo(tenant: Tenant, args: { topic?: string }): Promise<ToolCallResult> {
  const config = (tenant.config ?? {}) as Record<string, any>;
  const contact = config.contact ?? {};
  const medical = config.medical ?? {};
  const schedule = config.schedule ?? {};
  const { topic = 'all' } = args;
  const ctx = currentCtx();

  const allInfo: Record<string, any> = {
    name: tenant.name, specialty: medical.specialty, doctor: medical.doctor ?? tenant.name,
    address: contact.address, phone: contact.phone, email: contact.email,
    consultation_fee: medical.consultation_fee ? `${medical.consultation_fee} MXN` : null,
    consultation_duration_min: medical.consultation_duration_min ?? 30,
    schedule: Object.entries(schedule).filter(([, v]: [string, any]) => v?.enabled).reduce((acc, [day, v]: [string, any]) => { acc[day] = `${v.start}-${v.end}`; return acc; }, {} as Record<string, string>),
  };
  if (ctx.doctors.length > 1) allInfo.doctors = ctx.doctors.map(d => ({ name: d.name, specialty: d.specialty || 'General', fee: d.consultationFee }));

  let result: any = allInfo;
  switch (topic) {
    case 'location': result = { address: allInfo.address }; break;
    case 'hours': result = { schedule: allInfo.schedule }; break;
    case 'fees': result = { consultation_fee: allInfo.consultation_fee, duration_min: allInfo.consultation_duration_min }; break;
    case 'payment_methods': {
      // Real config from tenant.config.payment_methods (or .business / .features).
      // Falls back to a neutral list of common methods if the tenant hasn't
      // declared anything yet — never a meta-instruction string that could
      // leak into the bot reply.
      const declared = config.payment_methods ?? config.medical?.payment_methods ?? null;
      const fallback = ['Efectivo', 'Tarjeta de débito/crédito', 'Transferencia SPEI'];
      result = {
        accepted: Array.isArray(declared) && declared.length > 0 ? declared : fallback,
        accepts_insurance: Boolean(medical.accepts_insurance),
        insurance_providers: Array.isArray(medical.insurance_providers) ? medical.insurance_providers : [],
        online_payment_enabled: Boolean(config.features?.online_payment),
      };
      break;
    }
    case 'contact': result = { phone: allInfo.phone, email: allInfo.email, address: allInfo.address }; break;
  }
  return { tool: 'get_consultation_info', success: true, result };
}

// ============================================================
// Tool: escalate_to_human
// ============================================================
export async function executeEscalateToHuman(tenant: Tenant, args: { reason: string; urgency: 'low' | 'medium' | 'high' | 'emergency'; patient_message?: string }): Promise<ToolCallResult> {
  const reason = sanitizeString(args.reason, 500);
  const urgency = ['low', 'medium', 'high', 'emergency'].includes(args.urgency) ? args.urgency : 'low';
  const patient_message = sanitizeString(args.patient_message || '', 200);
  try {
    await withTenant(tenant.id, async (tx) => {
      await tx.execute(sql`INSERT INTO notifications (tenant_id, type, title, message) VALUES (${tenant.id}::uuid, ${urgency === 'emergency' ? 'urgent_escalation' : 'human_escalation'}, ${urgency === 'emergency' ? 'Escalacion URGENTE' : 'Escalacion a humano'}, ${`Urgencia: ${urgency}. Motivo: ${reason}${patient_message ? `. Msg: ${patient_message.slice(0, 200)}` : ''}`})`);
    });
    const msg = urgency === 'emergency' ? 'Llama al 911 o acude a urgencias. La doctora ha sido notificada.' : urgency === 'high' ? 'He notificado a la doctora, se pondran en contacto a la brevedad.' : 'He notificado a la doctora. Contacto en horario de atencion.';
    return { tool: 'escalate_to_human', success: true, result: { escalated: true, urgency, notification_sent: true, message_to_patient: msg } };
  } catch (err) {
    return { tool: 'escalate_to_human', success: false, result: {}, error: (err as Error).message };
  }
}

// ============================================================
// Tool: confirm_appointment
// ============================================================
export async function executeConfirmAppointment(tenant: Tenant, args: { appointment_id?: string; patient_phone: string }): Promise<ToolCallResult> {
  const appointment_id = args.appointment_id && isValidUUID(args.appointment_id) ? args.appointment_id : undefined;
  const phoneNormalized = sanitizePhone(args.patient_phone);
  try {
    let apptId = appointment_id;
    if (!apptId) {
      const result = await withTenant(tenant.id, async (tx) => {
        return await tx.execute(sql`SELECT a.id FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE a.tenant_id = ${tenant.id}::uuid AND LENGTH(${phoneNormalized}) >= 7 AND RIGHT(REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g'), 10) = RIGHT(${phoneNormalized}, 10) AND a.status IN ('scheduled', 'confirmed') AND (a.date > CURRENT_DATE OR (a.date = CURRENT_DATE AND a.start_time > CURRENT_TIME)) ORDER BY a.date, a.start_time LIMIT 1`);
      });
      const rows: any[] = Array.isArray(result) ? result : (result as any)?.rows ?? [];
      if (rows.length === 0) return { tool: 'confirm_appointment', success: false, result: {}, error: 'No se encontro una cita proxima para este paciente.' };
      apptId = rows[0].id;
    }
    await withTenant(tenant.id, async (tx) => {
      await tx.execute(sql`UPDATE appointments SET status = 'confirmed', confirmed_by_patient = true, confirmed_at = NOW() WHERE id = ${apptId}::uuid AND tenant_id = ${tenant.id}::uuid`);
      await tx.execute(sql`INSERT INTO appointment_events (appointment_id, tenant_id, event_type, metadata) VALUES (${apptId}::uuid, ${tenant.id}::uuid, 'confirmed_by_patient', ${JSON.stringify({ source: 'whatsapp_reply', phone: phoneNormalized })}::jsonb)`);
      try { await tx.execute(sql`INSERT INTO notifications (tenant_id, type, title, message) VALUES (${tenant.id}::uuid, 'appointment_confirmed', 'Cita confirmada', ${'Paciente ' + phoneNormalized + ' confirmo su cita'})`); } catch { /* non-fatal */ }
    });
    return { tool: 'confirm_appointment', success: true, result: { appointment_id: apptId, status: 'confirmed', message: 'Cita confirmada exitosamente' } };
  } catch (err) {
    return { tool: 'confirm_appointment', success: false, result: {}, error: (err as Error).message };
  }
}

// ============================================================
// Tool: cancel_appointment
// ============================================================
export async function executeCancelAppointment(tenant: Tenant, args: { appointment_id?: string; patient_phone: string; reason?: string }): Promise<ToolCallResult> {
  const appointment_id = args.appointment_id && isValidUUID(args.appointment_id) ? args.appointment_id : undefined;
  const reason = args.reason ? sanitizeString(args.reason, 500) : undefined;
  const phoneNormalized = sanitizePhone(args.patient_phone);
  try {
    let apptId = appointment_id;
    if (!apptId) {
      const result = await withTenant(tenant.id, async (tx) => {
        return await tx.execute(sql`SELECT a.id FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE a.tenant_id = ${tenant.id}::uuid AND LENGTH(${phoneNormalized}) >= 7 AND RIGHT(REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g'), 10) = RIGHT(${phoneNormalized}, 10) AND a.status IN ('scheduled', 'confirmed') AND (a.date > CURRENT_DATE OR (a.date = CURRENT_DATE AND a.start_time > CURRENT_TIME)) ORDER BY a.date, a.start_time LIMIT 1`);
      });
      const rows: any[] = Array.isArray(result) ? result : (result as any)?.rows ?? [];
      if (rows.length === 0) return { tool: 'cancel_appointment', success: false, result: {}, error: 'No se encontro una cita proxima para este paciente.' };
      apptId = rows[0].id;
    }
    await withTenant(tenant.id, async (tx) => {
      await tx.execute(sql`UPDATE appointments SET status = 'cancelled', cancelled_at = NOW() WHERE id = ${apptId}::uuid AND tenant_id = ${tenant.id}::uuid`);
      await tx.execute(sql`INSERT INTO appointment_events (appointment_id, tenant_id, event_type, metadata) VALUES (${apptId}::uuid, ${tenant.id}::uuid, 'cancelled_by_patient', ${JSON.stringify({ source: 'whatsapp_reply', phone: phoneNormalized, reason: reason || '' })}::jsonb)`);
      try { await tx.execute(sql`INSERT INTO notifications (tenant_id, type, title, message) VALUES (${tenant.id}::uuid, 'appointment_cancelled', 'Cita cancelada', ${'Paciente ' + phoneNormalized + ' cancelo su cita' + (reason ? '. Motivo: ' + reason : '')})`); } catch { /* non-fatal */ }
    });
    return { tool: 'cancel_appointment', success: true, result: { appointment_id: apptId, status: 'cancelled', message: 'Cita cancelada. Horario liberado.' } };
  } catch (err) {
    return { tool: 'cancel_appointment', success: false, result: {}, error: (err as Error).message };
  }
}

// ============================================================
// Dispatcher
// ============================================================
export async function executeToolCall(tenant: Tenant, toolName: string, args: Record<string, any>): Promise<ToolCallResult> {
  switch (toolName) {
    case 'select_doctor': return executeSelectDoctor(tenant, args as any);
    case 'check_availability': return executeCheckAvailability(tenant, args as any);
    case 'create_appointment': return executeCreateAppointment(tenant, args as any);
    case 'get_consultation_info': return executeGetConsultationInfo(tenant, args as any);
    case 'escalate_to_human': return executeEscalateToHuman(tenant, args as any);
    case 'confirm_appointment': return executeConfirmAppointment(tenant, args as any);
    case 'cancel_appointment': return executeCancelAppointment(tenant, args as any);
    default: return { tool: toolName as any, success: false, result: {}, error: `Unknown tool: ${toolName}` };
  }
}
