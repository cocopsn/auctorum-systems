export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { db, patients } from "@quote-engine/db"
import { getAuthTenant } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js"
import { validateOrigin } from "@/lib/csrf"

const BUCKET = "patient-files"

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase env vars")
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    if (!validateOrigin(req)) return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });

    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))
      .limit(1)

    if (!patient) return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Archivo demasiado grande (máx 5MB)" }, { status: 400 })
    }

    const ext = file.type.split("/")[1] || "jpg"
    const storagePath = `${auth.tenant.id}/${params.id}/avatar.${ext}`

    const supabase = getServiceClient()

    // Upload (upsert to overwrite previous avatar)
    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      })

    if (uploadError) {
      console.error("[Avatar Upload]", uploadError)
      return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 })
    }

    // Get signed URL (short-lived, 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 3600) // 1 hour — LOW-09: reduced from 365 days

    if (urlError || !urlData?.signedUrl) {
      return NextResponse.json({ error: "Error al generar URL" }, { status: 500 })
    }

    // Update patient record
    await db
      .update(patients)
      .set({ avatarUrl: urlData.signedUrl, updatedAt: new Date() })
      .where(and(eq(patients.id, params.id), eq(patients.tenantId, auth.tenant.id)))

    return NextResponse.json({ url: urlData.signedUrl })
  } catch (err) {
    console.error("[Avatar Upload Error]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
