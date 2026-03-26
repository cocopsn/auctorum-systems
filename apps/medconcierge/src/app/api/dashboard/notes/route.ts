export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { and, eq, desc } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { clinicalNotes, patients, tenants } from '@quote-engine/db'

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
  const patientId = searchParams.get('patientId')

  const conditions = [eq(clinicalNotes.tenantId, tenantId)]
  if (patientId) conditions.push(eq(clinicalNotes.patientId, patientId))

  const notes = await db
    .select({
      id: clinicalNotes.id,
      appointmentId: clinicalNotes.appointmentId,
      patientId: clinicalNotes.patientId,
      noteType: clinicalNotes.noteType,
      subjective: clinicalNotes.subjective,
      objective: clinicalNotes.objective,
      assessment: clinicalNotes.assessment,
      plan: clinicalNotes.plan,
      content: clinicalNotes.content,
      aiGenerated: clinicalNotes.aiGenerated,
      createdAt: clinicalNotes.createdAt,
      updatedAt: clinicalNotes.updatedAt,
      patientName: patients.name,
    })
    .from(clinicalNotes)
    .innerJoin(patients, eq(clinicalNotes.patientId, patients.id))
    .where(and(...conditions))
    .orderBy(desc(clinicalNotes.createdAt))
    .limit(50)

  return NextResponse.json({ notes })
}

export async function POST(request: NextRequest) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 401 })

  try {
    const body = await request.json()
    const { patientId, appointmentId, subjective, objective, assessment, plan, content } = body

    if (!patientId) {
      return NextResponse.json({ error: 'patientId required' }, { status: 400 })
    }

    const [note] = await db.insert(clinicalNotes).values({
      tenantId,
      patientId,
      appointmentId: appointmentId || null,
      noteType: 'consultation',
      subjective: subjective || null,
      objective: objective || null,
      assessment: assessment || null,
      plan: plan || null,
      content: content || null,
    }).returning()

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    console.error('Note creation error:', error)
    return NextResponse.json({ error: 'Error creating note' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No tenant' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, subjective, objective, assessment, plan, content } = body

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const [note] = await db
      .update(clinicalNotes)
      .set({
        subjective: subjective ?? null,
        objective: objective ?? null,
        assessment: assessment ?? null,
        plan: plan ?? null,
        content: content ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(clinicalNotes.id, id), eq(clinicalNotes.tenantId, tenantId)))
      .returning()

    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 })

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Note update error:', error)
    return NextResponse.json({ error: 'Error updating note' }, { status: 500 })
  }
}
