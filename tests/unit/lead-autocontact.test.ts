/**
 * Tests against `formatPhoneMX` from the Lead Ads auto-contact helper.
 * The webhook for Meta + Google Ads ingests phones in arbitrary formats
 * (Lead Form input by the user) and we must normalize to E.164 simple
 * (`52XXXXXXXXXX`) so WhatsApp Cloud API accepts the destination.
 */
import { describe, it, expect } from 'vitest'
import { formatPhoneMX } from '@/lib/lead-autocontact'

describe('formatPhoneMX', () => {
  it('returns empty for empty input', () => {
    expect(formatPhoneMX('')).toBe('')
    expect(formatPhoneMX('   ')).toBe('')
  })

  it('strips non-digit characters', () => {
    expect(formatPhoneMX('+52 (844) 123-4567')).toBe('528441234567')
    expect(formatPhoneMX('844.123.4567')).toBe('528441234567')
    expect(formatPhoneMX('844 123 4567')).toBe('528441234567')
  })

  it('prepends 52 when the input is exactly 10 digits', () => {
    expect(formatPhoneMX('8441234567')).toBe('528441234567')
    expect(formatPhoneMX('5544332211')).toBe('525544332211')
  })

  it('keeps the existing 52 prefix when present (12+ digits)', () => {
    expect(formatPhoneMX('528441234567')).toBe('528441234567')
    expect(formatPhoneMX('+52 8441234567')).toBe('528441234567')
  })

  it('passes through digit-only strings of unexpected length', () => {
    expect(formatPhoneMX('123')).toBe('123')
    expect(formatPhoneMX('12345')).toBe('12345')
  })

  it('handles a string with only special characters', () => {
    expect(formatPhoneMX('()-+ ')).toBe('')
  })
})
