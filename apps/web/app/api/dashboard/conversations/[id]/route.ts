import { NextRequest, NextResponse } from 'next/server'
import { db, conversations } from '@quote-engine/db'
import { eq, and } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const conversationPatchSchema = z.object({
  status: z.enum(['open', 'closed', 'archived']).optional(),
  botPaused: z.boolean().optional(),
}).refine(data => data.status !== undefined || data.botPaused !== undefined, {
  message: 'Al menos un campo es requerido (status o botPaused)',
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthTenant()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = conversationPatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos invalidos', details: parsed.error.flatten() }, { status: 400 })
    }

    const [conv] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, params.id),
          eq(conversations.tenantId, auth.tenant.id)
        )
      )
      .limit(1)

    if (!conv) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 })
    }

    const updates: Record<string, any> = {}
    if (parsed.data.status !== undefined) updates.status = parsed.data.status
    if (parsed.data.botPaused !== undefined) updates.botPaused = parsed.data.botPaused

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date()
      await db
        .update(conversations)
        .set(updates)
        .where(eq(conversations.id, params.id))
    }

    const [updated] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, params.id))
      .limit(1)

    return NextResponse.json({ conversation: updated })
  } catch (err: any) {
    console.error('conversation patch error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
