'use client'

/**
 * Settings → Instagram DMs
 *
 * Conecta el inbox unificado al Instagram Business del consultorio. La cuenta
 * IG debe estar vinculada a una Página de Facebook (requerido por Meta) y el
 * token tiene que tener scopes `instagram_basic`, `instagram_manage_messages`,
 * `pages_messaging`, `pages_show_list`.
 */

import { useCallback, useEffect, useState } from 'react'
import { Instagram, CheckCircle2, XCircle, Loader2, Copy, Trash2 } from 'lucide-react'

type State = {
  status: string
  pageId: string | null
  pageName: string | null
  igAccountId: string | null
  accessToken: string | null
  connectedAt: string | null
} | null

const SITE_ORIGIN =
  typeof window !== 'undefined' ? window.location.origin : 'https://med.auctorum.com.mx'

export default function InstagramSettingsPage() {
  const [state, setState] = useState<State>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/settings/instagram', { credentials: 'include' })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setState(data.instagram)
      setError(null)
    } catch (err: any) {
      setError(err?.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div className="px-6 py-6">
      <header className="mb-6 flex items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 via-fuchsia-500 to-orange-400 text-white">
          <Instagram className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Instagram DMs</h1>
          <p className="text-sm text-slate-500">
            Recibe DMs en el mismo inbox que WhatsApp. Las respuestas que envías desde
            Conversaciones se mandan por Instagram automáticamente.
          </p>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading && !state ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <Card
          state={state}
          saving={saving}
          siteOrigin={SITE_ORIGIN}
          onSave={async (form) => {
            setSaving(true)
            try {
              const res = await fetch('/api/dashboard/settings/instagram', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form),
              })
              if (!res.ok) {
                const j = await res.json().catch(() => ({}))
                throw new Error(j?.error || 'Error al guardar')
              }
              await refresh()
            } catch (e: any) {
              alert(e?.message || 'Error')
            } finally {
              setSaving(false)
            }
          }}
          onDisconnect={async () => {
            if (
              !confirm(
                '¿Desconectar Instagram? Las conversaciones existentes no se borran, pero los nuevos DMs ya no llegarán.',
              )
            )
              return
            try {
              const res = await fetch('/api/dashboard/settings/instagram', {
                method: 'DELETE',
                credentials: 'include',
              })
              if (!res.ok) throw new Error(await res.text())
              await refresh()
            } catch (e: any) {
              alert(e?.message || 'Error')
            }
          }}
        />
      )}
    </div>
  )
}

function StatusPill({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      <XCircle className="h-3.5 w-3.5" /> No conectado
    </span>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
    >
      <Copy className="h-3 w-3" />
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

function Card({
  state,
  saving,
  siteOrigin,
  onSave,
  onDisconnect,
}: {
  state: State
  saving: boolean
  siteOrigin: string
  onSave: (form: { pageId: string; pageName?: string; igAccountId?: string; accessToken?: string }) => Promise<void>
  onDisconnect: () => void
}) {
  const [pageId, setPageId] = useState(state?.pageId ?? '')
  const [pageName, setPageName] = useState(state?.pageName ?? '')
  const [igAccountId, setIgAccountId] = useState(state?.igAccountId ?? '')
  const [accessToken, setAccessToken] = useState('')

  useEffect(() => {
    setPageId(state?.pageId ?? '')
    setPageName(state?.pageName ?? '')
    setIgAccountId(state?.igAccountId ?? '')
  }, [state])

  const webhookUrl = `${siteOrigin}/api/webhooks/instagram`

  return (
    <section className="max-w-2xl rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Conexión a Meta</h2>
        <StatusPill ok={!!state && state.status === 'connected'} />
      </div>

      <div className="space-y-3">
        <Field label="Page ID" hint="ID de la página de Facebook que tiene vinculada la cuenta de Instagram Business.">
          <input
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            placeholder="123456789012345"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Page name (opcional)">
          <input
            value={pageName}
            onChange={(e) => setPageName(e.target.value)}
            placeholder="Consultorio Dr. García"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Instagram Business Account ID (opcional)">
          <input
            value={igAccountId}
            onChange={(e) => setIgAccountId(e.target.value)}
            placeholder="17841400000000000"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>
        <Field
          label="Page Access Token"
          hint={
            state?.accessToken
              ? `Actual: ${state.accessToken} — deja vacío para no cambiar`
              : 'Long-lived token con scopes instagram_basic, instagram_manage_messages, pages_messaging, pages_show_list.'
          }
        >
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="EAAB••••••••"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-medium">Webhook URL para configurar en Meta App:</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 break-all">{webhookUrl}</code>
            <CopyButton value={webhookUrl} />
          </div>
          <p className="mt-2">
            Suscribe el campo <code>messages</code> del objeto <code>instagram</code> con el verify
            token <code>META_LEADS_VERIFY_TOKEN</code> (ya configurado en el VPS — pídelo al equipo
            si lo necesitas).
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {state && (
            <button
              type="button"
              onClick={onDisconnect}
              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
            >
              <Trash2 className="h-3.5 w-3.5" /> Desconectar
            </button>
          )}
          <button
            type="button"
            disabled={saving || !pageId.trim()}
            onClick={() =>
              onSave({
                pageId: pageId.trim(),
                pageName: pageName.trim() || undefined,
                igAccountId: igAccountId.trim() || undefined,
                accessToken: accessToken.trim() || undefined,
              })
            }
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  )
}
