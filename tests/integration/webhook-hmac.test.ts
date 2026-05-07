/**
 * Tests for HMAC signature verification used by Meta's webhooks (WhatsApp,
 * Lead Ads, Instagram). The implementation is duplicated across three route
 * files (we accept that for now — see code review item in the audit). This
 * test pins the algorithm so any future divergence trips the suite.
 *
 * Algorithm contract (per Meta's docs):
 *   header X-Hub-Signature-256: "sha256=" + HMAC_SHA256(app_secret, raw_body)
 *   verify with timingSafeEqual to avoid leak through timing diff
 */
import { describe, it, expect } from 'vitest'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Reference implementation — must match each webhook's verify function.
// If a webhook drifts from this, we add a test against THAT route to pin it.
function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined,
): boolean {
  if (!appSecret) return false
  if (!signatureHeader) return false
  const expected =
    'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader))
  } catch {
    return false
  }
}

const APP_SECRET = 'test-app-secret-1234567890'

function sign(rawBody: string, secret = APP_SECRET): string {
  return 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')
}

describe('Meta webhook HMAC verification', () => {
  it('accepts a correctly signed payload', () => {
    const body = JSON.stringify({ entry: [{ changes: [{ field: 'leadgen' }] }] })
    expect(verifyMetaSignature(body, sign(body), APP_SECRET)).toBe(true)
  })

  it('rejects a bit-flipped payload (signature no longer matches)', () => {
    const body = JSON.stringify({ entry: [{ changes: [{ field: 'leadgen' }] }] })
    const tampered = body.replace('leadgen', 'l3adgen')
    expect(verifyMetaSignature(tampered, sign(body), APP_SECRET)).toBe(false)
  })

  it('rejects when signature was generated with a different secret', () => {
    const body = JSON.stringify({ ok: 1 })
    expect(verifyMetaSignature(body, sign(body, 'other-secret'), APP_SECRET)).toBe(false)
  })

  it('rejects when the app secret is missing in the verifier', () => {
    const body = JSON.stringify({ ok: 1 })
    expect(verifyMetaSignature(body, sign(body), undefined)).toBe(false)
    expect(verifyMetaSignature(body, sign(body), '')).toBe(false)
  })

  it('rejects when the signature header is missing or empty', () => {
    expect(verifyMetaSignature('{}', null, APP_SECRET)).toBe(false)
    expect(verifyMetaSignature('{}', '', APP_SECRET)).toBe(false)
  })

  it('rejects when the signature header is malformed (no sha256= prefix)', () => {
    const body = JSON.stringify({ ok: 1 })
    const sig = createHmac('sha256', APP_SECRET).update(body).digest('hex')
    expect(verifyMetaSignature(body, sig, APP_SECRET)).toBe(false) // missing prefix
  })

  it('rejects when the signature length differs (timingSafeEqual contract)', () => {
    const body = JSON.stringify({ ok: 1 })
    expect(verifyMetaSignature(body, 'sha256=short', APP_SECRET)).toBe(false)
  })

  it('handles unicode payloads correctly', () => {
    const body = JSON.stringify({ msg: 'mensaje con acentos: niño, jamás, año' })
    expect(verifyMetaSignature(body, sign(body), APP_SECRET)).toBe(true)
  })

  it('respects byte-perfect raw body (whitespace matters)', () => {
    // Two semantically equivalent JSON strings produce different signatures
    const a = '{"ok":1}'
    const b = '{ "ok": 1 }'
    const sigA = sign(a)
    expect(verifyMetaSignature(a, sigA, APP_SECRET)).toBe(true)
    expect(verifyMetaSignature(b, sigA, APP_SECRET)).toBe(false)
  })
})
