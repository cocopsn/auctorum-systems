export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db, tenants, botInstances } from '@quote-engine/db'
import { messageQueue } from '@quote-engine/events'
import crypto from 'crypto'

// --------------- Types ---------------

type BotInstanceConfig = {
  verify_token?: string
  app_secret?: string
  phone_number_id?: string
  business_account_id?: string
  webhook_path?: string
}

type ResolvedBot = {
  tenantId: string
  botInstanceId: string
  verifyToken: string | undefined
  appSecret: string | undefined
}

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string }
        messages?: Array<{
          from?: string
          id?: string
          type?: string
          text?: { body?: string }
          timestamp?: string
        }>
      }
    }>
  }>
}

// --------------- Tenant + bot instance resolution by slug ---------------

async function resolveTenantAndToken(slug: string): Promise<ResolvedBot | null> {
  const [row] = await db
    .select({
      tenantId: tenants.id,
      botInstanceId: botInstances.id,
      config: botInstances.config,
      status: botInstances.status,
    })
    .from(tenants)
    .innerJoin(
      botInstances,
      and(
        eq(botInstances.tenantId, tenants.id),
        eq(botInstances.channel, 'whatsapp'),
        eq(botInstances.provider, 'meta'),
      ),
    )
    .where(eq(tenants.slug, slug))
    .limit(1)

  if (!row) return null

  const cfg = (row.config as BotInstanceConfig) ?? {}
  return {
    tenantId: row.tenantId,
    botInstanceId: row.botInstanceId,
    verifyToken: cfg.verify_token,
    appSecret: cfg.app_secret,
  }
}

// --------------- HMAC signature verification ---------------

function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined,
): boolean {
  if (!appSecret || appSecret === 'PLACEHOLDER_CONFIGURE_IN_META') return false
  if (!signatureHeader) return false

  const expected =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
  } catch {
    return false
  }
}

// --------------- GET: Meta verification challenge (per-tenant) ---------------

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { slug } = params

  const resolved = await resolveTenantAndToken(slug)
  if (!resolved) {
    console.warn(`[wa/${slug}] tenant or bot_instance not found`)
    return new NextResponse('Not found', { status: 404 })
  }

  if (!resolved.verifyToken) {
    console.warn(`[wa/${slug}] no verify_token configured in bot_instance.config`)
    return new NextResponse('Not configured', { status: 503 })
  }

  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === resolved.verifyToken) {
    console.log(`[wa/${slug}] verification successful`)
    return new NextResponse(challenge ?? '', { status: 200 })
  }

  console.warn(`[wa/${slug}] verification failed (mode=${mode}, tokenMatch=${token === resolved.verifyToken})`)
  return new NextResponse('Forbidden', { status: 403 })
}

// --------------- POST: incoming messages (per-tenant) ---------------

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { slug } = params

  try {
    const resolved = await resolveTenantAndToken(slug)
    if (!resolved) {
      return new NextResponse('Not found', { status: 404 })
    }

    const rawBody = await req.text()
    const signature = req.headers.get('x-hub-signature-256')

    if (!verifyWebhookSignature(rawBody, signature, resolved.appSecret)) {
      console.warn(`[wa/${slug}] invalid HMAC signature`)
      return new NextResponse('Invalid signature', { status: 403 })
    }

    const body: WhatsAppWebhookPayload | null = (() => {
      try {
        return JSON.parse(rawBody) as WhatsAppWebhookPayload
      } catch {
        return null
      }
    })()

    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Fire-and-forget enqueue so we respond 200 to Meta quickly
    enqueueMessages(slug, resolved.tenantId, body).catch((e) =>
      console.error(`[wa/${slug}] enqueue error`, e),
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(`[wa/${slug}] POST error:`, error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// --------------- Enqueue messages to BullMQ ---------------

async function enqueueMessages(
  slug: string,
  tenantId: string,
  body: WhatsAppWebhookPayload,
): Promise<void> {
  const entries = body?.entry ?? []
  for (const entry of entries) {
    const changes = entry?.changes ?? []
    for (const change of changes) {
      const value = change?.value ?? {}
      const metadata = value?.metadata ?? {}
      const phoneNumberId = metadata?.phone_number_id ?? ''
      const messages = value?.messages ?? []

      for (const message of messages) {
        if (message?.type !== 'text') continue
        const from = (message.from ?? '').trim()
        const text = (message.text?.body ?? '').trim()
        if (!from || !text) continue

        await messageQueue.add('incoming_message', {
          tenantId,
          phone: from,
          phoneNumberId,
          text,
          externalId: message.id ?? null,
          timestamp: message.timestamp,
        })

        console.log(
          `[wa/${slug}] enqueued message ${message.id ?? '(no-id)'} tenant=${tenantId} from=${from}`,
        )
      }
    }
  }
}
