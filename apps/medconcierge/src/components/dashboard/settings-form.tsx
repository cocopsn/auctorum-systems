'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import type { TenantConfig } from '@quote-engine/db'

type Tab = 'profile' | 'credentials' | 'branding' | 'notifications'

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
          // ─── NOM-004 credentials ───
          cedulaProfesional: doctor.cedulaProfesional,
          cedulaEspecialidad: doctor.cedulaEspecialidad,
          university: doctor.university,
          ssaRegistration: doctor.ssaRegistration,
          digitalSignature: doctor.digitalSignature,
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
    { id: 'credentials', label: 'Datos Profesionales' },
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

        {tab === 'credentials' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
              <p className="font-medium">Datos requeridos por NOM-004-SSA3-2012</p>
              <p className="mt-1 text-amber-800">
                Estos datos aparecerán en todas las notas clínicas firmadas y en los PDFs exportados.
                La cédula profesional es <strong>obligatoria</strong> para firmar notas clínicas.
              </p>
            </div>
            <Field
              label="Cédula Profesional *"
              value={doctor.cedulaProfesional ?? ''}
              onChange={(v) => setDoctor((d) => ({ ...d, cedulaProfesional: v }))}
            />
            <Field
              label="Cédula de Especialidad"
              value={doctor.cedulaEspecialidad ?? ''}
              onChange={(v) => setDoctor((d) => ({ ...d, cedulaEspecialidad: v }))}
            />
            <Field
              label="Universidad"
              value={doctor.university ?? ''}
              onChange={(v) => setDoctor((d) => ({ ...d, university: v }))}
            />
            <Field
              label="Registro SSA / COFEPRIS"
              value={doctor.ssaRegistration ?? ''}
              onChange={(v) => setDoctor((d) => ({ ...d, ssaRegistration: v }))}
            />
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Firma digital (PNG en base64)
              </label>
              <input
                type="file"
                accept="image/png"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    const result = reader.result as string
                    setDoctor((d) => ({ ...d, digitalSignature: result }))
                  }
                  reader.readAsDataURL(file)
                }}
                className="text-sm"
              />
              {doctor.digitalSignature && (
                <div className="mt-2 inline-block rounded border border-[var(--border)] bg-white p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={doctor.digitalSignature} alt="Firma" className="h-16 object-contain" />
                </div>
              )}
            </div>
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

        {tab === 'notifications' && (() => {
          const n = config.notifications ?? {} as NonNullable<TenantConfig['notifications']>
          const setN = (patch: Partial<NonNullable<TenantConfig['notifications']>>) =>
            setConfig({ ...config, notifications: { ...n, ...patch } })
          return (
            <div className="space-y-3">
              <Toggle label="WhatsApp al agendar" value={n.whatsapp_on_new_appointment ?? false} onChange={(v) => setN({ whatsapp_on_new_appointment: v })} />
              <Toggle label="Recordatorio 24h (WhatsApp)" value={n.whatsapp_reminder_24h ?? false} onChange={(v) => setN({ whatsapp_reminder_24h: v })} />
              <Toggle label="Recordatorio 2h (WhatsApp)" value={n.whatsapp_reminder_2h ?? false} onChange={(v) => setN({ whatsapp_reminder_2h: v })} />
              <Toggle label="Post-consulta (WhatsApp)" value={n.whatsapp_post_consultation ?? false} onChange={(v) => setN({ whatsapp_post_consultation: v })} />
              <Toggle label="Email al agendar" value={n.email_on_new_appointment ?? false} onChange={(v) => setN({ email_on_new_appointment: v })} />
              <Toggle label="Notificar cancelaciones" value={n.notify_on_cancellation ?? false} onChange={(v) => setN({ notify_on_cancellation: v })} />
              <Toggle label="Agenda diaria (email 7am)" value={n.daily_agenda_email ?? false} onChange={(v) => setN({ daily_agenda_email: v })} />
            </div>
          )
        })()}
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
