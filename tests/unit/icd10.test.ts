/**
 * Tests against the ICD-10 / CIE-10 common-codes catalog. The doctor uses
 * this for diagnoses inside clinical records — a malformed code or a
 * missing common condition forces them to type the full code by hand.
 */
import { describe, it, expect } from 'vitest'
import { ICD10_COMMON } from '@quote-engine/ai/icd10-common'

describe('ICD10_COMMON', () => {
  it('has at least 100 entries', () => {
    expect(ICD10_COMMON.length).toBeGreaterThanOrEqual(100)
  })

  it('every code matches the WHO ICD-10 shape (letter + 2 digits, optional .x)', () => {
    const ICD10_RE = /^[A-Z]\d{2}(\.\d{1,3})?$/
    for (const entry of ICD10_COMMON) {
      expect(entry.code).toMatch(ICD10_RE)
    }
  })

  it('every entry has a non-empty Spanish description', () => {
    for (const entry of ICD10_COMMON) {
      expect(entry.description).toBeTruthy()
      // Some legitimate ICD-10 entries use short medical abbreviations.
      // We require at least one character, not arbitrary length.
      expect(entry.description.trim().length).toBeGreaterThanOrEqual(1)
    }
  })

  it('every entry has a non-empty category', () => {
    for (const entry of ICD10_COMMON) {
      expect(entry.category).toBeTruthy()
      expect(entry.category.trim().length).toBeGreaterThan(0)
    }
  })

  it('codes are unique', () => {
    const codes = ICD10_COMMON.map((e) => e.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('includes the most common Mexican primary-care diagnoses', () => {
    const codes = ICD10_COMMON.map((e) => e.code)
    expect(codes).toContain('E11.9') // Diabetes tipo 2 sin complicaciones
    expect(codes).toContain('I10') // Hipertensión esencial primaria
    expect(codes).toContain('K02.9') // Caries dental sin especificar
  })

  it('groups span at least 3 different categories', () => {
    const categories = new Set(ICD10_COMMON.map((e) => e.category))
    expect(categories.size).toBeGreaterThanOrEqual(3)
  })
})
