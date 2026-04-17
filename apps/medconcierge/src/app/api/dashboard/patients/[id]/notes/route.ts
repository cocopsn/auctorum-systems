import { NextRequest, NextResponse } from 'next/server'
import { eq, and, desc } from 'drizzle-orm'
import { db, patientNotes, patients } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
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

    const notes = await db
      .select()
      .from(patientNotes)
      .where(and(
        eq(patientNotes.patientId, params.id),
        eq(patientNotes.tenantId, auth.tenant.id),
      ))
      .orderBy(desc(patientNotes.isPinned), desc(patientNotes.createdAt))

    return NextResponse.json({ notes })
  } catch (err: any) {
    console.error('Patient notes GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

const createSchema = z.object({
  title: z.string().max(255).optional(),
  content: z.string().min(1, 'El contenido es requerido').max(10000),
  noteType: z.enum(['general', 'consultation', 'follow_up', 'lab_result', 'prescription', 'referral']).default('general'),
  isPinned: z.boolean().default(false),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
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
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const [created] = await db.insert(patientNotes).values({
      tenantId: auth.tenant.id,
      patientId: params.id,
      authorId: auth.user.id,
      title: parsed.data.title || null,
      content: parsed.data.content,
      noteType: parsed.data.noteType,
      isPinned: parsed.data.isPinned,
    }).returning()

    return NextResponse.json({ note: created })
  } catch (err: any) {
    console.error('Patient notes POST error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
