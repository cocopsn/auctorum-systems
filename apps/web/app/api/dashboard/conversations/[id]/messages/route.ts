import { NextRequest, NextResponse } from 'next/server'
import { db, conversations, messages } from '@quote-engine/db'
import { eq, and, lt, desc } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { sendWhatsAppMessage } from '@quote-engine/notifications'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthTenant()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
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

    const url = new URL(request.url)
    const cursor = url.searchParams.get('cursor')
    const limit = 50

    let query = db
      .select()
      .from(messages)
      .where(
        cursor
          ? and(
              eq(messages.conversationId, params.id),
              lt(messages.createdAt, new Date(cursor))
            )
          : eq(messages.conversationId, params.id)
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit + 1)

    const rows = await query

    const hasMore = rows.length > limit
    const data = hasMore ? rows.slice(0, limit) : rows

    // Return in chronological order
    data.reverse()

    return NextResponse.json({
      messages: data,
      hasMore,
      nextCursor: hasMore ? data[0]?.createdAt?.toISOString() : null,
    })
  } catch (err: any) {
    console.error('messages list error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthTenant()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json({ error: 'content es requerido' }, { status: 400 })
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

    // Insert message
    const [msg] = await db
      .insert(messages)
      .values({
        conversationId: params.id,
        direction: 'outbound',
        senderType: 'manual',
        content: body.content.trim(),
      })
      .returning()

    // Update conversation last_message_at
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, params.id))

    // Try to send via WhatsApp if we have the client phone
    // This is best-effort, don't fail the response if WA fails
    if (conv.channel === 'whatsapp') {
      try {
        const { clients } = await import('@quote-engine/db')
        if (conv.clientId) {
          const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.id, conv.clientId))
            .limit(1)
          if (client?.phone) {
            await sendWhatsAppMessage({ to: client.phone, message: body.content.trim() })
          }
        }
      } catch (waErr) {
        console.error('WhatsApp send failed (non-blocking):', waErr)
      }
    }

    return NextResponse.json({ message: msg })
  } catch (err: any) {
    console.error('message send error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
