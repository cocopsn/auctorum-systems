'use client'

/**
 * Settings → Publicidad
 *
 * Dos cards: Facebook/Instagram Lead Ads (Meta) y Google Ads Lead Forms.
 * Cada card permite conectar (page_id + access_token / customer_id), togglear
 * auto-contacto, editar el mensaje, ver el webhook URL para configurar en
 * la cuenta del doctor, y rotar/eliminar la conexión.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Megaphone,
  Facebook,
  Globe2,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  RefreshCcw,
  Trash2,
} from 'lucide-react'

type AdsState = {
  meta: {
    status: string
    pageId: string | null
    pageName: string | null
    accessToken: string | null
    formIds: string[]
    autoContact: boolean
    autoContactMessage: string
    connectedAt: string | null
  } | null
  google: {
    status: string
    webhookToken: string | null
    customerId: string | null
    autoContact: boolean
    autoContactMessage: string
    connectedAt: string | null
  } | null
}

const SITE_ORIGIN =
  typeof window !== 'undefined'
    ? window.location.origin
    : 'https://med.auctorum.com.mx'

export default function AdsSettingsPage() {
  const [state, setState] = useState<AdsState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingMeta, setSavingMeta] = useState(false)
  const [savingGoogle, setSavingGoogle] = useState(false)
  const [rotated, setRotated] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/settings/ads', { credentials: 'include' })
      if (!res.ok) throw new Error(await res.text())
      setState(await res.json())
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

  async function saveMeta(form: {
    pageId: string
    pageName?: string
    accessToken?: string
    autoContact: boolean
    autoContactMessage: string
  }) {
    setSavingMeta(true)
    try {
      const res = await fetch('/api/dashboard/settings/ads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ kind: 'meta_ads', ...form }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || 'Error al guardar')
      await refresh()
    } catch (err: any) {
      alert(err?.message || 'Error')
    } finally {
      setSavingMeta(false)
    }
  }

  async function saveGoogle(form: {
    customerId?: string
    autoContact: boolean
    autoContactMessage: string
  }) {
    setSavingGoogle(true)
    try {
      const res = await fetch('/api/dashboard/settings/ads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ kind: 'google_ads', ...form }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || 'Error al guardar')
      await refresh()
    } catch (err: any) {
      alert(err?.message || 'Error')
    } finally {
      setSavingGoogle(false)
    }
  }

  async function rotateGoogleToken() {
    if (!confirm('Rotar el token invalidará el actual. Los webhooks pendientes con el viejo token serán rechazados. ¿Continuar?')) {
      return
    }
    try {
      const res = await fetch('/api/dashboard/settings/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ kind: 'google_ads' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Error')
      setRotated(json.webhookToken)
      await refresh()
    } catch (err: any) {
      alert(err?.message || 'Error')
    }
  }

  async function disconnect(kind: 'meta_ads' | 'google_ads') {
    if (!confirm('¿Desconectar esta integración? Los leads existentes no se borran.')) return
    try {
      const res = await fetch(`/api/dashboard/settings/ads?kind=${kind}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(await res.text())
      await refresh()
    } catch (err: any) {
      alert(err?.message || 'Error')
    }
  }

  return (
    <div className="px-6 py-6">
      <header className="mb-6 flex items-center gap-3">
        <Megaphone className="h-6 w-6 text-cyan-700" />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Publicidad</h1>
          <p className="text-sm text-slate-500">
            Conecta tus campañas de Lead Ads para que los leads lleguen al CRM y reciban WhatsApp automáticamente.
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
        <div className="grid gap-6 lg:grid-cols-2">
          <MetaCard
            initial={state?.meta}
            saving={savingMeta}
            onSave={saveMeta}
            onDisconnect={() => disconnect('meta_ads')}
          />
          <GoogleCard
            initial={state?.google}
            saving={savingGoogle}
            onSave={saveGoogle}
            onDisconnect={() => disconnect('google_ads')}
            onRotate={rotateGoogleToken}
            rotatedToken={rotated}
            siteOrigin={SITE_ORIGIN}
          />
        </div>
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

function CopyButton({ value, label }: { value: string; label?: string }) {
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
      {copied ? 'Copiado' : label ?? 'Copiar'}
    </button>
  )
}

function MetaCard({
  initial,
  saving,
  onSave,
  onDisconnect,
}: {
  initial: AdsState['meta']
  saving: boolean
  onSave: (form: any) => Promise<void>
  onDisconnect: () => void
}) {
  const [pageId, setPageId] = useState(initial?.pageId ?? '')
  const [pageName, setPageName] = useState(initial?.pageName ?? '')
  const [accessToken, setAccessToken] = useState('')
  const [autoContact, setAutoContact] = useState(initial?.autoContact ?? true)
  const [message, setMessage] = useState(initial?.autoContactMessage ?? '')

  useEffect(() => {
    setPageId(initial?.pageId ?? '')
    setPageName(initial?.pageName ?? '')
    setAutoContact(initial?.autoContact ?? true)
    setMessage(initial?.autoContactMessage ?? '')
  }, [initial])

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <header className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Facebook className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">Facebook / Instagram Lead Ads</h2>
            <p className="text-xs text-slate-500">Captura leads de tus formularios de Meta.</p>
          </div>
        </div>
        <StatusPill ok={!!initial && initial.status === 'connected'} />
      </header>

      <div className="space-y-3">
        <Field label="Page ID">
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
        <Field
          label="Page Access Token"
          hint={
            initial?.accessToken
              ? `Actual: ${initial.accessToken} — deja vacío para no cambiar`
              : 'Long-lived page token con permisos `leads_retrieval`, `pages_show_list`, `pages_read_engagement`.'
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

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={autoContact}
              onChange={(e) => setAutoContact(e.target.checked)}
            />
            Enviar WhatsApp automático a cada lead
          </label>
          <Field label="Mensaje (deja vacío para usar el default)" hint="Soporta saltos de línea y emojis.">
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="¡Hola! Gracias por su interés..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-medium">Webhook URL para configurar en Meta App:</p>
          <code className="mt-1 block break-all">{`${SITE_ORIGIN}/api/webhooks/meta-leads`}</code>
          <p className="mt-1">
            Suscríbelo al objeto <code>page</code> con el campo <code>leadgen</code>. El verify token vive en
            la env <code>META_LEADS_VERIFY_TOKEN</code> (consulta a Auctorum).
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {initial && (
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
            disabled={saving || !pageId}
            onClick={() =>
              onSave({
                pageId: pageId.trim(),
                pageName: pageName.trim() || undefined,
                accessToken: accessToken.trim() || undefined,
                autoContact,
                autoContactMessage: message,
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

function GoogleCard({
  initial,
  saving,
  onSave,
  onDisconnect,
  onRotate,
  rotatedToken,
  siteOrigin,
}: {
  initial: AdsState['google']
  saving: boolean
  onSave: (form: any) => Promise<void>
  onDisconnect: () => void
  onRotate: () => void
  rotatedToken: string | null
  siteOrigin: string
}) {
  const [customerId, setCustomerId] = useState(initial?.customerId ?? '')
  const [autoContact, setAutoContact] = useState(initial?.autoContact ?? true)
  const [message, setMessage] = useState(initial?.autoContactMessage ?? '')

  useEffect(() => {
    setCustomerId(initial?.customerId ?? '')
    setAutoContact(initial?.autoContact ?? true)
    setMessage(initial?.autoContactMessage ?? '')
  }, [initial])

  const webhookUrl = `${siteOrigin}/api/webhooks/google-leads`

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <header className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-emerald-600" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">Google Ads Lead Forms</h2>
            <p className="text-xs text-slate-500">
              Webhook autenticado por token — configura URL + key en Google Ads.
            </p>
          </div>
        </div>
        <StatusPill ok={!!initial && initial.status === 'connected'} />
      </header>

      <div className="space-y-3">
        <Field label="Customer ID (opcional, solo informativo)">
          <input
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="123-456-7890"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </Field>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-800">Webhook URL</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-white px-2 py-1 text-xs text-slate-700">
              {webhookUrl}
            </code>
            <CopyButton value={webhookUrl} />
          </div>

          <p className="mt-3 font-medium text-slate-800">Webhook Key</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-white px-2 py-1 text-xs text-slate-700">
              {rotatedToken ?? initial?.webhookToken ?? '(se genera al guardar)'}
            </code>
            {(rotatedToken || initial?.webhookToken) && (
              <CopyButton
                value={rotatedToken ?? ''}
                label={rotatedToken ? 'Copiar nuevo' : 'Solo último visible'}
              />
            )}
            <button
              type="button"
              onClick={onRotate}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              <RefreshCcw className="h-3 w-3" />
              Rotar
            </button>
          </div>
          {rotatedToken && (
            <p className="mt-2 text-xs text-amber-800">
              ⚠ Este token solo se muestra UNA vez. Cópialo ahora — después solo se mostrará enmascarado.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={autoContact}
              onChange={(e) => setAutoContact(e.target.checked)}
            />
            Enviar WhatsApp automático a cada lead
          </label>
          <Field label="Mensaje (deja vacío para usar el default)">
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="¡Hola! Gracias por contactar..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          {initial && (
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
            disabled={saving}
            onClick={() =>
              onSave({
                customerId: customerId.trim() || undefined,
                autoContact,
                autoContactMessage: message,
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
