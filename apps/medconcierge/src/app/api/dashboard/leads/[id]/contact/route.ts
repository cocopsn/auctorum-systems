/**
 * POST /api/dashboard/leads/[id]/contact
 * Re-disparar el WhatsApp manualmente (cuando el auto falló o el doctor
 * quiere mandar un mensaje custom). Acepta `{ message?: string }` opcional.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, adLeads } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'
import { autoContactLead } from '@/lib/lead-autocontact'

const schema = z.object({
  message: z.string().trim().min(1).max(2000).optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any = {}
  try {
    body = (await req.json()) ?? {}
  } catch {
    /* allow empty body */
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  try {
    const [lead] = await db
      .select()
      .from(adLeads)
      .where(and(eq(adLeads.id, params.id), eq(adLeads.tenantId, auth.tenant.id)))
      .limit(1)
    if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!lead.phone) {
      return NextResponse.json({ error: 'Lead sin teléfono' }, { status: 400 })
    }

    const result = await autoContactLead(auth.tenant, lead, {
      customMessage: parsed.data.message,
    })

    if (!result.ok) {
      return NextResponse.json({ error: 'WhatsApp send failed', reason: result.reason }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[leads contact] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
