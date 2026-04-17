import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db, patientNotes, patients } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().min(1).max(10000).optional(),
  noteType: z.enum(['general', 'consultation', 'follow_up', 'lab_result', 'prescription', 'referral']).optional(),
  isPinned: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } },
) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))
      .limit(1)

    if (!patient) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const updates: Record<string, any> = { updatedAt: new Date() }
    if (parsed.data.title !== undefined) updates.title = parsed.data.title || null
    if (parsed.data.content !== undefined) updates.content = parsed.data.content
    if (parsed.data.noteType !== undefined) updates.noteType = parsed.data.noteType
    if (parsed.data.isPinned !== undefined) updates.isPinned = parsed.data.isPinned

    const [updated] = await db
      .update(patientNotes)
      .set(updates)
      .where(and(
        eq(patientNotes.id, params.noteId),
        eq(patientNotes.tenantId, auth.tenant.id),
        eq(patientNotes.patientId, params.id),
      ))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ note: updated })
  } catch (err: any) {
    console.error('Patient note PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; noteId: string } },
) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))
      .limit(1)

    if (!patient) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
    }

    const [deleted] = await db
      .delete(patientNotes)
      .where(and(
        eq(patientNotes.id, params.noteId),
        eq(patientNotes.tenantId, auth.tenant.id),
        eq(patientNotes.patientId, params.id),
      ))
      .returning()

    if (!deleted) {
      return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Patient note DELETE error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
