export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAuthTenant } from "@/lib/auth"
import { getAiSettings, saveAiSettings } from "@quote-engine/ai"
import { z } from "zod"
import { validateOrigin } from '@/lib/csrf'

export async function GET() {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const settings = getAiSettings(auth.tenant)
    return NextResponse.json({ settings })
  } catch (error) {
    console.error("AI config GET error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// Pre-2026-05-11 this schema also accepted `autoSchedule`, `answerFaq`
// and `humanHandoff` booleans. None had a consumer — `packages/ai/`
// and `scripts/worker.ts` never branched on them, so saving them did
// nothing. Removed.
const updateSchema = z.object({
  systemPrompt: z.string().max(5000).optional(),
  model: z.enum(["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"]).optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(100).max(1000).optional(),
  enabled: z.boolean().optional(),
})

export async function PUT(req: NextRequest) {
  if (!validateOrigin(req)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const updated = await saveAiSettings(auth.tenant, parsed.data)
    return NextResponse.json({ settings: getAiSettings(updated as any) })
  } catch (error) {
    console.error("AI config PUT error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
