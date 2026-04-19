/**
 * Tool executors — implementan la lógica de cada tool del function calling.
 * Cada executor wrapea con withTenant() para que RLS permita operaciones.
 */
import { db, withTenant, type Tenant } from '@quote-engine/db';
import { sql } from 'drizzle-orm';
import type { ToolCallResult } from './tools';

const TZ = 'America/Monterrey';
// ============================================================
// Input Sanitization (H-4)
// ============================================================
function sanitizeString(s: unknown, maxLen = 500): string {
  if (typeof s !== 'string') return '';
  return s.slice(0, maxLen).replace(/<[^>]*>/g, '').trim();
}

function isValidDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isValidTime(s: unknown): s is string {
  return typeof s === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(s);
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
  if (isNaN(val) || val < min) return 30; // default
  return Math.min(val, max);
}


// ============================================================
// Helpers
// ============================================================
function addMinutes(timeStr: string, minutes: number): string {
  // timeStr HH:MM or HH:MM:SS
  const [h, m, s = '00'] = timeStr.split(':');
  const totalMin = parseInt(h, 10) * 60 + parseInt(m, 10) + minutes;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:${s}`;
}

function isWithinSchedule(
  tenant: Tenant,
  date: string,
  time: string
): { valid: boolean; reason?: string } {
  const config = (tenant.config ?? {}) as Record<string, any>;
  const schedule = config.schedule;
  if (!schedule || typeof schedule !== 'object') {
    return { valid: true }; // no schedule defined — permissive
  }
  const dow = new Date(date + 'T12:00:00-06:00')
    .toLocaleDateString('en-US', { weekday: 'long', timeZone: TZ })
    .toLowerCase();
  const dayConfig = schedule[dow];
  if (!dayConfig?.enabled) {
    return { valid: false, reason: `El consultorio no atiende los ${dow}` };
  }
  if (dayConfig.start && dayConfig.end) {
    if (time < dayConfig.start || time >= dayConfig.end) {
      return {
        valid: false,
        reason: `El horario ${time} está fuera del horario de atención (${dayConfig.start}-${dayConfig.end})`,
      };
    }
  }
  return { valid: true };
}

function formatBusinessHoursForDay(tenant: Tenant, date: string): string {
  const config = (tenant.config ?? {}) as Record<string, any>;
  const schedule = config.schedule;
  const dow = new Date(date + 'T12:00:00-06:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    timeZone: TZ,
  });
  const dowKey = new Date(date + 'T12:00:00-06:00')
    .toLocaleDateString('en-US', { weekday: 'long', timeZone: TZ })
    .toLowerCase();
  const dayConfig = schedule?.[dowKey];
  if (!dayConfig?.enabled) return `${dow}: cerrado`;
  return `${dow}: ${dayConfig.start} - ${dayConfig.end}`;
}

async function getAvailableSlotsForDay(
  tenant: Tenant,
  date: string,
  duration_min: number
): Promise<string[]> {
  const config = (tenant.config ?? {}) as Record<string, any>;
  const schedule = config.schedule;
  const dow = new Date(date + 'T12:00:00-06:00')
    .toLocaleDateString('en-US', { weekday: 'long', timeZone: TZ })
    .toLowerCase();
  const dayConfig = schedule?.[dow];
  if (!dayConfig?.enabled || !dayConfig.start || !dayConfig.end) return [];

  const busy = await withTenant(tenant.id, async (tx) => {
    return await tx.execute(sql`
      SELECT start_time::text as start_time, end_time::text as end_time
      FROM appointments
      WHERE tenant_id = ${tenant.id}::uuid
        AND date = ${date}::date
        AND status IN ('scheduled', 'confirmed')
      ORDER BY start_time
    `);
  });
  const busyRows: any[] = Array.isArray(busy) ? busy : (busy as any)?.rows ?? [];
  const busySlots = busyRows.map((r) => ({
    start: String(r.start_time).slice(0, 5),
    end: String(r.end_time).slice(0, 5),
  }));

  const slots: string[] = [];
  let cur = dayConfig.start;
  while (cur < dayConfig.end) {
    const slotEnd = addMinutes(cur, duration_min).slice(0, 5);
    if (slotEnd > dayConfig.end) break;
    const overlap = busySlots.some(
      (b) => !(slotEnd <= b.start || cur >= b.end)
    );
    if (!overlap) slots.push(cur);
    cur = addMinutes(cur, duration_min).slice(0, 5);
  }
  return slots;
}

// ============================================================
// Tool: check_availability
// ============================================================
export async function executeCheckAvailability(
  tenant: Tenant,
  args: { date: string; time?: string; duration_min?: number }
): Promise<ToolCallResult> {
  const { date, time, duration_min = 30 } = args;

  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        tool: 'check_availability',
        success: false,
        result: {},
        error: 'Formato de fecha inválido. Debe ser YYYY-MM-DD.',
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    if (date < today) {
      return {
        tool: 'check_availability',
        success: false,
        result: { available: false, reason: 'Fecha en el pasado' },
        error: 'No se pueden agendar citas en fechas pasadas.',
      };
    }

    if (time) {
      const scheduleCheck = isWithinSchedule(tenant, date, time);
      if (!scheduleCheck.valid) {
        return {
          tool: 'check_availability',
          success: true,
          result: {
            available: false,
            reason: scheduleCheck.reason,
            business_hours: formatBusinessHoursForDay(tenant, date),
          },
        };
      }

      const rows = await withTenant(tenant.id, async (tx) => {
        return await tx.execute(sql`
          SELECT id, start_time, end_time
          FROM appointments
          WHERE tenant_id = ${tenant.id}::uuid
            AND date = ${date}::date
            AND status IN ('scheduled', 'confirmed')
            AND (
              (start_time <= ${time}::time AND end_time > ${time}::time)
              OR (start_time < ${addMinutes(time, duration_min)}::time AND end_time >= ${addMinutes(time, duration_min)}::time)
              OR (start_time >= ${time}::time AND end_time <= ${addMinutes(time, duration_min)}::time)
            )
        `);
      });

      const conflicts: any[] = Array.isArray(rows) ? rows : (rows as any)?.rows ?? [];

      if (conflicts.length > 0) {
        const alternatives = await getAvailableSlotsForDay(tenant, date, duration_min);
        return {
          tool: 'check_availability',
          success: true,
          result: {
            available: false,
            requested_time: time,
            reason: 'Ese horario ya está ocupado',
            alternative_slots: alternatives.slice(0, 5),
            business_hours: formatBusinessHoursForDay(tenant, date),
          },
        };
      }

      return {
        tool: 'check_availability',
        success: true,
        result: { available: true, date, time, duration_min },
      };
    }

    const slots = await getAvailableSlotsForDay(tenant, date, duration_min);
    return {
      tool: 'check_availability',
      success: true,
      result: {
        date,
        available_slots: slots,
        business_hours: formatBusinessHoursForDay(tenant, date),
      },
    };
  } catch (err) {
    return {
      tool: 'check_availability',
      success: false,
      result: {},
      error: (err as Error).message,
    };
  }
}

// ============================================================
// Tool: create_appointment
// ============================================================
export async function executeCreateAppointment(
  tenant: Tenant,
  args: {
    patient_name: string;
    patient_phone: string;
    patient_email?: string;
    date: string;
    time: string;
    duration_min?: number;
    reason: string;
  }
): Promise<ToolCallResult> {
  const patient_name = sanitizeString(args.patient_name, 200);
  const patient_phone = sanitizePhone(args.patient_phone);
  const patient_email = args.patient_email ? sanitizeString(args.patient_email, 254) : undefined;
  const date = String(args.date || '');
  const time = String(args.time || '');
  const duration_min = clampDuration(args.duration_min);
  const reason = sanitizeString(args.reason, 500);

  try {
    if (!patient_phone) {
      return { tool: 'create_appointment', success: false, result: {}, error: 'Teléfono inválido.' };
    }
    if (!isValidDate(date)) {
      return {
        tool: 'create_appointment',
        success: false,
        result: {},
        error: 'Fecha inválida. Formato esperado: YYYY-MM-DD',
      };
    }
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
      return {
        tool: 'create_appointment',
        success: false,
        result: {},
        error: 'Hora inválida. Formato esperado: HH:MM',
      };
    }

    const timeNormalized = time.length === 5 ? `${time}:00` : time;
    const endTime = addMinutes(timeNormalized, duration_min);
    const phoneNormalized = patient_phone.replace(/\D/g, '');
    const config = (tenant.config ?? {}) as Record<string, any>;
    const consultationFee = config.medical?.consultation_fee ?? null;

    // Idempotency check
    const existing = await withTenant(tenant.id, async (tx) => {
      return await tx.execute(sql`
        SELECT a.id, a.date, a.start_time::text, a.status
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        WHERE a.tenant_id = ${tenant.id}::uuid
          AND REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g') = ${phoneNormalized}
          AND a.date = ${date}::date
          AND a.start_time = ${timeNormalized}::time
          AND a.status IN ('scheduled', 'confirmed')
        LIMIT 1
      `);
    });
    const existingRows: any[] = Array.isArray(existing) ? existing : (existing as any)?.rows ?? [];
    if (existingRows.length > 0) {
      return {
        tool: 'create_appointment',
        success: true,
        result: {
          appointment_id: existingRows[0].id,
          is_duplicate: true,
          message: 'Ya tienes una cita agendada para esa fecha y hora',
          date,
          time,
          status: existingRows[0].status,
        },
      };
    }

    const scheduleCheck = isWithinSchedule(tenant, date, timeNormalized.slice(0, 5));
    if (!scheduleCheck.valid) {
      return {
        tool: 'create_appointment',
        success: false,
        result: {},
        error: scheduleCheck.reason,
      };
    }

    const conflicts = await withTenant(tenant.id, async (tx) => {
      return await tx.execute(sql`
        SELECT id FROM appointments
        WHERE tenant_id = ${tenant.id}::uuid
          AND date = ${date}::date
          AND status IN ('scheduled', 'confirmed')
          AND (
            (start_time <= ${timeNormalized}::time AND end_time > ${timeNormalized}::time)
            OR (start_time < ${endTime}::time AND end_time >= ${endTime}::time)
            OR (start_time >= ${timeNormalized}::time AND end_time <= ${endTime}::time)
          )
        LIMIT 1
      `);
    });
    const conflictRows: any[] = Array.isArray(conflicts) ? conflicts : (conflicts as any)?.rows ?? [];
    if (conflictRows.length > 0) {
      return {
        tool: 'create_appointment',
        success: false,
        result: {},
        error: 'El horario seleccionado ya está ocupado. Por favor selecciona otro.',
      };
    }

    const appointmentId = await withTenant(tenant.id, async (tx) => {
      const upsertPatient: any = await tx.execute(sql`
        INSERT INTO patients (tenant_id, name, phone, email)
        VALUES (${tenant.id}::uuid, ${patient_name}, ${patient_phone}, ${patient_email ?? null})
        ON CONFLICT (tenant_id, phone)
        DO UPDATE SET
          name = EXCLUDED.name,
          email = COALESCE(EXCLUDED.email, patients.email),
          updated_at = now()
        RETURNING id
      `);
      const patientRows: any[] = Array.isArray(upsertPatient) ? upsertPatient : upsertPatient?.rows ?? [];
      const patientId = patientRows[0]?.id;
      if (!patientId) throw new Error('Patient upsert failed');

      const insertAppt: any = await tx.execute(sql`
        INSERT INTO appointments (
          tenant_id, patient_id, date, start_time, end_time,
          status, reason, consultation_fee
        )
        VALUES (
          ${tenant.id}::uuid, ${patientId}::uuid, ${date}::date,
          ${timeNormalized}::time, ${endTime}::time,
          'scheduled', ${reason.slice(0, 500)}, ${consultationFee}
        )
        RETURNING id
      `);
      const apptRows: any[] = Array.isArray(insertAppt) ? insertAppt : insertAppt?.rows ?? [];
      const apptId = apptRows[0]?.id;
      if (!apptId) throw new Error('Appointment insert failed');

      await tx.execute(sql`
        INSERT INTO appointment_events (
          appointment_id, tenant_id, event_type, metadata
        )
        VALUES (
          ${apptId}::uuid, ${tenant.id}::uuid,
          'created_via_whatsapp',
          ${JSON.stringify({
            source: 'whatsapp_bot',
            patient_phone: phoneNormalized,
            reason,
          })}::jsonb
        )
      `);

      // C-4: Notification inside withTenant transaction
      try {
        await tx.execute(sql`
          INSERT INTO notifications (tenant_id, type, title, message)
          VALUES (
            ${tenant.id}::uuid, 'new_appointment',
            'Nueva cita agendada',
            ${`${patient_name} agendó cita el ${date} a las ${time} — Motivo: ${reason.slice(0, 100)}`}
          )
        `);
      } catch { /* notification errors are non-fatal */ }

      return apptId;
    });

    return {
      tool: 'create_appointment',
      success: true,
      result: {
        appointment_id: appointmentId,
        patient_name,
        date,
        time,
        duration_min,
        reason,
        consultation_fee: consultationFee,
        message: 'Cita agendada exitosamente',
      },
    };
  } catch (err) {
    return {
      tool: 'create_appointment',
      success: false,
      result: {},
      error: (err as Error).message,
    };
  }
}

// ============================================================
// Tool: get_consultation_info
// ============================================================
export async function executeGetConsultationInfo(
  tenant: Tenant,
  args: { topic?: string }
): Promise<ToolCallResult> {
  const config = (tenant.config ?? {}) as Record<string, any>;
  const contact = config.contact ?? {};
  const medical = config.medical ?? {};
  const schedule = config.schedule ?? {};

  const { topic = 'all' } = args;

  const allInfo = {
    name: tenant.name,
    specialty: medical.specialty,
    doctor: medical.doctor ?? tenant.name,
    address: contact.address,
    phone: contact.phone,
    email: contact.email,
    consultation_fee: medical.consultation_fee ? `${medical.consultation_fee} MXN` : null,
    consultation_duration_min: medical.consultation_duration_min ?? 30,
    schedule: Object.entries(schedule)
      .filter(([, v]: [string, any]) => v?.enabled)
      .reduce((acc, [day, v]: [string, any]) => {
        acc[day] = `${v.start}-${v.end}`;
        return acc;
      }, {} as Record<string, string>),
    accepts_insurance: medical.accepts_insurance ?? false,
    insurance_providers: medical.insurance_providers ?? [],
  };

  let result: any = allInfo;
  switch (topic) {
    case 'location':
      result = { address: allInfo.address };
      break;
    case 'hours':
      result = { schedule: allInfo.schedule };
      break;
    case 'fees':
      result = {
        consultation_fee: allInfo.consultation_fee,
        duration_min: allInfo.consultation_duration_min,
      };
      break;
    case 'payment_methods':
      result = { note: 'Revisar chunks RAG sobre formas de pago' };
      break;
    case 'contact':
      result = {
        phone: allInfo.phone,
        email: allInfo.email,
        address: allInfo.address,
      };
      break;
  }

  return {
    tool: 'get_consultation_info',
    success: true,
    result,
  };
}

// ============================================================
// Tool: escalate_to_human
// ============================================================
export async function executeEscalateToHuman(
  tenant: Tenant,
  args: {
    reason: string;
    urgency: 'low' | 'medium' | 'high' | 'emergency';
    patient_message?: string;
  }
): Promise<ToolCallResult> {
  const reason = sanitizeString(args.reason, 500);
  const urgency = ['low', 'medium', 'high', 'emergency'].includes(args.urgency) ? args.urgency : 'low';
  const patient_message = sanitizeString(args.patient_message || '', 200);

  try {
    // C-4: Notification inside withTenant transaction
    await withTenant(tenant.id, async (tx) => {
      await tx.execute(sql`
        INSERT INTO notifications (tenant_id, type, title, message)
        VALUES (
          ${tenant.id}::uuid,
          ${urgency === 'emergency' ? 'urgent_escalation' : 'human_escalation'},
          ${urgency === 'emergency' ? '🚨 Escalación URGENTE' : 'Escalación a humano'},
          ${`Urgencia: ${urgency}. Motivo: ${reason}${patient_message ? `. Mensaje original: ${patient_message.slice(0, 200)}` : ''}`}
        )
      `);
    });

    let messageToPatient = '';
    if (urgency === 'emergency') {
      messageToPatient =
        'Por favor, si es una emergencia médica llama al 911 inmediatamente o acude a urgencias. La doctora ha sido notificada de tu caso con prioridad.';
    } else if (urgency === 'high') {
      messageToPatient =
        'Entiendo que es algo importante. He notificado a la doctora y se pondrán en contacto contigo a la brevedad.';
    } else {
      messageToPatient =
        'He notificado a la doctora. Se pondrán en contacto contigo en horario de atención.';
    }

    return {
      tool: 'escalate_to_human',
      success: true,
      result: {
        escalated: true,
        urgency,
        notification_sent: true,
        message_to_patient: messageToPatient,
      },
    };
  } catch (err) {
    return {
      tool: 'escalate_to_human',
      success: false,
      result: {},
      error: (err as Error).message,
    };
  }
}


// ============================================================
// Tool: confirm_appointment
// ============================================================
export async function executeConfirmAppointment(
  tenant: Tenant,
  args: { appointment_id?: string; patient_phone: string }
): Promise<ToolCallResult> {
  const appointment_id = args.appointment_id && isValidUUID(args.appointment_id) ? args.appointment_id : undefined;
  const phoneNormalized = sanitizePhone(args.patient_phone);

  try {
    let apptId = appointment_id;

    if (!apptId) {
      const result = await withTenant(tenant.id, async (tx) => {
        return await tx.execute(sql`
          SELECT a.id
          FROM appointments a
          JOIN patients p ON p.id = a.patient_id
          WHERE a.tenant_id = ${tenant.id}::uuid
            AND REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g') LIKE '%' || ${phoneNormalized}
            AND a.status IN ('scheduled', 'confirmed')
            AND (a.date > CURRENT_DATE OR (a.date = CURRENT_DATE AND a.start_time > CURRENT_TIME))
          ORDER BY a.date, a.start_time
          LIMIT 1
        `);
      });
      const rows: any[] = Array.isArray(result) ? result : (result as any)?.rows ?? [];
      if (rows.length === 0) {
        return {
          tool: 'confirm_appointment',
          success: false,
          result: {},
          error: 'No se encontro una cita proxima para este paciente.',
        };
      }
      apptId = rows[0].id;
    }

    await withTenant(tenant.id, async (tx) => {
      await tx.execute(sql`
        UPDATE appointments
        SET status = 'confirmed',
            confirmed_by_patient = true,
            confirmed_at = NOW()
        WHERE id = ${apptId}::uuid
          AND tenant_id = ${tenant.id}::uuid
      `);

      await tx.execute(sql`
        INSERT INTO appointment_events (appointment_id, tenant_id, event_type, metadata)
        VALUES (
          ${apptId}::uuid, ${tenant.id}::uuid,
          'confirmed_by_patient',
          ${JSON.stringify({ source: 'whatsapp_reply', phone: phoneNormalized })}::jsonb
        )
      `);

      // C-4: Notification inside withTenant transaction
      try {
        await tx.execute(sql`
          INSERT INTO notifications (tenant_id, type, title, message)
          VALUES (
            ${tenant.id}::uuid, 'appointment_confirmed',
            'Cita confirmada por paciente',
            ${'Paciente ' + phoneNormalized + ' confirmo su cita'}
          )
        `);
      } catch { /* notification errors are non-fatal */ }
    });

    return {
      tool: 'confirm_appointment',
      success: true,
      result: {
        appointment_id: apptId,
        status: 'confirmed',
        message: 'Cita confirmada exitosamente',
      },
    };
  } catch (err) {
    return {
      tool: 'confirm_appointment',
      success: false,
      result: {},
      error: (err as Error).message,
    };
  }
}

// ============================================================
// Tool: cancel_appointment
// ============================================================
export async function executeCancelAppointment(
  tenant: Tenant,
  args: { appointment_id?: string; patient_phone: string; reason?: string }
): Promise<ToolCallResult> {
  const appointment_id = args.appointment_id && isValidUUID(args.appointment_id) ? args.appointment_id : undefined;
  const reason = args.reason ? sanitizeString(args.reason, 500) : undefined;
  const phoneNormalized = sanitizePhone(args.patient_phone);

  try {
    let apptId = appointment_id;

    if (!apptId) {
      const result = await withTenant(tenant.id, async (tx) => {
        return await tx.execute(sql`
          SELECT a.id
          FROM appointments a
          JOIN patients p ON p.id = a.patient_id
          WHERE a.tenant_id = ${tenant.id}::uuid
            AND REGEXP_REPLACE(p.phone, '[^0-9]', '', 'g') LIKE '%' || ${phoneNormalized}
            AND a.status IN ('scheduled', 'confirmed')
            AND (a.date > CURRENT_DATE OR (a.date = CURRENT_DATE AND a.start_time > CURRENT_TIME))
          ORDER BY a.date, a.start_time
          LIMIT 1
        `);
      });
      const rows: any[] = Array.isArray(result) ? result : (result as any)?.rows ?? [];
      if (rows.length === 0) {
        return {
          tool: 'cancel_appointment',
          success: false,
          result: {},
          error: 'No se encontro una cita proxima para este paciente.',
        };
      }
      apptId = rows[0].id;
    }

    await withTenant(tenant.id, async (tx) => {
      await tx.execute(sql`
        UPDATE appointments
        SET status = 'cancelled',
            cancelled_at = NOW()
        WHERE id = ${apptId}::uuid
          AND tenant_id = ${tenant.id}::uuid
      `);

      await tx.execute(sql`
        INSERT INTO appointment_events (appointment_id, tenant_id, event_type, metadata)
        VALUES (
          ${apptId}::uuid, ${tenant.id}::uuid,
          'cancelled_by_patient',
          ${JSON.stringify({ source: 'whatsapp_reply', phone: phoneNormalized, reason: reason || '' })}::jsonb
        )
      `);

      // C-4: Notification inside withTenant transaction
      try {
        await tx.execute(sql`
          INSERT INTO notifications (tenant_id, type, title, message)
          VALUES (
            ${tenant.id}::uuid, 'appointment_cancelled',
            'Cita cancelada por paciente',
            ${'Paciente ' + phoneNormalized + ' cancelo su cita' + (reason ? '. Motivo: ' + reason : '')}
          )
        `);
      } catch { /* notification errors are non-fatal */ }
    });

    return {
      tool: 'cancel_appointment',
      success: true,
      result: {
        appointment_id: apptId,
        status: 'cancelled',
        message: 'Cita cancelada. El horario ha sido liberado.',
      },
    };
  } catch (err) {
    return {
      tool: 'cancel_appointment',
      success: false,
      result: {},
      error: (err as Error).message,
    };
  }
}

// ============================================================
// Dispatcher
// ============================================================
export async function executeToolCall(
  tenant: Tenant,
  toolName: string,
  args: Record<string, any>
): Promise<ToolCallResult> {
  switch (toolName) {
    case 'check_availability':
      return executeCheckAvailability(tenant, args as any);
    case 'create_appointment':
      return executeCreateAppointment(tenant, args as any);
    case 'get_consultation_info':
      return executeGetConsultationInfo(tenant, args as any);
    case 'escalate_to_human':
      return executeEscalateToHuman(tenant, args as any);
    case 'confirm_appointment':
      return executeConfirmAppointment(tenant, args as any);
    case 'cancel_appointment':
      return executeCancelAppointment(tenant, args as any);
    default:
      return {
        tool: toolName as any,
        success: false,
        result: {},
        error: `Unknown tool: ${toolName}`,
      };
  }
}
