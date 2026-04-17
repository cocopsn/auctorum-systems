export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, lte, ilike, or, desc, sql } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { appointments, patients, appointmentEvents } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = auth.tenant.id

  const { searchParams } = request.nextUrl
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  try {
    const conditions = [eq(appointments.tenantId, tenantId)]

    if (startDate) conditions.push(gte(appointments.date, startDate))
    if (endDate) conditions.push(lte(appointments.date, endDate))
    if (status) conditions.push(eq(appointments.status, status))

    let query = db
      .select({
        id: appointments.id,
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
        reason: appointments.reason,
        consultationFee: appointments.consultationFee,
        paymentStatus: appointments.paymentStatus,
        confirmedByPatient: appointments.confirmedByPatient,
        createdAt: appointments.createdAt,
        patientName: patients.name,
        patientPhone: patients.phone,
        patientEmail: patients.email,
        patientId: patients.id,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .where(and(...conditions))
      .orderBy(desc(appointments.date), appointments.startTime)
      .limit(limit)
      .offset(offset)

    const results = await query

    // If search, filter client-side (simple approach for name/phone search)
    let filtered = results
    if (search) {
      const s = search.toLowerCase()
      filtered = results.filter(
        (r) =>
          r.patientName.toLowerCase().includes(s) ||
          r.patientPhone.includes(s)
      )
    }

    return NextResponse.json({ appointments: filtered, page, limit })
  } catch (error) {
    console.error('Dashboard appointments error:', error)
    return NextResponse.json({ error: 'Error fetching appointments' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = auth.tenant.id

  try {
    const patchSchema = z.object({
      appointmentId: z.string().uuid(),
      status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'no_show', 'cancelled']),
    });
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { appointmentId, status: newStatus } = parsed.data;

    if (false) {
      return NextResponse.json({ error: 'Missing appointmentId or status' }, { status: 400 })
    }


    const updateData: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'confirmed') {
      updateData.confirmedByPatient = true
      updateData.confirmedAt = new Date()
    }
    if (newStatus === 'completed') updateData.completedAt = new Date()
    if (newStatus === 'cancelled') updateData.cancelledAt = new Date()
    if (newStatus === 'no_show') updateData.noShowMarkedAt = new Date()

    const [updated] = await db
      .update(appointments)
      .set(updateData)
      .where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, tenantId)))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Log event
    await db.insert(appointmentEvents).values({
      appointmentId,
      tenantId,
      eventType: newStatus,
      metadata: { source: 'dashboard' },
    })

    // Update patient no-show count
    if (newStatus === 'no_show') {
      await db
        .update(patients)
        .set({ totalNoShows: sql`${patients.totalNoShows} + 1` })
        .where(eq(patients.id, updated.patientId))
    }

    return NextResponse.json({ appointment: updated })
  } catch (error) {
    console.error('Status update error:', error)
    return NextResponse.json({ error: 'Error updating status' }, { status: 500 })
  }
}
