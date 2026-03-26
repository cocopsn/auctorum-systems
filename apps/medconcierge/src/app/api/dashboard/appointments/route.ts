export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { and, eq, gte, lte, ilike, or, desc, sql } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { appointments, patients, tenants, appointmentEvents } from '@quote-engine/db'

// SEC-06 AUTH AUDIT: NO AUTHENTICATION IS ENFORCED on this dashboard route.
// getTenantId() is hardcoded to 'dra-martinez' instead of deriving tenant
// from an authenticated session. All handlers (GET, PATCH) are publicly accessible.
// TODO: Replace getTenantId() with auth-based tenant resolution:
//   1. Verify the user's session (magic-link token or Supabase JWT)
//   2. Derive tenant_id from the authenticated user's record in the users table
//   3. Return 401 if no valid session exists
async function getTenantId() {
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, 'dra-martinez'))
    .limit(1)
  return tenant?.id
}

export async function GET(request: NextRequest) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 401 })

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
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 401 })

  try {
    const { appointmentId, status: newStatus } = await request.json()

    if (!appointmentId || !newStatus) {
      return NextResponse.json({ error: 'Missing appointmentId or status' }, { status: 400 })
    }

    const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'no_show', 'cancelled']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
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
