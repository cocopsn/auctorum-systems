export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db, clinicalRecords, patients, patientFiles, doctors } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"
import { getPatientFileSignedUrl } from "@/lib/storage"
import { findIcd10ByCode } from "@quote-engine/ai"
import { generateHTML } from "@tiptap/html"
import StarterKit from "@tiptap/starter-kit"
import Highlight from "@tiptap/extension-highlight"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Image from "@tiptap/extension-image"

type RouteCtx = { params: { id: string; recordId: string } }

const ResizableImageForHTML = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null, renderHTML: (attrs) => attrs.width ? { width: attrs.width } : {} },
      height: { default: null, renderHTML: (attrs) => attrs.height ? { height: attrs.height } : {} },
      align: { default: "center", renderHTML: (attrs) => ({ "data-align": attrs.align || "center" }) },
    }
  },
})

const extensions = [
  StarterKit.configure({ heading: { levels: [2, 3] } }),
  Highlight,
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  ResizableImageForHTML.configure({ inline: false }),
]

export async function GET(_request: NextRequest, { params }: RouteCtx) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const [patient] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))
      .limit(1)
    if (!patient) return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })

    const [record] = await db
      .select()
      .from(clinicalRecords)
      .where(and(
        eq(clinicalRecords.id, params.recordId),
        eq(clinicalRecords.tenantId, auth.tenant.id),
        eq(clinicalRecords.patientId, params.id),
      ))
      .limit(1)
    if (!record) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })

    // Build HTML content
    let bodyHtml = ""
    if (record.recordType === "soap") {
      const soapSections = [
        { label: "Subjetivo", value: record.soapSubjective, color: "#3B82F6" },
        { label: "Objetivo", value: record.soapObjective, color: "#22C55E" },
        { label: "Evaluaci\u00f3n", value: record.soapAssessment, color: "#F59E0B" },
        { label: "Plan", value: record.soapPlan, color: "#8B5CF6" },
      ]
      bodyHtml = soapSections
        .filter(s => s.value)
        .map(s => `<div style="margin-bottom:16px;border-left:4px solid ${s.color};padding-left:12px;"><h3 style="margin:0 0 4px;font-size:13px;color:${s.color};text-transform:uppercase;letter-spacing:0.05em;">${s.label}</h3><p style="margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(s.value!)}</p></div>`)
        .join("")
    } else {
      try {
        const content = record.content as any
        if (content && typeof content === "object" && Object.keys(content).length > 0) {
          bodyHtml = generateHTML(content, extensions)
        }
      } catch {
        bodyHtml = "<p>Contenido no disponible</p>"
      }
    }

    // Get attached images
    const files = await db
      .select()
      .from(patientFiles)
      .where(and(
        eq(patientFiles.clinicalRecordId, params.recordId),
        eq(patientFiles.tenantId, auth.tenant.id),
      ))

    const imageFiles = files.filter(f => f.mimeType.startsWith("image/"))
    let attachmentsHtml = ""
    if (imageFiles.length > 0) {
      const imageUrls = await Promise.all(
        imageFiles.map(async f => {
          try {
            const url = await getPatientFileSignedUrl(f.storagePath, 300)
            return { filename: f.filename, url }
          } catch {
            return null
          }
        })
      )
      const validImages = imageUrls.filter(Boolean) as { filename: string; url: string }[]
      if (validImages.length > 0) {
        attachmentsHtml = `
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
            <h3 style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Archivos adjuntos</h3>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              ${validImages.map(i => `<img src="${i.url}" alt="${escapeHtml(i.filename)}" style="max-width:200px;max-height:200px;border-radius:8px;border:1px solid #e2e8f0;" />`).join("")}
            </div>
          </div>`
      }
    }

    const patientName = patient.name || "Paciente"
    const tenantName = auth.tenant.name || "Consultorio"
    const dateStr = new Intl.DateTimeFormat("es-MX", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(record.createdAt))

    // ─── NOM-004 doctor + patient identity ───
    // For locked records we use the snapshot. For drafts we read the
    // current doctor profile so the PDF still shows correct credentials.
    let doctorName = record.doctorName ?? null
    let doctorCedula = record.doctorCedula ?? null
    let doctorCedulaEsp: string | null = null
    let doctorUniversity: string | null = null
    let doctorSsa: string | null = null
    let doctorSignature: string | null = null
    {
      const [doc] = await db
        .select()
        .from(doctors)
        .where(eq(doctors.tenantId, auth.tenant.id))
        .limit(1)
      if (doc) {
        if (!doctorName) doctorName = doc.name
        if (!doctorCedula) doctorCedula = doc.cedulaProfesional
        doctorCedulaEsp = doc.cedulaEspecialidad
        doctorUniversity = doc.university
        doctorSsa = doc.ssaRegistration
        doctorSignature = doc.digitalSignature
      }
    }

    // Compute patient age from dateOfBirth if present.
    let patientAge: string | null = null
    if (patient.dateOfBirth) {
      const dob = new Date(patient.dateOfBirth as unknown as string)
      const ageYears = Math.floor(
        (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
      )
      if (Number.isFinite(ageYears) && ageYears >= 0) patientAge = `${ageYears} años`
    }

    const icd = record.diagnosisIcd10 ? findIcd10ByCode(record.diagnosisIcd10) : null
    const lockedAtStr = record.lockedAt
      ? new Intl.DateTimeFormat('es-MX', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        }).format(new Date(record.lockedAt as unknown as string))
      : null

    const recordTypeLabels: Record<string, string> = {
      general: "General",
      consultation: "Consulta",
      soap: "SOAP",
      follow_up: "Seguimiento",
      lab_result: "Laboratorio",
      prescription: "Receta",
      referral: "Referencia",
      procedure: "Procedimiento",
      imaging: "Imagen",
      first_visit: "Primera Visita",
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<style>
  @page { size: letter; margin: 2cm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; line-height: 1.6; font-size: 14px; margin: 0; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #0d9488; }
  .header-left h1 { margin: 0; font-size: 20px; color: #0d9488; }
  .header-left p { margin: 2px 0; font-size: 12px; color: #64748b; }
  .header-right { text-align: right; font-size: 11px; color: #64748b; }
  .meta { display: flex; gap: 16px; margin-bottom: 20px; font-size: 12px; color: #475569; }
  .meta-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 12px; }
  .meta-item strong { color: #1e293b; }
  .title { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #0f172a; }
  .content { margin-bottom: 24px; }
  .content h2 { font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .content h3 { font-size: 14px; }
  .content img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
  .content img[data-align="left"] { display: block; margin-left: 0; margin-right: auto; }
  .content img[data-align="center"] { display: block; margin-left: auto; margin-right: auto; }
  .content img[data-align="right"] { display: block; margin-left: auto; margin-right: 0; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  .doc-info { font-size: 11px; color: #475569; margin-top: 4px; }
  .doc-info span { display: inline-block; margin-right: 12px; }
  .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 8px 12px; margin: 12px 0; font-size: 12px; color: #991b1b; }
  .alert-box strong { color: #7f1d1d; }
  .vital-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
  .vital-cell { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; font-size: 11px; }
  .vital-cell .label { color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  .vital-cell .value { color: #0f172a; font-weight: 600; font-family: ui-monospace, monospace; }
  .icd-pill { display: inline-block; background: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 600; }
  .signature-block { margin-top: 36px; padding-top: 16px; border-top: 1px solid #cbd5e1; }
  .signature-img { max-height: 60px; max-width: 220px; margin: 4px 0; }
  .signed-badge { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-left: 8px; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${escapeHtml(tenantName)}</h1>
      <p>Expediente Cl\u00ednico</p>
      ${doctorName ? `<div class="doc-info">
        <span><strong>Dr/a.</strong> ${escapeHtml(doctorName)}</span>
        ${doctorCedula ? `<span><strong>C\u00e9d. Prof.</strong> ${escapeHtml(doctorCedula)}</span>` : ''}
        ${doctorCedulaEsp ? `<span><strong>C\u00e9d. Esp.</strong> ${escapeHtml(doctorCedulaEsp)}</span>` : ''}
        ${doctorUniversity ? `<span><strong>Univ.</strong> ${escapeHtml(doctorUniversity)}</span>` : ''}
        ${doctorSsa ? `<span><strong>Reg. SSA</strong> ${escapeHtml(doctorSsa)}</span>` : ''}
      </div>` : ''}
    </div>
    <div class="header-right">
      <p>${dateStr}</p>
      <p>ID: ${record.id.slice(0, 8)}</p>
      ${record.isLocked ? `<p style="color:#047857;font-weight:600;margin-top:4px;">FIRMADA</p>` : ''}
    </div>
  </div>
  <div class="meta">
    <div class="meta-item"><strong>Paciente:</strong> ${escapeHtml(patientName)}${patientAge ? ' \u00b7 ' + patientAge : ''}${patient.gender ? ' \u00b7 ' + escapeHtml(patient.gender) : ''}</div>
    ${patient.curp ? `<div class="meta-item"><strong>CURP:</strong> ${escapeHtml(patient.curp)}</div>` : ''}
    ${patient.bloodType ? `<div class="meta-item"><strong>Tipo de sangre:</strong> ${escapeHtml(patient.bloodType)}</div>` : ''}
    <div class="meta-item"><strong>Tipo:</strong> ${recordTypeLabels[record.recordType] ?? record.recordType}</div>
  </div>

  ${patient.allergies ? `<div class="alert-box"><strong>\u26a0 Alergias:</strong> ${escapeHtml(patient.allergies)}</div>` : ''}

  <div class="title">${escapeHtml(record.title)}</div>

  ${record.vitalSigns && Object.keys(record.vitalSigns as object).length > 0
    ? renderVitalSignsHtml(record.vitalSigns as Record<string, number>)
    : ''}

  <div class="content">${bodyHtml}</div>

  ${(record.diagnosisText || record.diagnosisIcd10) ? `
    <div style="margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0;">
      <h3 style="font-size:13px;color:#0f172a;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Diagn\u00f3stico</h3>
      <p style="margin:0;font-size:14px;">
        ${record.diagnosisText ? escapeHtml(record.diagnosisText) : ''}
        ${record.diagnosisIcd10 ? `<span class="icd-pill">${escapeHtml(record.diagnosisIcd10)}${icd ? ' \u2014 ' + escapeHtml(icd.description) : ''}</span>` : ''}
      </p>
    </div>
  ` : ''}

  ${record.treatmentPlan ? `
    <div style="margin-top:16px;">
      <h3 style="font-size:13px;color:#0f172a;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Plan de tratamiento</h3>
      <p style="margin:0;font-size:14px;white-space:pre-wrap;">${escapeHtml(record.treatmentPlan)}</p>
    </div>
  ` : ''}

  ${record.prognosis ? `
    <div style="margin-top:16px;">
      <h3 style="font-size:13px;color:#0f172a;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Pron\u00f3stico</h3>
      <p style="margin:0;font-size:14px;">${escapeHtml(record.prognosis)}</p>
    </div>
  ` : ''}

  ${attachmentsHtml}

  <div class="signature-block">
    ${doctorSignature ? `<img class="signature-img" src="${doctorSignature}" alt="Firma" />` : '<div style="height:1px;background:#94a3b8;width:240px;margin:30px 0 4px;"></div>'}
    <div style="font-size:12px;color:#0f172a;font-weight:600;">${doctorName ? escapeHtml(doctorName) : ''}</div>
    ${doctorCedula ? `<div style="font-size:11px;color:#475569;">C\u00e9dula Profesional: ${escapeHtml(doctorCedula)}</div>` : ''}
    ${record.isLocked && lockedAtStr ? `
      <div style="margin-top:6px;font-size:10px;color:#047857;">
        Firmada electr\u00f3nicamente el ${lockedAtStr}<span class="signed-badge">NOM-004-SSA3-2012 \u00a74.4</span>
      </div>
    ` : ''}
  </div>

  <div class="footer">
    Generado por ${escapeHtml(tenantName)} &mdash; Powered by AUCTORUM SYSTEMS &mdash; Documento confidencial
  </div>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${encodeURIComponent(record.title || "expediente")}.html"`,
      },
    })
  } catch (err) {
    console.error("Record PDF error:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function renderVitalSignsHtml(vs: Record<string, unknown>): string {
  const cells: Array<[string, string, string]> = []
  const sys = vs.systolic
  const dia = vs.diastolic
  if (sys || dia) cells.push(['Tensión arterial', `${sys ?? '?'}/${dia ?? '?'}`, 'mmHg'])
  if (vs.heartRate) cells.push(['Frecuencia cardíaca', String(vs.heartRate), 'bpm'])
  if (vs.respiratoryRate) cells.push(['Frecuencia resp.', String(vs.respiratoryRate), 'rpm'])
  if (vs.temperature) cells.push(['Temperatura', String(vs.temperature), '°C'])
  if (vs.oxygenSat) cells.push(['Saturación O₂', String(vs.oxygenSat), '%'])
  if (vs.weight) cells.push(['Peso', String(vs.weight), 'kg'])
  if (vs.height) cells.push(['Talla', String(vs.height), 'cm'])
  if (vs.bmi) cells.push(['IMC', String(vs.bmi), ''])
  if (cells.length === 0) return ''
  return `
    <div style="margin:12px 0;">
      <h3 style="font-size:12px;color:#0f172a;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em;">Signos vitales</h3>
      <div class="vital-grid">
        ${cells.map(([l, v, u]) => `
          <div class="vital-cell">
            <div class="label">${escapeHtml(l)}</div>
            <div class="value">${escapeHtml(v)}${u ? ' <span style="font-size:10px;color:#64748b;">' + escapeHtml(u) + '</span>' : ''}</div>
          </div>
        `).join('')}
      </div>
    </div>`
}
