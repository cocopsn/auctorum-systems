export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { db, appointments, patients } from '@quote-engine/db'
import { authenticateApiKey, apiUnauthorized, apiForbidden, apiRateLimit } from '@/lib/api-auth'

const STATUS_VALUES = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'] as const

// ---------------------------------------------------------------------------
// GET /api/v1/appointments
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateApiKey(req)
    if (!auth) return apiUnauthorized()
    if (!auth.permissions.includes('read')) return apiForbidden('read')
    const rl = await apiRateLimit(auth.tenant.id, auth.tenant.plan)
    if (rl) return rl

    const sp = req.nextUrl.searchParams
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1)
    const perPage = Math.min(100, Math.max(1, parseInt(sp.get('per_page') ?? '20', 10) || 20))
    const status = sp.get('status')
    const dateFrom = sp.get('date_from')
    const dateTo = sp.get('date_to')

    const where = [eq(appointments.tenantId, auth.tenant.id)]
    if (status && (STATUS_VALUES as readonly string[]).includes(status)) {
      where.push(eq(appointments.status, status))
    }
    if (dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) where.push(gte(appointments.date, dateFrom))
    if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo)) where.push(lte(appointments.date, dateTo))

    const [rows, [{ count }]] = await Promise.all([
      db
        .select({
          id: appointments.id,
          patientId: appointments.patientId,
          patientName: patients.name,
          patientPhone: patients.phone,
          doctorId: appointments.doctorId,
          date: appointments.date,
          startTime: appointments.startTime,
          endTime: appointments.endTime,
          status: appointments.status,
          reason: appointments.reason,
          createdAt: appointments.createdAt,
        })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.id))
        .where(and(...where))
        .orderBy(desc(appointments.date), desc(appointments.startTime))
        .limit(perPage)
        .offset((page - 1) * perPage),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(appointments)
        .where(and(...where)),
    ])

    return NextResponse.json({
      data: rows,
      meta: { total: count, page, per_page: perPage },
    })
  } catch (err) {
    console.error('[GET /api/v1/appointments] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/appointments
// ---------------------------------------------------------------------------

const createSchema = z.object({
  patientId: z.string().uuid().optional(),
  // If patientId is omitted, server-side we look up / create by phone
  patientName: z.string().min(2).max(255).optional(),
  patientPhone: z
    .string()
    .min(8)
    .max(50)
    .regex(/^[+0-9\-\s()]+$/, 'Phone must be digits and +-() only')
    .optional(),
  doctorId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'startTime must be HH:MM[:SS]'),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'endTime must be HH:MM[:SS]').optional(),
  reason: z.string().max(500).optional(),
}).refine(
  (v) => !!v.patientId || (!!v.patientName && !!v.patientPhone),
  { message: 'Provide patientId, or patientName + patientPhone to create the patient' },
)

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateApiKey(req)
    if (!auth) return apiUnauthorized()
    if (!auth.permissions.includes('write')) return apiForbidden('write')
    const rl = await apiRateLimit(auth.tenant.id, auth.tenant.plan)
    if (rl) return rl

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const data = parsed.data

    // Resolve / create the patient
    let patientId = data.patientId
    if (!patientId) {
      // Look up by phone within the tenant
      const [existing] = await db
        .select({ id: patients.id })
        .from(patients)
        .where(and(eq(patients.tenantId, auth.tenant.id), eq(patients.phone, data.patientPhone!)))
        .limit(1)
      if (existing) {
        patientId = existing.id
      } else {
        const [created] = await db
          .insert(patients)
          .values({
            tenantId: auth.tenant.id,
            name: data.patientName!,
            phone: data.patientPhone!,
          })
          .returning({ id: patients.id })
        patientId = created.id
      }
    } else {
      // Verify the patientId belongs to this tenant
      const [owned] = await db
        .select({ id: patients.id })
        .from(patients)
        .where(and(eq(patients.id, patientId), eq(patients.tenantId, auth.tenant.id)))
        .limit(1)
      if (!owned) {
        return NextResponse.json({ error: 'patientId not found in tenant' }, { status: 404 })
      }
    }

    // Default endTime = startTime + 30 min if not provided
    const endTime = data.endTime ?? addMinutes(data.startTime, 30)

    const [created] = await db
      .insert(appointments)
      .values({
        tenantId: auth.tenant.id,
        patientId,
        doctorId: data.doctorId ?? null,
        date: data.date,
        startTime: data.startTime,
        endTime,
        reason: data.reason ?? null,
        status: 'scheduled',
      })
      .returning()

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/v1/appointments] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + minutes
  const newH = Math.floor(total / 60) % 24
  const newM = total % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}
