/**
 * Instagram DM helpers — send messages, fetch profiles. Uses the Meta Graph
 * API v19. Per-tenant page id + access token are stored in
 * `integrations` (type='instagram_dm'). NEVER use a global env token —
 * each clinic has its own IG account.
 */

const GRAPH = 'https://graph.facebook.com/v19.0'

export type IgProfile = {
  id: string
  name?: string
  username?: string
  profile_pic?: string
}

export async function sendInstagramMessage(args: {
  pageId: string
  recipientId: string
  text: string
  accessToken: string
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const { pageId, recipientId, text, accessToken } = args
  if (!pageId || !recipientId || !text || !accessToken) {
    return { ok: false, error: 'missing param' }
  }
  try {
    const res = await fetch(`${GRAPH}/${pageId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        messaging_type: 'RESPONSE',
        access_token: accessToken,
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return { ok: false, error: detail.slice(0, 240) }
    }
    const data = (await res.json()) as { message_id?: string }
    return { ok: true, messageId: data?.message_id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Fetch the IG sender profile (best-effort). Returns null on any failure —
 * we still want to persist the inbound message even if we can't enrich the
 * conversation with a name.
 */
export async function fetchIgProfile(
  psid: string,
  accessToken: string,
): Promise<IgProfile | null> {
  if (!psid || !accessToken) return null
  try {
    const res = await fetch(
      `${GRAPH}/${psid}?fields=id,name,username,profile_pic&access_token=${encodeURIComponent(
        accessToken,
      )}`,
    )
    if (!res.ok) return null
    return (await res.json()) as IgProfile
  } catch {
    return null
  }
}
