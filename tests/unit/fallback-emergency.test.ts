/**
 * Tests for the emergency-detection helper and the broader fallback message
 * generator in `@quote-engine/ai/fallback`.
 *
 * The worker calls these on EVERY inbound WhatsApp message. A regression
 * here either misses real emergencies (catastrophic) or false-positives on
 * normal traffic (annoying) — both are real risks.
 */
import { describe, expect, it } from 'vitest'
import { isEmergency, generateFallbackResponse } from '@quote-engine/ai/fallback'

describe('isEmergency', () => {
  describe('true positives — should flag as emergency', () => {
    const cases: Array<[string, string?]> = [
      ['Tengo dolor en el pecho y no puedo respirar'],
      ['Mi hijo se puso morado y tiene convulsiones'],
      ['Estoy sangrando mucho y no para'],
      ['Perdió el conocimiento y no despierta'],
      ['Tiene una reacción alérgica severa'],
      ['Quiero suicidarme'],
      ['Es una emergencia, ayúdenme'],
      ['Es urgente'],
      ['Tengo un dolor fuerte en el pecho'],
    ]
    for (const [msg] of cases) {
      it(`flags "${msg.slice(0, 50)}…"`, () => {
        expect(isEmergency(msg)).toBe(true)
      })
    }
  })

  describe('true negatives — must NOT flag as emergency', () => {
    const cases = [
      'Me duele la muela desde ayer',
      'Quiero agendar una cita para limpieza',
      'Cuánto cuesta la consulta?',
      'Estoy trabajando ahora, puedo llamar después?',
      'Me duele un poco la cabeza',
      'Tengo dolor de estómago leve',
      'Hola, buenas tardes',
      '¿A qué hora abren?',
    ]
    for (const msg of cases) {
      it(`does not flag "${msg.slice(0, 50)}…"`, () => {
        expect(isEmergency(msg)).toBe(false)
      })
    }
  })

  it('returns false for empty / null input', () => {
    expect(isEmergency('')).toBe(false)
    expect(isEmergency(undefined as unknown as string)).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isEmergency('NO PUEDO RESPIRAR')).toBe(true)
    expect(isEmergency('Sangrado MASIVO')).toBe(true)
  })

  it('uses specialty-specific keywords when a template id is provided', () => {
    // odontologia template adds dental-specific emergency keywords. Even
    // though these words may not be in the baseline list, they should
    // trigger when the specialty template is loaded.
    expect(isEmergency('test', 'odontologia')).toBe(false) // sanity: 'test' not an emergency
    // We don't hardcode the specialty's specific keywords here (they may
    // change), but the contract is: passing specialty='odontologia' must
    // be at least as strict as no specialty.
    const baseline = isEmergency('me duele un diente')
    const odonto = isEmergency('me duele un diente', 'odontologia')
    expect(odonto || !baseline).toBe(true)
  })
})

describe('generateFallbackResponse', () => {
  it('always returns a non-empty string', () => {
    expect(generateFallbackResponse('').length).toBeGreaterThan(0)
    expect(generateFallbackResponse('hola').length).toBeGreaterThan(0)
  })

  it('emergency intent wins over greeting/booking intents', () => {
    const out = generateFallbackResponse('hola, tengo una emergencia, no puedo respirar')
    expect(out).toMatch(/911|emergencia|urgenc/i)
  })

  it('booking intent: mentions intentar de nuevo / llame al consultorio', () => {
    const out = generateFallbackResponse('quiero agendar una cita')
    expect(out.length).toBeGreaterThan(20)
    expect(out.toLowerCase()).toMatch(/cita|agendar|consultorio|intente|llame/)
  })

  it('uses the businessName in the default-intent fallback', () => {
    // Arbitrary message that doesn't trigger emergency / booking / price /
    // hours / location / greeting heuristics → falls through to the default
    // branch which interpolates the business name.
    const out = generateFallbackResponse(
      'tengo una pregunta sobre los tratamientos disponibles',
      { businessName: 'Clínica Demo' },
    )
    expect(out).toContain('Clínica Demo')
  })

  it('NEVER includes diagnosis verbs (no "diagnostico", "le receto")', () => {
    const out = generateFallbackResponse(
      'me duele todo el cuerpo, qué tengo doctor',
      { businessName: 'Test' },
    )
    const lower = out.toLowerCase()
    expect(lower).not.toMatch(/\bdiagn[oó]stic[oa]\b/)
    expect(lower).not.toMatch(/\ble receto\b/)
    expect(lower).not.toMatch(/\busted tiene\b/)
  })

  it('hours intent — uses the provided schedule', () => {
    const out = generateFallbackResponse('a qué hora abren?', {
      schedule: { weekdays: { start: '09:00', end: '18:00' } },
    })
    expect(out).toMatch(/09:00/)
    expect(out).toMatch(/18:00/)
  })

  it('location intent — uses the provided address', () => {
    const out = generateFallbackResponse('cómo llegar?', {
      address: 'Av. Universidad 123, Saltillo',
    })
    expect(out).toContain('Av. Universidad 123, Saltillo')
  })
})
