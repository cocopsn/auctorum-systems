"use client"

import { useState, useEffect, useRef } from "react"
import {
  Upload, Download, Trash2, FileText, Image as ImageIcon, AlertCircle,
} from "lucide-react"

type FileItem = {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  storagePath: string
  description: string | null
  createdAt: string
}

type Props = {
  patientId: string
  recordId?: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric", month: "short", year: "numeric",
  }).format(new Date(date))
}

export default function ClinicalFileGallery({ patientId, recordId }: Props) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/dashboard/patients/${patientId}/files`)
      .then(r => r.json())
      .then(d => setFiles(d.files ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [patientId])

  async function handleUpload(file: File) {
    setError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const url = recordId
        ? `/api/dashboard/patients/${patientId}/records/${recordId}/files`
        : `/api/dashboard/patients/${patientId}/files`
      const res = await fetch(url, { method: "POST", body: form })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Upload failed")
      }
      const listRes = await fetch(`/api/dashboard/patients/${patientId}/files`)
      const listData = await listRes.json()
      setFiles(listData.files ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleDownload(fileId: string) {
    try {
      const res = await fetch(`/api/dashboard/patients/${patientId}/files/${fileId}`)
      const data = await res.json()
      if (data.url) window.open(data.url, "_blank", "noopener")
    } catch { setError("Error al descargar") }
  }

  async function handleDelete(fileId: string, filename: string) {
    if (!confirm(`\u00bfEliminar "${filename}"?`)) return
    try {
      await fetch(`/api/dashboard/patients/${patientId}/files/${fileId}`, { method: "DELETE" })
      setFiles(prev => prev.filter(f => f.id !== fileId))
    } catch { setError("Error al eliminar") }
  }

  const images = files.filter(f => f.mimeType.startsWith("image/"))
  const docs = files.filter(f => !f.mimeType.startsWith("image/"))

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault(); setDragOver(false)
          const f = e.dataTransfer.files?.[0]
          if (f) handleUpload(f)
        }}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragOver ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        <p className="text-sm text-slate-600 mb-1">Arrastra un archivo o haz click para seleccionar</p>
        <p className="text-xs text-slate-400 mb-3">PDF, JPG, PNG, WEBP, HEIC \u2014 m\u00e1x 10 MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-60"
        >
          {uploading ? "Subiendo..." : "Subir archivo"}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-8">Cargando archivos...</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Sin archivos</p>
      ) : (
        <>
          {images.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Im\u00e1genes</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map(img => (
                  <div key={img.id} className="group relative bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <div
                      className="aspect-square bg-slate-50 flex items-center justify-center cursor-pointer"
                      onClick={() => handleDownload(img.id)}
                    >
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-slate-700 font-medium truncate">{img.filename}</p>
                      <p className="text-[10px] text-slate-400">{formatSize(img.sizeBytes)}</p>
                    </div>
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                      <button onClick={() => handleDownload(img.id)} className="p-1 bg-white/90 rounded shadow-sm text-slate-500 hover:text-teal-600">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(img.id, img.filename)} className="p-1 bg-white/90 rounded shadow-sm text-slate-500 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {docs.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Documentos</h3>
              <div className="space-y-2">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-3 group">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{doc.filename}</p>
                      <p className="text-xs text-slate-400">{formatSize(doc.sizeBytes)} \u00b7 {formatDate(doc.createdAt)}</p>
                    </div>
                    <button onClick={() => handleDownload(doc.id)} className="p-2 text-slate-400 hover:text-teal-600 transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(doc.id, doc.filename)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
