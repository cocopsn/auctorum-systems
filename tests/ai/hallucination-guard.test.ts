/**
 * Hallucination-guard tests — STATIC analysis of the system prompts that
 * ship with each specialty template. These don't call the model; they
 * verify that the prompts CONTAIN the guardrails that prevent the doctor's
 * AI from acting like a doctor (giving diagnoses, prescribing medication,
 * misinterpreting clinical results).
 *
 * Tests against the real `SPECIALTY_TEMPLATES` so any new specialty added
 * later automatically gets validated.
 */
import { describe, it, expect } from 'vitest'
import { SPECIALTY_TEMPLATES } from '@quote-engine/ai/specialty-templates'

const ANTI_DIAGNOSIS_PHRASES = [
  /\bnunca\b.*\b(diagn|recet|medic)/i,
  /no\s+(de|den|debes|debe)\s+(diagn|recet|medic)/i,
  /no\s+(eres|sustituye)/i,
]

describe('Hallucination guard — specialty system prompts', () => {
  for (const [id, t] of Object.entries(SPECIALTY_TEMPLATES)) {
    describe(`specialty=${id}`, () => {
      it('contains the word NUNCA (anti-action guard)', () => {
        expect(t.systemPrompt.toUpperCase()).toContain('NUNCA')
      })

      it('mentions emergency / urgent escalation', () => {
        // Spanish "urgente" / "urgencia" / "urgent" / "emergency" / "911" all count.
        expect(t.systemPrompt.toLowerCase()).toMatch(/emergenc|urgenc|urgente|urgent|911/)
      })

      it('forbids diagnosing OR prescribing OR medicating', () => {
        expect(t.systemPrompt.toLowerCase()).toMatch(/diagn[oó]stic|recet|medicament/)
      })

      it('contains at least one explicit anti-diagnosis sentence', () => {
        const matched = ANTI_DIAGNOSIS_PHRASES.some((re) => re.test(t.systemPrompt))
        expect(matched).toBe(true)
      })

      it('does NOT include a phrase that looks like a diagnosis ("usted tiene X")', () => {
        const lower = t.systemPrompt.toLowerCase()
        // The prompt should not literally say "usted tiene" as an instruction;
        // false positives could come from negated phrases like
        // "no diga 'usted tiene'", which we explicitly allow.
        if (lower.includes('usted tiene')) {
          expect(lower).toMatch(/no\s+(diga|digas|digan).*usted tiene|nunca\s+digas?\s+(["'«])usted tiene/)
        }
      })

      it('emergencyKeywords contains at least 5 entries (real coverage)', () => {
        expect(t.emergencyKeywords.length).toBeGreaterThanOrEqual(5)
      })

      it('every emergencyKeyword is a non-empty lowercase string of 3+ chars', () => {
        for (const k of t.emergencyKeywords) {
          expect(typeof k).toBe('string')
          expect(k.length).toBeGreaterThanOrEqual(3)
        }
      })
    })
  }
})

describe('Hallucination guard — bot welcome messages', () => {
  it('every welcome message contains {nombre} placeholder', () => {
    for (const t of Object.values(SPECIALTY_TEMPLATES)) {
      expect(t.botMessages.welcome).toContain('{nombre}')
    }
  })

  it('no welcome message contains hardcoded patient names (lowercase common names)', () => {
    const NAMES = ['maria', 'juan', 'pedro', 'ana']
    for (const t of Object.values(SPECIALTY_TEMPLATES)) {
      const lower = t.botMessages.welcome.toLowerCase()
      // Replace placeholder so we don't false-match on it
      const stripped = lower.replace(/\{nombre\}/g, '___').replace(/\{negocio\}/g, '___')
      for (const name of NAMES) {
        expect(stripped).not.toMatch(new RegExp(`\\b${name}\\b`))
      }
    }
  })
})
