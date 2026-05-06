'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  User, Users, Activity, AlertTriangle, Heart, FileText, Stethoscope,
  Search, Pill, TrendingUp, Loader2, Check, AlertCircle, Plus, Trash2, ArrowLeft,
} from 'lucide-react'

import { VitalSignsForm } from '@/components/clinical/vital-signs-form'
import { Icd10Picker } from '@/components/clinical/icd10-picker'
import type {
  ClinicalHistory, IdentificationSection, TabId,
  HeredoFamiliares, NoPatologicos, Patologicos, GinecoObstetricos,
  PadecimientoActual, ExploracionFisica, Diagnostico, PlanTratamiento, Pronostico,
  CirugiaItem, HospitalizacionItem, MedicamentoItem, VitalSignsValue,
} from '@/components/clinical/historia-clinica/types'

// ─── Tab definitions ───
interface TabDef {
  id: TabId
  label: string
  icon: typeof User
  womenOnly?: boolean
}
const TABS: TabDef[] = [
  { id: 'identificacion',     label: 'Identificación',      icon: User },
  { id: 'heredofamiliares',   label: 'Heredo-Familiares',   icon: Users },
  { id: 'no_patologicos',     label: 'No Patológicos',      icon: Activity },
  { id: 'patologicos',        label: 'Patológicos',         icon: AlertTriangle },
  { id: 'gineco_obstetricos', label: 'Gineco-Obstétricos',  icon: Heart, womenOnly: true },
  { id: 'padecimiento_actual',label: 'Padecimiento Actual', icon: FileText },
  { id: 'exploracion_fisica', label: 'Exploración Física',  icon: Stethoscope },
  { id: 'diagnostico',        label: 'Diagnóstico',         icon: Search },
  { id: 'tratamiento',        label: 'Tratamiento',         icon: Pill },
  { id: 'pronostico',         label: 'Pronóstico',          icon: TrendingUp },
]

const PARENTESCO_OPTIONS = ['Padre', 'Madre', 'Hermanos', 'Abuelo paterno', 'Abuela paterna', 'Abuelo materno', 'Abuela materna', 'Tíos']
const VIA_OPTIONS = ['Oral', 'IV', 'IM', 'Sublingual', 'Tópica', 'Inhalada', 'Rectal', 'Subcutánea']
const FREQ_OPTIONS = ['Cada 4h', 'Cada 6h', 'Cada 8h', 'Cada 12h', 'Cada 24h', 'PRN', 'Antes de dormir']

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function HistoriaClinicaPage() {
  const params = useParams<{ id: string }>()
  const patientId = (params?.id ?? '') as string

  const [activeTab, setActiveTab] = useState<TabId>('identificacion')
  const [loading, setLoading] = useState(true)
  const [identification, setIdentification] = useState<IdentificationSection>({})
  const [history, setHistory] = useState<ClinicalHistory>({})
  const [save, setSave] = useState<SaveStatus>('idle')
  const [err, setErr] = useState<string | null>(null)

  // Debounced autosave: keep latest payload per tab and flush after 1.5s.
  const debounceRef = useRef<{ tab: TabId | null; data: any; timer: any }>({ tab: null, data: null, timer: null })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/patients/${patientId}/clinical-history`)
      if (!res.ok) throw new Error()
      const j = await res.json()
      setIdentification(j.identification ?? {})
      setHistory(j.clinicalHistory ?? {})
    } catch {
      setErr('No se pudo cargar la historia clínica')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { load() }, [load])

  const persist = useCallback(async (tab: TabId, data: any) => {
    setSave('saving')
    setErr(null)
    try {
      const res = await fetch(`/api/dashboard/patients/${patientId}/clinical-history`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab, data }),
      })
      if (!res.ok) throw new Error()
      setSave('saved')
      setTimeout(() => setSave('idle'), 2000)
    } catch {
      setSave('error')
      setErr('Error al guardar — se reintentará al siguiente cambio')
    }
  }, [patientId])

  // Schedule a debounced save.
  const queue = useCallback((tab: TabId, data: any) => {
    if (debounceRef.current.timer) clearTimeout(debounceRef.current.timer)
    debounceRef.current.tab = tab
    debounceRef.current.data = data
    debounceRef.current.timer = setTimeout(() => {
      persist(tab, data)
    }, 1500)
  }, [persist])

  const showGineco = (identification.gender ?? '').toLowerCase().startsWith('femen')
  const visibleTabs = TABS.filter((t) => !t.womenOnly || showGineco)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando historia clínica…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/pacientes/${patientId}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Volver al paciente
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Historia Clínica</h1>
          <p className="text-sm text-gray-500">{identification.name ?? 'Paciente'} — NOM-004-SSA3-2012</p>
        </div>
        <SaveBadge status={save} err={err} />
      </div>

      {/* Critical allergies banner — always visible if set */}
      {identification.allergies && identification.allergies.trim() !== '' && (
        <div className="mb-4 rounded-lg border-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <strong className="font-semibold">⚠ ALERGIAS:</strong> {identification.allergies}
        </div>
      )}

      <div className="flex gap-4">
        {/* Tabs sidebar */}
        <nav className="hidden lg:flex flex-col w-56 shrink-0 gap-1">
          {visibleTabs.map((t) => {
            const Icon = t.icon
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  active
                    ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t.label}
              </button>
            )
          })}
        </nav>

        {/* Mobile tab pills */}
        <select
          className="lg:hidden mb-4 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabId)}
        >
          {visibleTabs.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>

        {/* Tab content */}
        <div className="flex-1 min-w-0 card-soft p-5">
          {activeTab === 'identificacion'      && <IdentificacionTab v={identification} onChange={(d) => { setIdentification(d); queue('identificacion', d) }} />}
          {activeTab === 'heredofamiliares'    && <HeredoFamiliaresTab v={history.heredofamiliares ?? {}} onChange={(d) => { setHistory((h) => ({ ...h, heredofamiliares: d })); queue('heredofamiliares', d) }} />}
          {activeTab === 'no_patologicos'      && <NoPatologicosTab v={history.no_patologicos ?? {}} onChange={(d) => { setHistory((h) => ({ ...h, no_patologicos: d })); queue('no_patologicos', d) }} />}
          {activeTab === 'patologicos'         && <PatologicosTab v={history.patologicos ?? {}} onChange={(d) => { setHistory((h) => ({ ...h, patologicos: d })); queue('patologicos', d) }} />}
          {activeTab === 'gineco_obstetricos'  && showGineco && <GinecoTab v={history.gineco_obstetricos ?? {}} onChange={(d) => { setHistory((h) => ({ ...h, gineco_obstetricos: d })); queue('gineco_obstetricos', d) }} />}
          {activeTab === 'padecimiento_actual' && <PadecimientoTab v={history.padecimiento_actual ?? {}} onChange={(d) => { setHistory((h) => ({ ...h, padecimiento_actual: d })); queue('padecimiento_actual', d) }} />}
          {activeTab === 'exploracion_fisica'  && <ExploracionTab v={history.exploracion_fisica ?? {}} onChange={(d) => { setHistory((h) => ({ ...h, exploracion_fisica: d })); queue('exploracion_fisica', d) }} />}
          {activeTab === 'diagnostico'         && <DiagnosticoTab v={history.diagnostico ?? {}} onChange={(d) => { setHistory((h) => ({ ...h, diagnostico: d })); queue('diagnostico', d) }} />}
          {activeTab === 'tratamiento'         && <TratamientoTab v={history.tratamiento ?? {}} onChange={(d) => { setHistory((h) => ({ ...h, tratamiento: d })); queue('tratamiento', d) }} />}
          {activeTab === 'pronostico'          && <PronosticoTab v={history.pronostico ?? {}} onChange={(d) => { setHistory((h) => ({ ...h, pronostico: d })); queue('pronostico', d) }} />}
        </div>
      </div>
    </div>
  )
}

// ─── Save badge ───
function SaveBadge({ status, err }: { status: SaveStatus; err: string | null }) {
  if (status === 'saving') return <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Loader2 className="h-3 w-3 animate-spin" /> Guardando…</span>
  if (status === 'saved')  return <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3 w-3" /> Guardado</span>
  if (status === 'error')  return <span className="inline-flex items-center gap-1 text-xs text-rose-600" title={err ?? ''}><AlertCircle className="h-3 w-3" /> Error al guardar</span>
  return <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">Auto-guardado</span>
}

// ─── Tab 1: Identificación ───
function IdentificacionTab({ v, onChange }: { v: IdentificationSection; onChange: (d: IdentificationSection) => void }) {
  const set = <K extends keyof IdentificationSection>(k: K, val: IdentificationSection[K]) => onChange({ ...v, [k]: val })
  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Ficha de Identificación</h2>
      <p className="text-xs text-gray-500">Los cambios aquí también actualizan la ficha del paciente.</p>

      {v.allergies && (
        <div className="rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800">
          <strong>⚠ Alergias registradas:</strong> {v.allergies}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Nombre completo" value={v.name ?? ''} onChange={(s) => set('name', s)} />
        <Field label="CURP" value={v.curp ?? ''} onChange={(s) => set('curp', s)} maxLength={18} placeholder="GOMA800101HDFAAA09" />
        <Field label="Fecha de nacimiento" type="date" value={v.birth_date ?? ''} onChange={(s) => set('birth_date', s)} />
        <Select label="Sexo" value={v.gender ?? ''} onChange={(s) => set('gender', s)}
          options={['', 'masculino', 'femenino', 'otro', 'prefiero no decir']} />
        <Select label="Tipo de sangre" value={v.blood_type ?? ''} onChange={(s) => set('blood_type', s)}
          options={['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} />
        <Select label="Estado civil" value={v.marital_status ?? ''} onChange={(s) => set('marital_status', s)}
          options={['', 'soltero', 'casado', 'divorciado', 'viudo', 'unión libre']} />
        <Field label="Ocupación" value={v.occupation ?? ''} onChange={(s) => set('occupation', s)} />
        <Field label="Email" type="email" value={v.email ?? ''} onChange={(s) => set('email', s)} />
        <Field label="Teléfono" value={v.phone ?? ''} onChange={() => {}} disabled />
      </div>

      <Textarea label="Domicilio" value={v.address ?? ''} onChange={(s) => set('address', s)} rows={2} />
      <Textarea
        label="Alergias (incluyendo medicamentos)"
        value={v.allergies ?? ''}
        onChange={(s) => set('allergies', s)}
        rows={2}
        warning
        placeholder="Anotar TODAS las alergias del paciente. Aparecerán en cada nota clínica."
      />

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Contacto de emergencia</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Nombre" value={v.emergency_contact_name ?? ''} onChange={(s) => set('emergency_contact_name', s)} />
          <Field label="Teléfono" value={v.emergency_contact_phone ?? ''} onChange={(s) => set('emergency_contact_phone', s)} />
          <Field label="Parentesco" value={v.emergency_contact_relationship ?? ''} onChange={(s) => set('emergency_contact_relationship', s)} />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-900">Aseguradora</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Aseguradora" value={v.insurance_provider ?? ''} onChange={(s) => set('insurance_provider', s)} />
          <Field label="Número de póliza" value={v.insurance_policy_number ?? ''} onChange={(s) => set('insurance_policy_number', s)} />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={v.consent_signed ?? false}
            onChange={(e) => set('consent_signed', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-gray-700">Consentimiento general de tratamiento firmado</span>
          {v.consent_signed_at && (
            <span className="text-xs text-gray-400 ml-2">
              ({new Date(v.consent_signed_at).toLocaleDateString('es-MX')})
            </span>
          )}
        </label>
      </div>
    </div>
  )
}

// ─── Tab 2: Heredo-Familiares ───
function HeredoFamiliaresTab({ v, onChange }: { v: HeredoFamiliares; onChange: (d: HeredoFamiliares) => void }) {
  const items: Array<[keyof HeredoFamiliares, string]> = [
    ['diabetes', 'Diabetes'],
    ['hipertension', 'Hipertensión arterial'],
    ['cancer', 'Cáncer'],
    ['cardiopatias', 'Cardiopatías'],
    ['enfermedades_mentales', 'Enfermedades mentales'],
    ['enfermedades_renales', 'Enfermedades renales'],
    ['asma_alergias', 'Asma / alergias'],
    ['obesidad', 'Obesidad'],
  ]
  function toggle(key: keyof HeredoFamiliares, presente: boolean) {
    onChange({ ...v, [key]: { ...(v[key] as any || {}), presente, parentesco: (v[key] as any)?.parentesco ?? '' } })
  }
  function setPar(key: keyof HeredoFamiliares, parentesco: string) {
    onChange({ ...v, [key]: { ...(v[key] as any || {}), parentesco, presente: (v[key] as any)?.presente ?? true } })
  }
  function setCancerType(tipo: string) {
    onChange({ ...v, cancer: { ...(v.cancer ?? { presente: true, parentesco: '' }), tipo } })
  }
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Antecedentes Heredo-Familiares</h2>
      <p className="text-xs text-gray-500">Marca los antecedentes presentes en la familia directa.</p>
      <div className="space-y-2">
        {items.map(([key, label]) => {
          const item = v[key] as any | undefined
          const presente = item?.presente ?? false
          return (
            <div key={key} className={`grid grid-cols-1 sm:grid-cols-[28px_1fr_2fr] gap-2 items-center rounded-md p-2 ${presente ? 'bg-amber-50/40' : ''}`}>
              <input
                type="checkbox"
                checked={presente}
                onChange={(e) => toggle(key, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">{label}</span>
              {presente ? (
                <SelectRaw value={item?.parentesco ?? ''} onChange={(s) => setPar(key, s)} options={['', ...PARENTESCO_OPTIONS]} placeholder="Parentesco" />
              ) : <span />}
            </div>
          )
        })}
      </div>
      {v.cancer?.presente && (
        <Field label="Tipo de cáncer" value={v.cancer.tipo ?? ''} onChange={setCancerType} />
      )}
      <Textarea label="Otros antecedentes familiares" value={v.otros ?? ''} onChange={(s) => onChange({ ...v, otros: s })} rows={2} />
    </div>
  )
}

// ─── Tab 3: No Patológicos ───
function NoPatologicosTab({ v, onChange }: { v: NoPatologicos; onChange: (d: NoPatologicos) => void }) {
  const tab: any = v.tabaquismo ?? {}
  const alc: any = v.alcoholismo ?? {}
  const dro: any = v.drogas ?? {}
  const act: any = v.actividad_fisica ?? {}
  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Antecedentes Personales No Patológicos</h2>

      <ToggleSection title="Tabaquismo" active={tab.activo ?? false}
        onToggle={(b) => onChange({ ...v, tabaquismo: { ...tab, activo: b } })}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Cantidad" placeholder="ej. 5 cigarros/día" value={tab.cantidad ?? ''} onChange={(s) => onChange({ ...v, tabaquismo: { ...tab, cantidad: s } })} />
          <Field label="Años de consumo" value={tab.anos ?? ''} onChange={(s) => onChange({ ...v, tabaquismo: { ...tab, anos: s } })} />
        </div>
      </ToggleSection>

      <ToggleSection title="Alcoholismo" active={alc.activo ?? false}
        onToggle={(b) => onChange({ ...v, alcoholismo: { ...alc, activo: b } })}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Frecuencia" placeholder="ej. 2x semana" value={alc.frecuencia ?? ''} onChange={(s) => onChange({ ...v, alcoholismo: { ...alc, frecuencia: s } })} />
          <Field label="Tipo" placeholder="ej. cerveza, vino" value={alc.tipo ?? ''} onChange={(s) => onChange({ ...v, alcoholismo: { ...alc, tipo: s } })} />
        </div>
      </ToggleSection>

      <ToggleSection title="Uso de drogas" active={dro.uso ?? false}
        onToggle={(b) => onChange({ ...v, drogas: { ...dro, uso: b } })}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Tipo" value={dro.tipo ?? ''} onChange={(s) => onChange({ ...v, drogas: { ...dro, tipo: s } })} />
          <Field label="Frecuencia" value={dro.frecuencia ?? ''} onChange={(s) => onChange({ ...v, drogas: { ...dro, frecuencia: s } })} />
        </div>
      </ToggleSection>

      <ToggleSection title="Actividad física" active={act.realiza ?? false}
        onToggle={(b) => onChange({ ...v, actividad_fisica: { ...act, realiza: b } })}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Tipo" placeholder="ej. caminata, gym" value={act.tipo ?? ''} onChange={(s) => onChange({ ...v, actividad_fisica: { ...act, tipo: s } })} />
          <Field label="Frecuencia" placeholder="ej. 3x/semana 1h" value={act.frecuencia ?? ''} onChange={(s) => onChange({ ...v, actividad_fisica: { ...act, frecuencia: s } })} />
        </div>
      </ToggleSection>

      <Textarea label="Alimentación" value={v.alimentacion ?? ''} onChange={(s) => onChange({ ...v, alimentacion: s })} rows={2} placeholder="Tipo de dieta, frecuencia de comidas, restricciones." />
      <Textarea label="Vivienda" value={v.vivienda ?? ''} onChange={(s) => onChange({ ...v, vivienda: s })} rows={2} placeholder="Tipo, servicios disponibles, hacinamiento." />
      <Textarea label="Inmunizaciones" value={v.inmunizaciones ?? ''} onChange={(s) => onChange({ ...v, inmunizaciones: s })} rows={2} placeholder="Esquema completo, refuerzos pendientes." />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select label="Higiene personal" value={v.higiene_personal ?? ''} onChange={(s) => onChange({ ...v, higiene_personal: s })} options={['', 'buena', 'regular', 'mala']} />
        <Field label="Zoonosis (contacto con animales)" value={v.zoonosis ?? ''} onChange={(s) => onChange({ ...v, zoonosis: s })} />
      </div>
    </div>
  )
}

// ─── Tab 4: Patológicos ───
function PatologicosTab({ v, onChange }: { v: Patologicos; onChange: (d: Patologicos) => void }) {
  const cir = v.cirugias ?? []
  const hosp = v.hospitalizaciones ?? []
  const meds = v.medicamentos_actuales ?? []
  const trans: any = v.transfusiones ?? {}

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Antecedentes Personales Patológicos</h2>

      {/* CRITICAL — alergias medicamentos */}
      <div className="rounded-lg border-2 border-rose-300 bg-rose-50 p-3">
        <Textarea
          label="⚠ ALERGIAS A MEDICAMENTOS — Campo crítico"
          value={v.alergias_medicamentos ?? ''}
          onChange={(s) => onChange({ ...v, alergias_medicamentos: s })}
          rows={2}
          warning
          placeholder="Penicilina, AINEs, etc. Si no hay, anotar 'NIEGA'."
        />
      </div>

      <Textarea label="Enfermedades previas" value={v.enfermedades_previas ?? ''} onChange={(s) => onChange({ ...v, enfermedades_previas: s })} rows={3} />

      <DynamicList<CirugiaItem>
        title="Cirugías previas"
        items={cir}
        empty={{ procedimiento: '', fecha: '', hospital: '' }}
        onChange={(arr) => onChange({ ...v, cirugias: arr })}
        render={(item, set) => (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
            <Field label="Procedimiento" value={item.procedimiento} onChange={(s) => set({ ...item, procedimiento: s })} />
            <Field label="Fecha" type="date" value={item.fecha} onChange={(s) => set({ ...item, fecha: s })} />
            <Field label="Hospital" value={item.hospital} onChange={(s) => set({ ...item, hospital: s })} />
          </div>
        )}
      />

      <DynamicList<HospitalizacionItem>
        title="Hospitalizaciones"
        items={hosp}
        empty={{ motivo: '', fecha: '', duracion: '' }}
        onChange={(arr) => onChange({ ...v, hospitalizaciones: arr })}
        render={(item, set) => (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
            <Field label="Motivo" value={item.motivo} onChange={(s) => set({ ...item, motivo: s })} />
            <Field label="Fecha" type="date" value={item.fecha} onChange={(s) => set({ ...item, fecha: s })} />
            <Field label="Duración" placeholder="3 días" value={item.duracion} onChange={(s) => set({ ...item, duracion: s })} />
          </div>
        )}
      />

      <ToggleSection title="Transfusiones" active={trans.recibido ?? false}
        onToggle={(b) => onChange({ ...v, transfusiones: { ...trans, recibido: b } })}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Tipo" value={trans.tipo ?? ''} onChange={(s) => onChange({ ...v, transfusiones: { ...trans, tipo: s } })} />
          <Field label="Fecha" type="date" value={trans.fecha ?? ''} onChange={(s) => onChange({ ...v, transfusiones: { ...trans, fecha: s } })} />
          <Field label="Reacciones adversas" value={trans.reacciones ?? ''} onChange={(s) => onChange({ ...v, transfusiones: { ...trans, reacciones: s } })} />
        </div>
      </ToggleSection>

      <DynamicList<MedicamentoItem>
        title="Medicamentos actuales"
        items={meds}
        empty={{ nombre: '', dosis: '', via: '', frecuencia: '' }}
        onChange={(arr) => onChange({ ...v, medicamentos_actuales: arr })}
        render={(item, set) => <MedRow item={item} set={set} />}
      />

      <Textarea label="Traumatismos" value={v.traumatismos ?? ''} onChange={(s) => onChange({ ...v, traumatismos: s })} rows={2} />
      <Textarea label="Enfermedades infecciosas" value={v.enfermedades_infecciosas ?? ''} onChange={(s) => onChange({ ...v, enfermedades_infecciosas: s })} rows={2} placeholder="Hepatitis, VIH, TB, COVID, etc." />
    </div>
  )
}

// ─── Tab 5: Gineco-Obstétricos ───
function GinecoTab({ v, onChange }: { v: GinecoObstetricos; onChange: (d: GinecoObstetricos) => void }) {
  const set = <K extends keyof GinecoObstetricos>(k: K, val: GinecoObstetricos[K]) => onChange({ ...v, [k]: val })
  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Antecedentes Gineco-Obstétricos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Menarca (edad)" value={v.menarca ?? ''} onChange={(s) => set('menarca', s)} />
        <Field label="Ritmo menstrual" placeholder="regular / irregular" value={v.ritmo_menstrual ?? ''} onChange={(s) => set('ritmo_menstrual', s)} />
        <Field label="Duración del ciclo" placeholder="28 días / 5 sangrado" value={v.duracion_ciclo ?? ''} onChange={(s) => set('duracion_ciclo', s)} />
        <Field label="FUM (fecha última menstruación)" type="date" value={v.fum ?? ''} onChange={(s) => set('fum', s)} />
        <NumberField label="Gestas" value={v.gestas} onChange={(n) => set('gestas', n)} />
        <NumberField label="Partos" value={v.partos} onChange={(n) => set('partos', n)} />
        <NumberField label="Cesáreas" value={v.cesareas} onChange={(n) => set('cesareas', n)} />
        <NumberField label="Abortos" value={v.abortos} onChange={(n) => set('abortos', n)} />
        <Field label="Método anticonceptivo" value={v.metodo_anticonceptivo ?? ''} onChange={(s) => set('metodo_anticonceptivo', s)} />
        <Field label="Último Papanicolaou (fecha)" type="date" value={v.papanicolaou_ultimo ?? ''} onChange={(s) => set('papanicolaou_ultimo', s)} />
        <Field label="Resultado Papanicolaou" value={v.papanicolaou_resultado ?? ''} onChange={(s) => set('papanicolaou_resultado', s)} />
      </div>
      <ToggleSection title="Menopausia" active={v.menopausia_aplica ?? false} onToggle={(b) => set('menopausia_aplica', b)}>
        <Field label="Edad de inicio" value={v.menopausia_edad ?? ''} onChange={(s) => set('menopausia_edad', s)} />
      </ToggleSection>
      <Textarea label="Otros antecedentes ginecológicos" value={v.otros ?? ''} onChange={(s) => set('otros', s)} rows={2} />
    </div>
  )
}

// ─── Tab 6: Padecimiento Actual ───
function PadecimientoTab({ v, onChange }: { v: PadecimientoActual; onChange: (d: PadecimientoActual) => void }) {
  const set = <K extends keyof PadecimientoActual>(k: K, val: PadecimientoActual[K]) => onChange({ ...v, [k]: val })
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Padecimiento Actual</h2>
      <Textarea label="Motivo de consulta" placeholder="¿Por qué viene el paciente hoy?" rows={2} value={v.motivo_consulta ?? ''} onChange={(s) => set('motivo_consulta', s)} />
      <Textarea label="Inicio" placeholder="¿Cuándo empezó? ¿Hace cuánto tiempo?" rows={2} value={v.inicio ?? ''} onChange={(s) => set('inicio', s)} />
      <Textarea label="Evolución" placeholder="¿Cómo ha cambiado el padecimiento?" rows={3} value={v.evolucion ?? ''} onChange={(s) => set('evolucion', s)} />
      <Textarea label="Síntomas principales" rows={3} value={v.sintomas_principales ?? ''} onChange={(s) => set('sintomas_principales', s)} />
      <Textarea label="Síntomas asociados" rows={2} value={v.sintomas_asociados ?? ''} onChange={(s) => set('sintomas_asociados', s)} />
      <Textarea label="Tratamientos previos para este padecimiento" rows={2} value={v.tratamientos_previos ?? ''} onChange={(s) => set('tratamientos_previos', s)} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Textarea label="Factores agravantes" rows={2} value={v.factores_agravantes ?? ''} onChange={(s) => set('factores_agravantes', s)} />
        <Textarea label="Factores atenuantes" rows={2} value={v.factores_atenuantes ?? ''} onChange={(s) => set('factores_atenuantes', s)} />
      </div>
    </div>
  )
}

// ─── Tab 7: Exploración Física ───
function ExploracionTab({ v, onChange }: { v: ExploracionFisica; onChange: (d: ExploracionFisica) => void }) {
  const set = <K extends keyof ExploracionFisica>(k: K, val: ExploracionFisica[K]) => onChange({ ...v, [k]: val })
  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Exploración Física</h2>

      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">Signos vitales</h3>
        <VitalSignsForm value={(v.signos_vitales ?? {}) as VitalSignsValue} onChange={(d) => set('signos_vitales', d)} />
      </div>

      <div className="border-t border-gray-100 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Textarea label="Aspecto general" rows={2} value={v.aspecto_general ?? ''} onChange={(s) => set('aspecto_general', s)} />
        <Textarea label="Cabeza y cuello" rows={2} value={v.cabeza_cuello ?? ''} onChange={(s) => set('cabeza_cuello', s)} />
        <Textarea label="Tórax y pulmones" rows={2} value={v.torax_pulmones ?? ''} onChange={(s) => set('torax_pulmones', s)} />
        <Textarea label="Cardiovascular" rows={2} value={v.cardiovascular ?? ''} onChange={(s) => set('cardiovascular', s)} />
        <Textarea label="Abdomen" rows={2} value={v.abdomen ?? ''} onChange={(s) => set('abdomen', s)} />
        <Textarea label="Extremidades" rows={2} value={v.extremidades ?? ''} onChange={(s) => set('extremidades', s)} />
        <Textarea label="Neurológico" rows={2} value={v.neurologico ?? ''} onChange={(s) => set('neurologico', s)} />
        <Textarea label="Piel y tegumentos" rows={2} value={v.piel_tegumentos ?? ''} onChange={(s) => set('piel_tegumentos', s)} />
        <Textarea label="Genitourinario" rows={2} value={v.genitourinario ?? ''} onChange={(s) => set('genitourinario', s)} />
        <Textarea label="Musculoesquelético" rows={2} value={v.musculoesqueletico ?? ''} onChange={(s) => set('musculoesqueletico', s)} />
        <Textarea label="Otros hallazgos" rows={2} value={v.otros ?? ''} onChange={(s) => set('otros', s)} />
      </div>
    </div>
  )
}

// ─── Tab 8: Diagnóstico ───
function DiagnosticoTab({ v, onChange }: { v: Diagnostico; onChange: (d: Diagnostico) => void }) {
  const sec = v.secundarios ?? []
  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Diagnóstico</h2>
      <Textarea label="Diagnóstico principal" rows={2} value={v.principal ?? ''} onChange={(s) => onChange({ ...v, principal: s })} />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Código CIE-10 del diagnóstico principal</label>
        <Icd10Picker
          value={v.icd10_code ?? null}
          onChange={(code, desc) => onChange({ ...v, icd10_code: code ?? '', icd10_description: desc ?? '' })}
        />
      </div>

      <DynamicList<{ texto: string; icd10?: string; icd10_description?: string }>
        title="Diagnósticos secundarios"
        items={sec}
        empty={{ texto: '', icd10: '', icd10_description: '' }}
        onChange={(arr) => onChange({ ...v, secundarios: arr })}
        render={(item, set) => (
          <div className="space-y-2">
            <Field label="Diagnóstico" value={item.texto} onChange={(s) => set({ ...item, texto: s })} />
            <Icd10Picker
              value={item.icd10 ?? null}
              onChange={(code, desc) => set({ ...item, icd10: code ?? '', icd10_description: desc ?? '' })}
            />
          </div>
        )}
      />

      <Textarea label="Diagnósticos diferenciales" rows={3} value={v.diferenciales ?? ''} onChange={(s) => onChange({ ...v, diferenciales: s })} />
    </div>
  )
}

// ─── Tab 9: Plan de Tratamiento ───
function TratamientoTab({ v, onChange }: { v: PlanTratamiento; onChange: (d: PlanTratamiento) => void }) {
  const meds = v.medicamentos ?? []
  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Plan de Tratamiento</h2>
      <DynamicList<MedicamentoItem>
        title="Medicamentos prescritos"
        items={meds}
        empty={{ nombre: '', dosis: '', via: '', frecuencia: '' }}
        onChange={(arr) => onChange({ ...v, medicamentos: arr })}
        render={(item, set) => <MedRow item={item} set={set} extended />}
      />
      <Textarea label="Indicaciones no farmacológicas" placeholder="dieta, ejercicio, reposo, etc." rows={3} value={v.indicaciones_no_farmacologicas ?? ''} onChange={(s) => onChange({ ...v, indicaciones_no_farmacologicas: s })} />
      <Textarea label="Estudios solicitados" placeholder="laboratorio, imagen, etc." rows={3} value={v.estudios_solicitados ?? ''} onChange={(s) => onChange({ ...v, estudios_solicitados: s })} />
      <Textarea label="Interconsultas" rows={2} value={v.interconsultas ?? ''} onChange={(s) => onChange({ ...v, interconsultas: s })} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Próxima cita sugerida" type="date" value={v.proxima_cita ?? ''} onChange={(s) => onChange({ ...v, proxima_cita: s })} />
      </div>
      <Textarea label="Notas adicionales" rows={2} value={v.notas_adicionales ?? ''} onChange={(s) => onChange({ ...v, notas_adicionales: s })} />
    </div>
  )
}

// ─── Tab 10: Pronóstico ───
function PronosticoTab({ v, onChange }: { v: Pronostico; onChange: (d: Pronostico) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Pronóstico</h2>
      <Select label="Tipo de pronóstico" value={v.tipo ?? ''} onChange={(s) => onChange({ ...v, tipo: s as any })} options={['', 'bueno', 'reservado', 'malo']} />
      <Textarea label="Pronóstico para la vida" rows={2} value={v.para_la_vida ?? ''} onChange={(s) => onChange({ ...v, para_la_vida: s })} />
      <Textarea label="Pronóstico para la función" rows={2} value={v.para_la_funcion ?? ''} onChange={(s) => onChange({ ...v, para_la_funcion: s })} />
      <Textarea label="Observaciones" rows={3} value={v.observaciones ?? ''} onChange={(s) => onChange({ ...v, observaciones: s })} />
    </div>
  )
}

// ──────────────────────────── Reusable atoms ────────────────────────────

function Field({
  label, value, onChange, type = 'text', placeholder, disabled, maxLength,
}: {
  label: string
  value: string
  onChange: (s: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
  maxLength?: number
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none disabled:bg-gray-50 disabled:text-gray-500"
      />
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (n: number | undefined) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="number"
        min={0}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm font-mono focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
      />
    </div>
  )
}

function Textarea({ label, value, onChange, rows = 3, placeholder, warning }: { label: string; value: string; onChange: (s: string) => void; rows?: number; placeholder?: string; warning?: boolean }) {
  return (
    <div>
      <label className={`block text-xs font-medium mb-1 ${warning ? 'text-rose-700' : 'text-gray-600'}`}>{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 rounded-md border bg-white text-sm focus:ring-1 outline-none resize-y ${
          warning ? 'border-rose-200 focus:border-rose-400 focus:ring-rose-200' : 'border-gray-200 focus:border-blue-400 focus:ring-blue-200'
        }`}
      />
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (s: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <SelectRaw value={value} onChange={onChange} options={options} />
    </div>
  )
}

function SelectRaw({ value, onChange, options, placeholder }: { value: string; onChange: (s: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
    >
      {placeholder && value === '' && <option value="" disabled>{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>{o === '' ? (placeholder ?? '— Seleccionar —') : o}</option>
      ))}
    </select>
  )
}

function ToggleSection({ title, active, onToggle, children }: { title: string; active: boolean; onToggle: (b: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <label className="flex items-center gap-2 px-3 py-2 cursor-pointer">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <span className="text-sm font-medium text-gray-800">{title}</span>
      </label>
      {active && <div className="border-t border-gray-100 p-3">{children}</div>}
    </div>
  )
}

function DynamicList<T>({
  title, items, empty, onChange, render,
}: {
  title: string
  items: T[]
  empty: T
  onChange: (arr: T[]) => void
  render: (item: T, set: (next: T) => void) => React.ReactNode
}) {
  function update(i: number, next: T) {
    const arr = [...items]
    arr[i] = next
    onChange(arr)
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i))
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={() => onChange([...items, { ...empty } as T])}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
        >
          <Plus className="h-3 w-3" /> Agregar
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Sin entradas.</p>
      ) : (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded-md border border-gray-200 bg-white p-3 relative">
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-2 right-2 p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                aria-label="Eliminar"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              {render(it, (next) => update(i, next))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MedRow({ item, set, extended }: { item: MedicamentoItem; set: (m: MedicamentoItem) => void; extended?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <Field label="Nombre" value={item.nombre} onChange={(s) => set({ ...item, nombre: s })} />
        <Field label="Dosis" placeholder="500mg" value={item.dosis} onChange={(s) => set({ ...item, dosis: s })} />
        <Select label="Vía" value={item.via} onChange={(s) => set({ ...item, via: s })} options={['', ...VIA_OPTIONS]} />
        <Select label="Frecuencia" value={item.frecuencia} onChange={(s) => set({ ...item, frecuencia: s })} options={['', ...FREQ_OPTIONS]} />
      </div>
      {extended && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="Duración" placeholder="7 días / indefinido" value={item.duracion ?? ''} onChange={(s) => set({ ...item, duracion: s })} />
          <Field label="Indicaciones" placeholder="con alimentos, en ayunas" value={item.indicaciones ?? ''} onChange={(s) => set({ ...item, indicaciones: s })} />
        </div>
      )}
    </div>
  )
}
