export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getAuthTenant } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import crypto from "crypto"
import { validateOrigin } from '@/lib/csrf'

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "portal")
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"])

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido. Use JPG, PNG, WebP, GIF o SVG." }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Archivo demasiado grande. Maximo 5MB." }, { status: 400 })
    }

    // Create tenant-specific upload directory
    const tenantDir = join(UPLOAD_DIR, auth.tenant.id)
    await mkdir(tenantDir, { recursive: true })

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg"
    const hash = crypto.randomBytes(8).toString("hex")
    const filename = `${Date.now()}-${hash}.${ext}`
    const filePath = join(tenantDir, filename)

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const url = `/uploads/portal/${auth.tenant.id}/${filename}`

    return NextResponse.json({ url, filename, size: file.size })
  } catch (error) {
    console.error("Portal upload error:", error)
    return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 })
  }
}
