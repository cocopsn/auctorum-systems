/**
 * AI document analyzer.
 *
 * Steps:
 *   1. Extract text from PDF (pdf-parse). For images we skip extraction —
 *      OCR (Tesseract / OpenAI vision) is a follow-up.
 *   2. Send the first ~3 KB of text to gpt-4o-mini in JSON mode and ask it
 *      to fill the AnalyzedDocument schema.
 *   3. Return the parsed object plus the raw text the caller wants to
 *      persist for search.
 *
 * Fail-soft: any failure (no API key, OpenAI down, parse error) returns a
 * neutral "other" classification with the patient/date fields nulled. The
 * doctor can still assign and edit manually.
 */

import { DOCUMENT_TYPES, type DocumentType } from '@quote-engine/db'

export type AnalyzedDocument = {
  type: DocumentType
  patientName: string | null
  documentDate: string | null // YYYY-MM-DD
  summary: string
}

const NEUTRAL: AnalyzedDocument = {
  type: 'other',
  patientName: null,
  documentDate: null,
  summary: 'No se pudo analizar automáticamente.',
}

// ─── PDF text extraction ──────────────────────────────────────────────────

export async function extractPdfText(buf: Buffer): Promise<string> {
  try {
    // pdf-parse's index.js tries to read a sample fixture at module-load time
    // which 404s under most production setups. Importing the inner module
    // skips that bootstrap.
    const mod = (await import('pdf-parse/lib/pdf-parse.js')) as any
    const pdfParse = (mod.default ?? mod) as (b: Buffer) => Promise<{ text: string }>
    const result = await pdfParse(buf)
    return (result?.text || '').slice(0, 50_000) // cap at 50KB to be safe
  } catch (err) {
    console.warn(
      '[document-analyzer] pdf-parse failed:',
      err instanceof Error ? err.message : err,
    )
    return ''
  }
}

// ─── OpenAI analysis ──────────────────────────────────────────────────────

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

const ANALYZE_SYSTEM_PROMPT = `Eres un asistente que analiza documentos médicos y extrae metadata estructurada.

Devuelve SOLO un JSON con este shape exacto:
{
  "type": "lab_result" | "radiology" | "prescription" | "referral" | "insurance" | "other",
  "patient_name": string | null,
  "document_date": "YYYY-MM-DD" | null,
  "summary": string
}

Reglas:
- type: "lab_result" si tiene resultados de laboratorio (sangre, orina, etc).
        "radiology" si menciona rayos X, ultrasonido, tomografía, resonancia.
        "prescription" si es una receta médica.
        "referral" si es un volante de referencia a otro especialista.
        "insurance" si es algo de aseguradora (autorización, póliza, EOB).
        "other" si no encaja en lo anterior.
- patient_name: el nombre del paciente, tal como aparece. null si no es claro.
- document_date: la fecha del documento (cuando se realizó el estudio o se emitió la receta), no la fecha de subida. Formato YYYY-MM-DD. null si no se puede inferir.
- summary: 1-2 oraciones en español, máximo 200 caracteres, describiendo qué es el documento (NO interpretes resultados clínicamente).

Si el texto está casi vacío o no parece un documento médico, devuelve type="other", todo null y summary="Documento sin contenido analizable".`

export async function analyzeDocument(text: string): Promise<AnalyzedDocument> {
  if (!process.env.OPENAI_API_KEY) return NEUTRAL
  const trimmed = (text || '').trim().slice(0, 3000)
  if (trimmed.length < 20) return NEUTRAL

  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: ANALYZE_SYSTEM_PROMPT },
          { role: 'user', content: trimmed },
        ],
        max_tokens: 250,
        temperature: 0,
        response_format: { type: 'json_object' },
        // PHI from PDF text — never persisted in OpenAI 30d retention.
        store: false,
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.warn('[document-analyzer] OpenAI', res.status, detail.slice(0, 200))
      return NEUTRAL
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = data.choices?.[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as {
      type?: string
      patient_name?: string | null
      document_date?: string | null
      summary?: string
    }

    const type: DocumentType = (DOCUMENT_TYPES as readonly string[]).includes(parsed.type ?? '')
      ? (parsed.type as DocumentType)
      : 'other'

    const documentDate =
      typeof parsed.document_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.document_date)
        ? parsed.document_date
        : null

    const summary =
      typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
        ? parsed.summary.trim().slice(0, 240)
        : NEUTRAL.summary

    const patientName =
      typeof parsed.patient_name === 'string' && parsed.patient_name.trim().length > 0
        ? parsed.patient_name.trim().slice(0, 200)
        : null

    return { type, patientName, documentDate, summary }
  } catch (err) {
    console.warn(
      '[document-analyzer] analyze failed:',
      err instanceof Error ? err.message : err,
    )
    return NEUTRAL
  }
}
