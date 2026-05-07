/**
 * Patient communications timeline:
 *
 *   GET   → ledger entries for this patient (newest first), paginated
 *   POST  → manual entry (note, call log)
 *
 * The system writes email_sent / whatsapp_sent / whatsapp_received entries
 * automatically from the call sites that have a patientId in scope.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import {
  db,
  patientCommunications,
  patients,
  COMM_TYPES,
} from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'
import { validateOrigin } from '@/lib/csrf'

async function tenantOwnsPatient(tenantId: string, patientId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.tenantId, tenantId)))
    .limit(1)
  return !!row
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await tenantOwnsPatient(auth.tenant.id, params.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const sp = req.nextUrl.searchParams
  const limit = Math.min(parseInt(sp.get('limit') ?? '100'), 500)
  const offset = parseInt(sp.get('offset') ?? '0')

  try {
    const items = await db
      .select()
      .from(patientCommunications)
      .where(eq(patientCommunications.patientId, params.id))
      .orderBy(desc(patientCommunications.occurredAt))
      .limit(limit)
      .offset(offset)
    return NextResponse.json({ items, limit, offset })
  } catch (err: any) {
    console.error('[comms GET] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

const createSchema = z.object({
  type: z.enum(COMM_TYPES),
  subject: z.string().trim().max(500).optional(),
  content: z.string().trim().max(10000).optional(),
  recipient: z.string().trim().max(255).optional(),
  occurredAt: z.string().datetime().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
  }
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await tenantOwnsPatient(auth.tenant.id, params.id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  try {
    const [row] = await db
      .insert(patientCommunications)
      .values({
        tenantId: auth.tenant.id,
        patientId: params.id,
        type: parsed.data.type,
        subject: parsed.data.subject ?? null,
        content: parsed.data.content ?? null,
        recipient: parsed.data.recipient ?? null,
        createdBy: auth.user.id,
        occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
      })
      .returning()
    return NextResponse.json({ entry: row })
  } catch (err: any) {
    console.error('[comms POST] error:', err?.message || err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
