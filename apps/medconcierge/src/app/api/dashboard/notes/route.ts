export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { and, eq, desc } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { clinicalNotes, patients } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = auth.tenant.id

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
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = auth.tenant.id

  try {
    const noteSchema = z.object({
      patientId: z.string().uuid(),
      appointmentId: z.string().uuid().nullable().optional(),
      subjective: z.string().max(5000).nullable().optional(),
      objective: z.string().max(5000).nullable().optional(),
      assessment: z.string().max(5000).nullable().optional(),
      plan: z.string().max(5000).nullable().optional(),
      content: z.string().max(10000).nullable().optional(),
    });
    const parsed = noteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { patientId, appointmentId, subjective, objective, assessment, plan, content } = parsed.data

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
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tenantId = auth.tenant.id

  try {
    const updateSchema = z.object({
      id: z.string().uuid(),
      subjective: z.string().max(5000).nullable().optional(),
      objective: z.string().max(5000).nullable().optional(),
      assessment: z.string().max(5000).nullable().optional(),
      plan: z.string().max(5000).nullable().optional(),
      content: z.string().max(10000).nullable().optional(),
    });
    const parsedUpdate = updateSchema.safeParse(await request.json());
    if (!parsedUpdate.success) {
      return NextResponse.json({ error: parsedUpdate.error.flatten() }, { status: 400 });
    }
    const { id, subjective, objective, assessment, plan, content } = parsedUpdate.data

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
