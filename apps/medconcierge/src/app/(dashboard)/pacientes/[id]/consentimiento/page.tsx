'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, FileSignature, Plus, Eye, XCircle, CheckCircle2,
  AlertTriangle, Loader2, X, ShieldCheck, ShieldOff,
} from 'lucide-react'
import { SignaturePad } from '@/components/signature-pad'

interface Consent {
  id: string
  procedureName: string
  description: string
  risks: string
  alternatives: string | null
  patientSignature: string | null
  doctorSignature: string | null
  signedAt: string | null
  revokedAt: string | null
  createdAt: string
}

type DoctorSigMode = 'saved' | 'draw'

export default function ConsentimientoPage() {
  const params = useParams<{ id: string }>()
  const patientId = (params?.id ?? '') as string

  const [patientName, setPatientName] = useState<string>('')
  const [savedDoctorSignature, setSavedDoctorSignature] = useState<string | null>(null)

  const [consents, setConsents] = useState<Consent[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [viewing, setViewing] = useState<Consent | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── Form state
  const [procedureName, setProcedureName] = useState('')
  const [description, setDescription] = useState('')
  const [risks, setRisks] = useState('')
  const [alternatives, setAlternatives] = useState('')
  const [patientSig, setPatientSig] = useState<string | null>(null)
  const [doctorSigMode, setDoctorSigMode] = useState<DoctorSigMode>('saved')
  const [doctorSig, setDoctorSig] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, cRes, dRes] = await Promise.all([
        fetch(`/api/dashboard/patients/${patientId}`),
        fetch(`/api/dashboard/patients/${patientId}/consents`),
        fetch(`/api/dashboard/profile/doctor`).catch(() => null),
      ])
      if (pRes.ok) {
        const j = await pRes.json()
        setPatientName(j?.patient?.name ?? '')
      }
      if (cRes.ok) {
        const j = await cRes.json()
        setConsents(j.consents ?? [])
      }
      if (dRes && dRes.ok) {
        const j = await dRes.json().catch(() => null)
        const sig: string | null = j?.doctor?.digitalSignature ?? j?.digitalSignature ?? null
        setSavedDoctorSignature(sig)
        if (!sig) setDoctorSigMode('draw')
      } else {
        setDoctorSigMode('draw')
      }
    } catch {
      setErr('No se pudo cargar la información')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { loadAll() }, [loadAll])

  function resetForm() {
    setProcedureName('')
    setDescription('')
    setRisks('')
    setAlternatives('')
    setPatientSig(null)
    setDoctorSig(null)
    setDoctorSigMode(savedDoctorSignature ? 'saved' : 'draw')
  }

  function openForm() {
    resetForm()
    setErr(null)
    setShowForm(true)
  }

  async function submit() {
    if (procedureName.trim().length < 2) return setErr('Indica el nombre del procedimiento')
    if (description.trim().length < 10) return setErr('La descripción es demasiado corta')
    if (risks.trim().length < 10) return setErr('Describe los riesgos del procedimiento')
    if (!patientSig) return setErr('Falta la firma del paciente')

    let doctorSignaturePayload: string | undefined
    if (doctorSigMode === 'draw') {
      if (!doctorSig) return setErr('Falta la firma del médico')
      doctorSignaturePayload = doctorSig
    } else {
      if (!savedDoctorSignature) return setErr('No tienes firma digital guardada — fírmala manualmente')
    }

    if (!confirm(
      'Una vez firmado, este consentimiento queda registrado de forma INMUTABLE conforme a NOM-004-SSA3-2012.\n\n' +
      '¿Confirmas que el paciente entendió el procedimiento, sus riesgos, alternativas, y firmó voluntariamente?'
    )) return

    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch(`/api/dashboard/patients/${patientId}/consents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedureName: procedureName.trim(),
          description: description.trim(),
          risks: risks.trim(),
          alternatives: alternatives.trim() || undefined,
          patientSignature: patientSig,
          doctorSignature: doctorSignaturePayload,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error ?? 'Error al firmar consentimiento')
      setShowForm(false)
      resetForm()
      await loadAll()
    } catch (e: any) {
      setErr(e?.message ?? 'Error al firmar consentimiento')
    } finally {
      setSubmitting(false)
    }
  }

  async function revoke(c: Consent) {
    if (c.revokedAt) return
    if (!confirm(
      `¿Revocar el consentimiento "${c.procedureName}"?\n\n` +
      'El registro permanecerá en el expediente con la marca de revocación (5 años de retención NOM-024).'
    )) return
    setRevoking(c.id)
    try {
      const res = await fetch(`/api/dashboard/patients/${patientId}/consents/${c.id}/revoke`, {
        method: 'POST',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? 'Error al revocar')
      }
      await loadAll()
    } catch (e: any) {
      alert(e?.message ?? 'Error al revocar')
    } finally {
      setRevoking(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            href={`/pacientes/${patientId}`}
            className="inline-flex items-center gap-1 text-sm text-[var(--text-tertiary)] hover:text-[var(--accent)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al paciente
          </Link>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mt-1 flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-teal-600" />
            Consentimientos Informados
          </h1>
          {patientName && (
            <p className="text-sm text-[var(--text-tertiary)]">{patientName}</p>
          )}
        </div>
        <button
          onClick={openForm}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo consentimiento
        </button>
      </div>

      {/* Compliance note */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          Conforme a la <strong>NOM-004-SSA3-2012</strong>, una vez firmado el consentimiento queda
          registrado de forma inmutable. El paciente puede revocarlo posteriormente; el registro
          original se conserva 5 años.
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        </div>
      ) : consents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center">
          <FileSignature className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-2" />
          <p className="text-sm text-[var(--text-tertiary)]">
            No hay consentimientos registrados para este paciente.
          </p>
          <button
            onClick={openForm}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            <Plus className="w-3.5 h-3.5" /> Crear el primero
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Procedimiento</th>
                <th className="text-left px-4 py-2 font-medium">Fecha de firma</th>
                <th className="text-left px-4 py-2 font-medium">Estado</th>
                <th className="text-right px-4 py-2 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {consents.map(c => {
                const status = c.revokedAt ? 'revocado' : c.signedAt ? 'vigente' : 'pendiente'
                return (
                  <tr key={c.id} className="hover:bg-[var(--bg-tertiary)]/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{c.procedureName}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {c.signedAt ? new Date(c.signedAt).toLocaleString('es-MX') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {status === 'vigente' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                          <ShieldCheck className="w-3 h-3" /> Vigente
                        </span>
                      )}
                      {status === 'revocado' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-medium">
                          <ShieldOff className="w-3 h-3" /> Revocado
                        </span>
                      )}
                      {status === 'pendiente' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setViewing(c)}
                        className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-teal-600 mr-3"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver
                      </button>
                      {!c.revokedAt && (
                        <button
                          onClick={() => revoke(c)}
                          disabled={revoking === c.id}
                          className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-rose-600 disabled:opacity-50"
                        >
                          {revoking === c.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <XCircle className="w-3.5 h-3.5" />}
                          Revocar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-teal-600" />
                Nuevo Consentimiento Informado
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {err && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800">
                  {err}
                </div>
              )}

              <Field
                label="Nombre del procedimiento"
                required
                value={procedureName}
                onChange={setProcedureName}
                placeholder="Ej. Endoscopia diagnóstica"
              />

              <TextArea
                label="Descripción del procedimiento"
                required
                rows={4}
                value={description}
                onChange={setDescription}
                placeholder="Explica en qué consiste el procedimiento, anestesia, duración estimada…"
              />

              <TextArea
                label="Riesgos y complicaciones posibles"
                required
                rows={4}
                value={risks}
                onChange={setRisks}
                placeholder="Detalla los riesgos conocidos del procedimiento…"
              />

              <TextArea
                label="Alternativas de tratamiento"
                rows={3}
                value={alternatives}
                onChange={setAlternatives}
                placeholder="Otras opciones disponibles, incluyendo no tratar (opcional)"
              />

              {/* Patient signature */}
              <div>
                <SignaturePad
                  label="Firma del paciente"
                  required
                  initialValue={patientSig}
                  onChange={setPatientSig}
                />
              </div>

              {/* Doctor signature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Firma del médico <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-3 mb-2">
                  <button
                    type="button"
                    disabled={!savedDoctorSignature}
                    onClick={() => setDoctorSigMode('saved')}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      doctorSigMode === 'saved'
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Usar mi firma digital
                    {!savedDoctorSignature && (
                      <span className="block text-[10px] text-gray-500 mt-0.5">
                        No configurada
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoctorSigMode('draw')}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      doctorSigMode === 'draw'
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Firmar ahora
                  </button>
                </div>
                {doctorSigMode === 'saved' && savedDoctorSignature && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={savedDoctorSignature} alt="Firma digital del médico" className="h-16" />
                  </div>
                )}
                {doctorSigMode === 'draw' && (
                  <SignaturePad
                    initialValue={doctorSig}
                    onChange={setDoctorSig}
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t px-6 py-4 bg-gray-50 rounded-b-2xl">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Esta acción es irreversible
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium shadow-sm disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Firmar consentimiento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{viewing.procedureName}</h2>
                <p className="text-xs text-gray-500">
                  Firmado: {viewing.signedAt ? new Date(viewing.signedAt).toLocaleString('es-MX') : '—'}
                  {viewing.revokedAt && (
                    <span className="ml-3 inline-flex items-center gap-1 text-rose-700">
                      <ShieldOff className="w-3 h-3" /> Revocado: {new Date(viewing.revokedAt).toLocaleString('es-MX')}
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              <Section title="Descripción">{viewing.description}</Section>
              <Section title="Riesgos y complicaciones">{viewing.risks}</Section>
              {viewing.alternatives && (
                <Section title="Alternativas de tratamiento">{viewing.alternatives}</Section>
              )}

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Firma del paciente</p>
                  <div className="rounded-lg border border-gray-200 bg-white p-2">
                    {viewing.patientSignature
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={viewing.patientSignature} alt="Firma paciente" className="h-20 mx-auto" />
                      : <p className="text-xs text-gray-400 text-center py-6">Sin firma</p>}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Firma del médico</p>
                  <div className="rounded-lg border border-gray-200 bg-white p-2">
                    {viewing.doctorSignature
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={viewing.doctorSignature} alt="Firma médico" className="h-20 mx-auto" />
                      : <p className="text-xs text-gray-400 text-center py-6">Sin firma</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-6 py-4 bg-gray-50 rounded-b-2xl">
              {!viewing.revokedAt && (
                <button
                  onClick={() => { const c = viewing; setViewing(null); revoke(c) }}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-rose-700 hover:bg-rose-50"
                >
                  <XCircle className="w-4 h-4" /> Revocar
                </button>
              )}
              <button
                onClick={() => setViewing(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Atoms ──────────────────────────────────────────────

function Field({
  label, value, onChange, required, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void
  required?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
      />
    </div>
  )
}

function TextArea({
  label, value, onChange, required, placeholder, rows = 3,
}: {
  label: string; value: string; onChange: (v: string) => void
  required?: boolean; placeholder?: string; rows?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <textarea
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm resize-y"
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{title}</p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{children}</p>
    </div>
  )
}
