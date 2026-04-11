import { NextRequest, NextResponse } from 'next/server'
import { db, followUps } from '@quote-engine/db'
import { eq, and } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const updates: Record<string, any> = {}

    if (body.status) updates.status = body.status
    if (body.scheduledAt) updates.scheduledAt = new Date(body.scheduledAt)
    if (body.messageTemplate !== undefined) updates.messageTemplate = body.messageTemplate

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay cambios' }, { status: 400 })
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