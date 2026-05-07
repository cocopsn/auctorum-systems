/**
 * Tests for the document analyzer fail-safe behavior. The analyzer is the
 * AI step inside the document upload flow; if OpenAI is unset or the API
 * is down, the upload must STILL succeed (just with `type=other` and no
 * patient match) — losing the document upload entirely is much worse than
 * losing the AI classification.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { analyzeDocument, extractPdfText } from '@/lib/document-analyzer'

const ORIGINAL_KEY = process.env.OPENAI_API_KEY

beforeEach(() => {
  delete process.env.OPENAI_API_KEY
})

afterEach(() => {
  if (ORIGINAL_KEY) process.env.OPENAI_API_KEY = ORIGINAL_KEY
  else delete process.env.OPENAI_API_KEY
  vi.restoreAllMocks()
})

describe('analyzeDocument — fail-safe path', () => {
  it('returns NEUTRAL when OPENAI_API_KEY is unset', async () => {
    const out = await analyzeDocument(
      'Documento médico con resultados de laboratorio. Paciente: María García. Fecha: 2026-04-15.',
    )
    expect(out.type).toBe('other')
    expect(out.patientName).toBeNull()
    expect(out.documentDate).toBeNull()
    expect(typeof out.summary).toBe('string')
  })

  it('returns NEUTRAL for empty text even with API key set', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const out = await analyzeDocument('')
    expect(out.type).toBe('other')
    expect(out.patientName).toBeNull()
  })

  it('returns NEUTRAL for very short text (<20 chars) even with API key', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const out = await analyzeDocument('hola')
    expect(out.type).toBe('other')
  })

  it('falls back to NEUTRAL on OpenAI 5xx (mocked fetch)', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('upstream error', { status: 503 }),
    )
    const out = await analyzeDocument(
      'Resultado de biometría hemática para paciente Juan Pérez con valores normales',
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(out.type).toBe('other')
    expect(out.patientName).toBeNull()
  })

  it('falls back to NEUTRAL on JSON parse failure (mocked fetch)', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'not valid json {{{' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const out = await analyzeDocument(
      'Receta para paciente: Carlos González. Indicar paracetamol 500mg cada 8h.',
    )
    expect(out.type).toBe('other')
  })

  it('happy path: parses a valid JSON response with all fields', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const aiResponse = JSON.stringify({
      type: 'lab_result',
      patient_name: 'María García',
      document_date: '2026-04-15',
      summary: 'Biometría hemática completa con valores dentro de rango normal.',
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: aiResponse } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const out = await analyzeDocument(
      'Resultado biometría hemática paciente María García fecha 15/04/2026',
    )
    expect(out.type).toBe('lab_result')
    expect(out.patientName).toBe('María García')
    expect(out.documentDate).toBe('2026-04-15')
    expect(out.summary).toContain('Biometría')
  })

  it('coerces unknown type values back to "other"', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const aiResponse = JSON.stringify({
      type: 'mri_scan', // not in the allowed vocabulary
      patient_name: 'Juan',
      document_date: null,
      summary: 'MRI study',
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: aiResponse } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const out = await analyzeDocument('Resonancia magnética del paciente Juan')
    expect(out.type).toBe('other')
  })

  it('rejects malformed document_date and returns null', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'
    const aiResponse = JSON.stringify({
      type: 'prescription',
      patient_name: 'Ana',
      document_date: '15-04-2026', // not YYYY-MM-DD
      summary: 'Receta',
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: aiResponse } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const out = await analyzeDocument('Receta paciente Ana 15/04/2026 paracetamol')
    expect(out.type).toBe('prescription')
    expect(out.documentDate).toBeNull()
  })
})

describe('extractPdfText', () => {
  it('returns empty string for an invalid PDF buffer (graceful fail)', async () => {
    const text = await extractPdfText(Buffer.from('not a pdf'))
    expect(text).toBe('')
  })

  it('returns empty string for an empty buffer', async () => {
    const text = await extractPdfText(Buffer.alloc(0))
    expect(text).toBe('')
  })
})
