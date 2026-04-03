'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import type { TenantConfig } from '@quote-engine/db'

type Tab = 'profile' | 'branding' | 'notifications'

export function SettingsForm() {
  const [tab, setTab] = useState<Tab>('profile')
  const [config, setConfig] = useState<TenantConfig | null>(null)
  const [doctor, setDoctor] = useState<Record<string, string | null>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.tenant?.config) setConfig(data.tenant.config as TenantConfig)
        if (data.doctor) setDoctor(data.doctor)
      })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    await fetch('/api/dashboard/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config,
        doctorProfile: {
          bio: doctor.bio,
          education: doctor.education,
          hospitalAffiliations: doctor.hospitalAffiliations,
          consultationFee: doctor.consultationFee,
          languages: doctor.languages,
        },
      }),
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (!config) return <div className="text-[var(--text-tertiary)]">Cargando...</div>

  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Perfil Médico' },
    { id: 'branding', label: 'Colores' },
    { id: 'notifications', label: 'Notificaciones' },
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[var(--bg-tertiary)] rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6">
        {tab === 'profile' && (
          <div className="space-y-4">
            <Field label="Bio" multiline value={doctor.bio ?? ''} onChange={(v) => setDoctor((d) => ({ ...d, bio: v }))} />
            <Field label="Educación" multiline value={doctor.education ?? ''} onChange={(v) => setDoctor((d) => ({ ...d, education: v }))} />
            <Field label="Hospitales" multiline value={doctor.hospitalAffiliations ?? ''} onChange={(v) => setDoctor((d) => ({ ...d, hospitalAffiliations: v }))} />
            <Field label="Costo de consulta" value={doctor.consultationFee ?? ''} onChange={(v) => setDoctor((d) => ({ ...d, consultationFee: v }))} />
            <Field label="Idiomas" value={doctor.languages ?? ''} onChange={(v) => setDoctor((d) => ({ ...d, languages: v }))} />
          </div>
        )}

        {tab === 'branding' && (
          <div className="space-y-4">
            <ColorField label="Color primario" value={config.colors.primary} onChange={(v) => setConfig({ ...config, colors: { ...config.colors, primary: v } })} />
            <ColorField label="Color secundario" value={config.colors.secondary} onChange={(v) => setConfig({ ...config, colors: { ...config.colors, secondary: v } })} />
            <ColorField label="Color acento" value={config.colors.accent ?? ''} onChange={(v) => setConfig({ ...config, colors: { ...config.colors, accent: v } })} />
            <div className="mt-4 p-4 rounded-lg" style={{ background: config.colors.primary }}>
              <p className="text-white font-medium">Vista previa</p>
              <p className="text-white/70 text-sm">Así se verá el color primario en el portal.</p>
            </div>
          </div>
        )}

        {tab === 'notifications' && (
          <div className="space-y-3">
            <Toggle label="WhatsApp al agendar" value={config.notifications!.whatsapp_on_new_appointment ?? false} onChange={(v) => setConfig({ ...config, notifications: { ...config.notifications!, whatsapp_on_new_appointment: v } })} />
            <Toggle label="Recordatorio 24h (WhatsApp)" value={config.notifications!.whatsapp_reminder_24h ?? false} onChange={(v) => setConfig({ ...config, notifications: { ...config.notifications!, whatsapp_reminder_24h: v } })} />
            <Toggle label="Recordatorio 2h (WhatsApp)" value={config.notifications!.whatsapp_reminder_2h ?? false} onChange={(v) => setConfig({ ...config, notifications: { ...config.notifications!, whatsapp_reminder_2h: v } })} />
            <Toggle label="Post-consulta (WhatsApp)" value={config.notifications!.whatsapp_post_consultation ?? false} onChange={(v) => setConfig({ ...config, notifications: { ...config.notifications!, whatsapp_post_consultation: v } })} />
            <Toggle label="Email al agendar" value={config.notifications!.email_on_new_appointment ?? false} onChange={(v) => setConfig({ ...config, notifications: { ...config.notifications!, email_on_new_appointment: v } })} />
            <Toggle label="Notificar cancelaciones" value={config.notifications!.notify_on_cancellation ?? false} onChange={(v) => setConfig({ ...config, notifications: { ...config.notifications!, notify_on_cancellation: v } })} />
            <Toggle label="Agenda diaria (email 7am)" value={config.notifications!.daily_agenda_email ?? false} onChange={(v) => setConfig({ ...config, notifications: { ...config.notifications!, daily_agenda_email: v } })} />
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> Guardar</>}
        </button>
        {saved && <span className="text-sm text-[var(--success)]">Configuración guardada</span>}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  const cls = 'w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30'
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={`${cls} resize-none`} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 rounded border border-[var(--border)] cursor-pointer" />
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="mt-0.5 px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded text-xs font-mono text-[var(--text-primary)] w-24" />
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}
