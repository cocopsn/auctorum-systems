export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAuthTenant } from '@/lib/auth'
import { db, tenants, encrypt } from '@quote-engine/db'
import { eq } from 'drizzle-orm'

// GET /api/auth/google/callback — Handle Google OAuth callback
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Determine redirect base from request host
  const host = request.headers.get('host') || 'auctorum.com.mx'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/integrations?google=error&reason=${encodeURIComponent(error)}`,
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/integrations?google=error&reason=missing_params`,
    )
  }

  // Verify state token
  const cookieStore = await cookies()
  const savedState = cookieStore.get('google_oauth_state')?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      `${baseUrl}/integrations?google=error&reason=invalid_state`,
    )
  }
  cookieStore.delete('google_oauth_state')

  // Verify user is authenticated
  const auth = await getAuthTenant()
  if (!auth) {
    return NextResponse.redirect(`${baseUrl}/login`)
  }

  // Exchange code for tokens
  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('[google-oauth] Token exchange failed:', err)
      return NextResponse.redirect(
        `${baseUrl}/integrations?google=error&reason=token_exchange_failed`,
      )
    }

    const tokens = await tokenRes.json()
    const { access_token, refresh_token, expires_in } = tokens

    if (!access_token || !refresh_token) {
      console.error('[google-oauth] Missing tokens:', { hasAccess: !!access_token, hasRefresh: !!refresh_token })
      return NextResponse.redirect(
        `${baseUrl}/integrations?google=error&reason=missing_tokens`,
      )
    }

    // Get user email from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const userInfo = userInfoRes.ok ? await userInfoRes.json() : null
    const email = userInfo?.email || null

    // Get primary calendar ID (usually the user's email)
    const calendarId = email || 'primary'

    // Calculate token expiry
    const tokenExpiry = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()

    // Save to tenant config. Tokens are encrypted at rest with
    // AES-256-GCM (ENCRYPTION_KEY env). Pre-2026-05-12 they were
    // stored plaintext in JSONB — any DB read leak (anon-key abuse,
    // backup theft, etc.) handed an attacker permanent Google
    // impersonation. See packages/db/src/encryption.ts for the
    // ciphertext shape ('iv:tag:cipher'). The google-calendar
    // helper decrypts before use.
    const config = (auth.tenant.config as Record<string, any>) || {}
    config.googleCalendar = {
      ...config.googleCalendar,
      mode: 'oauth',
      oauth: {
        accessToken: encrypt(access_token),
        refreshToken: refresh_token ? encrypt(refresh_token) : null,
        tokenExpiry,
        email,
        calendarId,
        connectedAt: new Date().toISOString(),
        // Marker for the migration script — pre-existing rows have no
        // `encrypted` flag and need backfill via scripts/encrypt-existing-tokens.ts
        encrypted: true,
      },
      calendarId,
      autoSync: true,
    }

    await db
      .update(tenants)
      .set({ config, updatedAt: new Date() })
      .where(eq(tenants.id, auth.tenant.id))

    console.log(`[google-oauth] Connected for tenant ${auth.tenant.slug} (${email})`)

    return NextResponse.redirect(`${baseUrl}/integrations?google=connected`)
  } catch (err: any) {
    console.error('[google-oauth] Callback error:', err?.message || err)
    return NextResponse.redirect(
      `${baseUrl}/integrations?google=error&reason=server_error`,
    )
  }
}
