"use client"

import { useState, useRef } from "react"
import { Camera, Loader2 } from "lucide-react"

interface PatientAvatarProps {
  patientId: string
  currentAvatarUrl?: string | null
  name: string
  size?: "sm" | "md" | "lg"
  editable?: boolean
  onUpload?: (url: string) => void
}

const SIZE_MAP = {
  sm: { container: "w-8 h-8", text: "text-[10px]", icon: "w-3 h-3" },
  md: { container: "w-12 h-12", text: "text-xs", icon: "w-3.5 h-3.5" },
  lg: { container: "w-16 h-16", text: "text-base", icon: "w-4 h-4" },
} as const

export function PatientAvatar({
  patientId,
  currentAvatarUrl,
  name,
  size = "md",
  editable = false,
  onUpload,
}: PatientAvatarProps) {
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const s = SIZE_MAP[size]

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Máximo 5 MB")
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch(`/api/dashboard/patients/${patientId}/avatar`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Error al subir imagen")
      }

      const { url } = await res.json()
      setAvatarUrl(url)
      onUpload?.(url)
    } catch (err: any) {
      setError(err?.message || "Error al subir")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative group">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={`${s.container} rounded-full object-cover border-2 border-slate-200`}
        />
      ) : (
        <div
          className={`${s.container} rounded-full bg-teal-50 text-teal-700 font-semibold flex items-center justify-center border-2 border-teal-200 ${s.text}`}
        >
          {initials}
        </div>
      )}

      {editable && !uploading && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          >
            <Camera className={`${s.icon} text-white`} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
        </>
      )}

      {uploading && (
        <div className="absolute inset-0 rounded-full bg-white/80 flex items-center justify-center">
          <Loader2 className={`${s.icon} animate-spin text-teal-600`} />
        </div>
      )}

      {error && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-red-500 bg-white border border-red-200 rounded px-1.5 py-0.5 shadow-sm">
          {error}
        </div>
      )}
    </div>
  )
}
