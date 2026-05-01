export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAuthTenant } from "@/lib/auth"
import { db, integrations } from "@quote-engine/db"
import { eq, and } from "drizzle-orm"

// ---------------------------------------------------------------------------
// GET /api/dashboard/integrations/instagram — Fetch IG feed
// ---------------------------------------------------------------------------
export async function GET() {
  const auth = await getAuthTenant()
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Get Instagram integration config
  const [integration] = await db
    .select()
    .from(integrations)
    .where(
      and(
        eq(integrations.tenantId, auth.tenant.id),
        eq(integrations.type, "instagram")
      )
    )
    .limit(1)

  if (!integration || integration.status !== "connected") {
    return NextResponse.json({ connected: false, feed: [] })
  }

  const config = integration.config as { access_token?: string }
  if (!config?.access_token) {
    return NextResponse.json({ connected: false, feed: [] })
  }

  try {
    // Instagram Basic Display API — fetch recent media
    const response = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=12&access_token=${config.access_token}`,
      { next: { revalidate: 300 } } // Cache 5 min
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      if (response.status === 190 || err?.error?.code === 190) {
        // Token expired
        await db
          .update(integrations)
          .set({ status: "expired" })
          .where(eq(integrations.id, integration.id))
        return NextResponse.json({ connected: false, expired: true, feed: [] })
      }
      throw new Error(err?.error?.message || "Instagram API error")
    }

    const data = await response.json()

    return NextResponse.json({
      connected: true,
      feed: (data.data || []).map((item: any) => ({
        id: item.id,
        caption: item.caption || "",
        mediaType: item.media_type,
        mediaUrl: item.media_url,
        thumbnailUrl: item.thumbnail_url,
        permalink: item.permalink,
        timestamp: item.timestamp,
      })),
    })
  } catch (err: any) {
    return NextResponse.json(
      { connected: true, error: err.message, feed: [] },
      { status: 200 }
    )
  }
}
