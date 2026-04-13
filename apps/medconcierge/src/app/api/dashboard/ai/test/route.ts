export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAuthTenant } from "@/lib/auth"
import { runPlayground } from "@quote-engine/ai"
import { z } from "zod"

const testSchema = z.object({
  message: z.string().min(1).max(1000),
})

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await req.json()
    const parsed = testSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const result = await runPlayground({
      tenant: auth.tenant,
      userId: auth.user.id,
      message: parsed.data.message,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("AI test error:", error)
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 })
  }
}
