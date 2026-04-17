import { NextRequest, NextResponse } from 'next/server'
import { db, followUps } from '@quote-engine/db'
import { eq, and } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'
import { sanitizeText } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

const followUpPatchSchema = z.object({
  status: z.enum(['scheduled', 'sent', 'cancelled', 'failed']).optional(),
  scheduledAt: z.string().optional(),
  messageTemplate: z.string().max(1000).optional(),
}).refine(data => data.status !== undefined || data.scheduledAt !== undefined || data.messageTemplate !== undefined, {
  message: 'Al menos un campo es requerido',
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const parsed = followUpPatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const updates: Record<string, any> = {}

    if (parsed.data.status) updates.status = parsed.data.status
    if (parsed.data.scheduledAt) updates.scheduledAt = new Date(parsed.data.scheduledAt)
    if (parsed.data.messageTemplate !== undefined) {
      updates.messageTemplate = sanitizeText(parsed.data.messageTemplate)
    }

    const [updated] = await db
      .update(followUps)
      .set(updates)
      .where(and(eq(followUps.id, params.id), eq(followUps.tenantId, auth.tenant.id)))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    return NextResponse.json({ followUp: updated })
  } catch (err: any) {
    console.error('Follow-up PATCH error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// Soft delete (FIX 7.1) — set deletedAt instead of hard delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const [deleted] = await db
      .update(followUps)
      .set({ deletedAt: new Date() })
      .where(and(eq(followUps.id, params.id), eq(followUps.tenantId, auth.tenant.id)))
      .returning()

    if (!deleted) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Follow-up DELETE error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
