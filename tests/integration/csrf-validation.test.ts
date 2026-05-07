/**
 * Tests for the CSRF guard `validateOrigin`. This is the helper that EVERY
 * non-GET dashboard route calls first. A bug here either lets cross-origin
 * POSTs through (real CSRF risk) or rejects legitimate same-origin
 * requests (broken UI).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { validateOrigin } from '@/lib/csrf'

const ORIGINAL_NODE_ENV = process.env.NODE_ENV

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV
})

function makeRequest(headers: Record<string, string>): Request {
  return new Request('https://med.auctorum.com.mx/api/dashboard/test', {
    method: 'POST',
    headers,
  })
}

describe('validateOrigin', () => {
  beforeEach(() => {
    // Default to production behavior so we exercise the strict path. Node 20+
    // doesn't allow `Object.defineProperty(process.env, ...)` so we use plain
    // assignment.
    process.env.NODE_ENV = 'production'
  })

  it('accepts request when Origin host equals Host header (HTTPS, prod)', () => {
    const req = makeRequest({
      origin: 'https://med.auctorum.com.mx',
      host: 'med.auctorum.com.mx',
    })
    expect(validateOrigin(req)).toBe(true)
  })

  it('rejects when Origin is missing', () => {
    const req = makeRequest({ host: 'med.auctorum.com.mx' })
    expect(validateOrigin(req)).toBe(false)
  })

  it('rejects when Host is missing', () => {
    const req = makeRequest({ origin: 'https://med.auctorum.com.mx' })
    expect(validateOrigin(req)).toBe(false)
  })

  it('rejects cross-origin (different host)', () => {
    const req = makeRequest({
      origin: 'https://attacker.example',
      host: 'med.auctorum.com.mx',
    })
    expect(validateOrigin(req)).toBe(false)
  })

  it('rejects subdomain mismatch', () => {
    const req = makeRequest({
      origin: 'https://other.auctorum.com.mx',
      host: 'med.auctorum.com.mx',
    })
    expect(validateOrigin(req)).toBe(false)
  })

  it('rejects HTTP origin in production', () => {
    const req = makeRequest({
      origin: 'http://med.auctorum.com.mx',
      host: 'med.auctorum.com.mx',
    })
    expect(validateOrigin(req)).toBe(false)
  })

  it('accepts HTTP origin in development', () => {
    process.env.NODE_ENV = 'development'
    const req = makeRequest({
      origin: 'http://localhost:3001',
      host: 'localhost:3001',
    })
    expect(validateOrigin(req)).toBe(true)
  })

  it('rejects malformed Origin', () => {
    const req = makeRequest({
      origin: 'not a url',
      host: 'med.auctorum.com.mx',
    })
    expect(validateOrigin(req)).toBe(false)
  })

  it('rejects Origin that includes only a scheme', () => {
    const req = makeRequest({
      origin: 'https://',
      host: 'med.auctorum.com.mx',
    })
    expect(validateOrigin(req)).toBe(false)
  })

  it('host comparison includes port', () => {
    const req = makeRequest({
      origin: 'https://med.auctorum.com.mx:8443',
      host: 'med.auctorum.com.mx',
    })
    expect(validateOrigin(req)).toBe(false)
  })
})
