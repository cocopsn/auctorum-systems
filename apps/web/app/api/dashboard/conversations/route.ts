import { NextResponse } from 'next/server'
import { db, conversations, clients } from '@quote-engine/db'
import { eq, desc, sql } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'
import { z } from 'zod';

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const rows = await db
      .select({
        id: conversations.id,
        status: conversations.status,
        channel: conversations.channel,
        botPaused: conversations.botPaused,
        unreadCount: conversations.unreadCount,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        clientId: clients.id,
        clientName: clients.name,
        clientPhone: clients.phone,
        clientCompany: clients.company,
      })
      .from(conversations)
      .leftJoin(clients, eq(conversations.clientId, clients.id))
      .where(eq(conversations.tenantId, auth.tenant.id))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(50)

    const convIds = rows.map(r => r.id)
    let lastMessages: Record<string, string> = {}
    if (convIds.length > 0) {
      const inList = sql.join(convIds.map(id => sql`${id}`), sql`,`)
      const msgRows: any[] = await db.execute(sql`
        SELECT DISTINCT ON (conversation_id) conversation_id, content
        FROM messages
        WHERE conversation_id IN (${inList})
        ORDER BY conversation_id, created_at DESC
      `)
      for (const row of msgRows) {
        lastMessages[row.conversation_id] = row.content
      }
    }

    const data = rows.map(r => ({
      ...r,
      lastMessage: lastMessages[r.id] || null,
    }))

    return NextResponse.json({ conversations: data })
  } catch (err: any) {
    console.error('conversations list error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
