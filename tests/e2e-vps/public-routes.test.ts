/**
 * E2E smoke against the deployed production site. NOT part of `pnpm test:run`
 * (it hits real Cloudflare + real PM2 processes). Triggered explicitly by
 * `pnpm test:e2e`.
 *
 * Tests stay READ-ONLY and on rejection paths so we never mutate prod data
 * or trip real rate limits. We don't post 20 fake login attempts — that
 * would self-DoS.
 */
import { describe, it, expect } from 'vitest'

const MED_BASE = process.env.TEST_BASE_URL || 'https://med.auctorum.com.mx'
const WEB_BASE = 'https://auctorum.com.mx'

function followNoRedirect(): RequestInit {
  return { redirect: 'manual', cache: 'no-store' as RequestCache }
}

describe(`Public routes (${MED_BASE})`, () => {
  it('GET /login returns 200', async () => {
    const r = await fetch(`${MED_BASE}/login`, followNoRedirect())
    expect(r.status).toBe(200)
  })

  it('GET /signup returns 200', async () => {
    const r = await fetch(`${MED_BASE}/signup`, followNoRedirect())
    expect(r.status).toBe(200)
  })

  it('GET / redirects to login (or 200 landing)', async () => {
    const r = await fetch(`${MED_BASE}/`, followNoRedirect())
    expect([200, 307, 308]).toContain(r.status)
  })

  it('GET /privacy returns 200', async () => {
    const r = await fetch(`${MED_BASE}/privacy`, followNoRedirect())
    expect(r.status).toBe(200)
  })

  it('GET /terms returns 200', async () => {
    const r = await fetch(`${MED_BASE}/terms`, followNoRedirect())
    expect(r.status).toBe(200)
  })

  it('GET /api-docs returns 200 (public Swagger)', async () => {
    const r = await fetch(`${MED_BASE}/api-docs`, followNoRedirect())
    expect(r.status).toBe(200)
  })

  it('GET /manifest.json returns 200 with JSON', async () => {
    const r = await fetch(`${MED_BASE}/manifest.json`, followNoRedirect())
    expect(r.status).toBe(200)
    const body = (await r.json()) as { name?: string; start_url?: string }
    expect(body.name).toBeTruthy()
    expect(body.start_url).toBe('/dashboard')
  })

  it('GET /sw.js returns 200 with JS content-type', async () => {
    const r = await fetch(`${MED_BASE}/sw.js`, followNoRedirect())
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toMatch(/javascript/i)
  })

  it('GET /icons/icon-192.png returns 200 with image/png', async () => {
    const r = await fetch(`${MED_BASE}/icons/icon-192.png`, followNoRedirect())
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('image/png')
  })
})

describe('Auth-gated routes — must redirect or 401', () => {
  it('GET /dashboard without auth redirects', async () => {
    const r = await fetch(`${MED_BASE}/dashboard`, followNoRedirect())
    expect([301, 307, 308]).toContain(r.status)
  })

  it('GET /api/dashboard/stats without auth → 401', async () => {
    const r = await fetch(`${MED_BASE}/api/dashboard/stats`, followNoRedirect())
    expect(r.status).toBe(401)
  })

  it('GET /api/dashboard/leads without auth → 401', async () => {
    const r = await fetch(`${MED_BASE}/api/dashboard/leads`, followNoRedirect())
    expect(r.status).toBe(401)
  })

  it('GET /api/dashboard/documents without auth → 401', async () => {
    const r = await fetch(`${MED_BASE}/api/dashboard/documents`, followNoRedirect())
    expect(r.status).toBe(401)
  })

  it('GET /api/dashboard/settings/instagram without auth → 401', async () => {
    const r = await fetch(`${MED_BASE}/api/dashboard/settings/instagram`, followNoRedirect())
    expect(r.status).toBe(401)
  })

  it('GET /api/v1/appointments without API key → 401', async () => {
    const r = await fetch(`${MED_BASE}/api/v1/appointments`, followNoRedirect())
    expect(r.status).toBe(401)
  })
})

describe('Webhook signature rejection', () => {
  it('POST /api/webhooks/stripe without signature → 400', async () => {
    const r = await fetch(`${MED_BASE}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      ...followNoRedirect(),
    })
    expect([400, 403]).toContain(r.status)
  })

  it('POST /api/webhooks/meta-leads with bad HMAC → 403', async () => {
    const r = await fetch(`${MED_BASE}/api/webhooks/meta-leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=invalid',
      },
      body: '{}',
      ...followNoRedirect(),
    })
    expect(r.status).toBe(403)
  })

  it('POST /api/webhooks/instagram with bad HMAC → 403', async () => {
    const r = await fetch(`${MED_BASE}/api/webhooks/instagram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=invalid',
      },
      body: '{}',
      ...followNoRedirect(),
    })
    expect(r.status).toBe(403)
  })

  it('POST /api/webhooks/google-leads without token → 401', async () => {
    const r = await fetch(`${MED_BASE}/api/webhooks/google-leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      ...followNoRedirect(),
    })
    expect(r.status).toBe(401)
  })

  it('GET /api/webhooks/meta-leads with bad verify_token → 403', async () => {
    const url = `${MED_BASE}/api/webhooks/meta-leads?hub.mode=subscribe&hub.verify_token=BAD&hub.challenge=test`
    const r = await fetch(url, followNoRedirect())
    expect(r.status).toBe(403)
  })
})

describe('Web app (auctorum.com.mx)', () => {
  it('GET / returns 200', async () => {
    const r = await fetch(`${WEB_BASE}/`, followNoRedirect())
    expect(r.status).toBe(200)
  })

  it('GET /about returns 200', async () => {
    const r = await fetch(`${WEB_BASE}/about`, followNoRedirect())
    expect(r.status).toBe(200)
  })

  it('GET /systems returns 200', async () => {
    const r = await fetch(`${WEB_BASE}/systems`, followNoRedirect())
    expect(r.status).toBe(200)
  })

  it('GET /privacy redirects to med subdomain (not dra-martinez)', async () => {
    const r = await fetch(`${WEB_BASE}/privacy`, followNoRedirect())
    expect([200, 307, 308]).toContain(r.status)
    // Body must NOT reference dra-martinez (regression guard)
    const body = await r.text()
    expect(body.toLowerCase()).not.toContain('dra-martinez')
  })
})

describe('Security headers', () => {
  it('exposes HSTS on med subdomain', async () => {
    const r = await fetch(`${MED_BASE}/login`)
    const hsts = r.headers.get('strict-transport-security')
    expect(hsts).toBeTruthy()
    expect(hsts!.toLowerCase()).toContain('max-age')
  })

  it('does not expose x-powered-by', async () => {
    const r = await fetch(`${MED_BASE}/login`)
    expect(r.headers.get('x-powered-by')).toBeNull()
  })

  it('sets X-Frame-Options to DENY', async () => {
    const r = await fetch(`${MED_BASE}/login`)
    // Both Next.js (next.config.js) AND Nginx set this header in prod —
    // Nginx concatenates duplicates with comma. Either single DENY or
    // comma-joined DENY,DENY is acceptable; SAMEORIGIN / ALLOW-FROM is NOT.
    const v = r.headers.get('x-frame-options')
    expect(v).toBeTruthy()
    expect(v!.toUpperCase()).toMatch(/^DENY(,\s*DENY)*$/)
  })

  it('sets X-Content-Type-Options nosniff', async () => {
    const r = await fetch(`${MED_BASE}/login`)
    expect(r.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('sets a Content-Security-Policy header', async () => {
    const r = await fetch(`${MED_BASE}/login`)
    expect(r.headers.get('content-security-policy')).toBeTruthy()
  })
})
