/**
 * Tests against the SPECIALTY_TEMPLATES catalog. These templates are the
 * defaults that auto-populate the bot prompt + bot messages when a doctor
 * picks their specialty during onboarding. A regression here silently ships
 * a broken default to every new doctor.
 */
import { describe, it, expect } from 'vitest'
import {
  SPECIALTY_TEMPLATES,
  getSpecialtyTemplate,
  getSpecialtyList,
} from '@quote-engine/ai/specialty-templates'

describe('SPECIALTY_TEMPLATES', () => {
  it('has at least 7 specialties', () => {
    expect(Object.keys(SPECIALTY_TEMPLATES).length).toBeGreaterThanOrEqual(7)
  })

  it('odontologia is present (priority specialty per CLAUDE.md)', () => {
    expect(SPECIALTY_TEMPLATES).toHaveProperty('odontologia')
  })

  it('every template entry id matches its key', () => {
    for (const [key, t] of Object.entries(SPECIALTY_TEMPLATES)) {
      expect(t.id).toBe(key)
    }
  })

  it('every template has the required fields and types', () => {
    for (const t of Object.values(SPECIALTY_TEMPLATES)) {
      expect(typeof t.name).toBe('string')
      expect(typeof t.nameEs).toBe('string')
      expect(typeof t.icon).toBe('string')
      expect(t.icon.length).toBeGreaterThanOrEqual(1)
      expect(typeof t.systemPrompt).toBe('string')
      expect(t.systemPrompt.length).toBeGreaterThan(100)
      expect(Array.isArray(t.services)).toBe(true)
      expect(Array.isArray(t.faqs)).toBe(true)
      expect(Array.isArray(t.emergencyKeywords)).toBe(true)
      expect(Array.isArray(t.commonSymptoms)).toBe(true)
    }
  })

  it('every template welcome message contains {nombre} placeholder', () => {
    for (const t of Object.values(SPECIALTY_TEMPLATES)) {
      expect(t.botMessages.welcome).toContain('{nombre}')
    }
  })

  it('every template emergencyKeywords list is non-empty', () => {
    for (const t of Object.values(SPECIALTY_TEMPLATES)) {
      expect(t.emergencyKeywords.length).toBeGreaterThan(0)
    }
  })

  it('every template has at least 3 services', () => {
    for (const t of Object.values(SPECIALTY_TEMPLATES)) {
      expect(t.services.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('every service has a positive duration in minutes', () => {
    for (const t of Object.values(SPECIALTY_TEMPLATES)) {
      for (const svc of t.services) {
        expect(svc.duration).toBeGreaterThan(0)
        expect(typeof svc.name).toBe('string')
      }
    }
  })

  it('schedule weekdays use HH:MM format', () => {
    const HHMM = /^\d{2}:\d{2}$/
    for (const t of Object.values(SPECIALTY_TEMPLATES)) {
      expect(t.suggestedSchedule.weekdays.start).toMatch(HHMM)
      expect(t.suggestedSchedule.weekdays.end).toMatch(HHMM)
      if (t.suggestedSchedule.saturday) {
        expect(t.suggestedSchedule.saturday.start).toMatch(HHMM)
        expect(t.suggestedSchedule.saturday.end).toMatch(HHMM)
      }
      expect(t.suggestedSchedule.sunday).toBeNull()
      expect(t.suggestedSchedule.consultDuration).toBeGreaterThan(0)
    }
  })

  it('every system prompt contains the anti-diagnosis NUNCA guard', () => {
    for (const t of Object.values(SPECIALTY_TEMPLATES)) {
      expect(t.systemPrompt.toUpperCase()).toContain('NUNCA')
    }
  })
})

describe('getSpecialtyTemplate', () => {
  it('returns the template for a valid id', () => {
    const t = getSpecialtyTemplate('odontologia')
    expect(t).not.toBeNull()
    expect(t!.id).toBe('odontologia')
  })

  it('returns null for an unknown id', () => {
    expect(getSpecialtyTemplate('neurocirujano')).toBeNull()
    expect(getSpecialtyTemplate('')).toBeNull()
  })
})

describe('getSpecialtyList', () => {
  it('returns one entry per template', () => {
    const list = getSpecialtyList()
    expect(list.length).toBe(Object.keys(SPECIALTY_TEMPLATES).length)
  })

  it('every entry has id, name, icon', () => {
    for (const item of getSpecialtyList()) {
      expect(item.id).toBeTruthy()
      expect(item.name).toBeTruthy()
      expect(item.icon).toBeTruthy()
    }
  })

  it('every list item maps to a real template', () => {
    for (const item of getSpecialtyList()) {
      expect(getSpecialtyTemplate(item.id)).not.toBeNull()
    }
  })
})
