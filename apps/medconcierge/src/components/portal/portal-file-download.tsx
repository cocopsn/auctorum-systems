'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

export function PortalFileDownload({
  token,
  fileId,
  filename,
}: {
  token: string
  fileId: string
  filename: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/${token}/files/${fileId}`)
      if (!res.ok) return
      const { url } = await res.json()
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      /* silent — user can retry */
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline disabled:opacity-50"
      title="Descargar"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      <span className="truncate max-w-[200px]">{filename}</span>
    </button>
  )
}
