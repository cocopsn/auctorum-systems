export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db, clinicalRecords, patients, patientFiles } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"
import { getPatientFileSignedUrl } from "@/lib/storage"
import { generateHTML } from "@tiptap/html"
import StarterKit from "@tiptap/starter-kit"
import Highlight from "@tiptap/extension-highlight"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import Image from "@tiptap/extension-image"

type RouteCtx = { params: { id: string; recordId: string } }

const extensions = [
  StarterKit.configure({ heading: { levels: [2, 3] } }),
  Highlight,
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Image.configure({ inline: true }),
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
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${escapeHtml(tenantName)}</h1>
      <p>Expediente Cl\u00ednico</p>
    </div>
    <div class="header-right">
      <p>${dateStr}</p>
      <p>ID: ${record.id.slice(0, 8)}</p>
    </div>
  </div>
  <div class="meta">
    <div class="meta-item"><strong>Paciente:</strong> ${escapeHtml(patientName)}</div>
    <div class="meta-item"><strong>Tipo:</strong> ${recordTypeLabels[record.recordType] ?? record.recordType}</div>
  </div>
  <div class="title">${escapeHtml(record.title)}</div>
  <div class="content">${bodyHtml}</div>
  ${attachmentsHtml}
  <div class="footer">
    Generado por ${escapeHtml(tenantName)} &mdash; Documento confidencial
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
