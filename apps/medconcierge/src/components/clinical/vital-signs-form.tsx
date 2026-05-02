'use client'

import { useMemo } from 'react'

/**
 * Vital signs form with color-coded normal/warning/danger ranges.
 * Stores its value as a flat object that can be JSON-serialized into
 * `clinical_records.vital_signs` (jsonb).
 *
 * Auto-calculates BMI when both weight (kg) and height (cm) are filled.
 */

export interface VitalSigns {
  systolic?: number       // mmHg (presión sistólica)
  diastolic?: number      // mmHg (presión diastólica)
  heartRate?: number      // bpm
  respiratoryRate?: number // rpm
  temperature?: number    // °C
  oxygenSat?: number      // %
  weight?: number         // kg
  height?: number         // cm
  bmi?: number            // auto-calculated
  notes?: string
}

type Severity = 'low' | 'normal' | 'warning' | 'danger'

const SEVERITY_CLS: Record<Severity, string> = {
  low: 'bg-blue-50 text-blue-700 border-blue-200',
  normal: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
}

function classifyBP(systolic?: number, diastolic?: number): Severity {
  if (systolic === undefined && diastolic === undefined) return 'normal'
  const sys = systolic ?? 0
  const dia = diastolic ?? 0
  if (sys >= 140 || dia >= 90) return 'danger'
  if (sys >= 120 || dia >= 80) return 'warning'
  if (sys < 90 && sys > 0) return 'low'
  return 'normal'
}
function classifyHR(bpm?: number): Severity {
  if (bpm === undefined) return 'normal'
  if (bpm < 50 || bpm > 120) return 'danger'
  if (bpm < 60 || bpm > 100) return 'warning'
  return 'normal'
}
function classifyTemp(c?: number): Severity {
  if (c === undefined) return 'normal'
  if (c < 35) return 'low'
  if (c >= 38) return 'danger'
  if (c >= 37.5) return 'warning'
  return 'normal'
}
function classifySpO2(pct?: number): Severity {
  if (pct === undefined) return 'normal'
  if (pct < 90) return 'danger'
  if (pct < 95) return 'warning'
  return 'normal'
}
function classifyBMI(bmi?: number): Severity {
  if (bmi === undefined || bmi === 0) return 'normal'
  if (bmi >= 30 || bmi < 16) return 'danger'
  if (bmi >= 25 || bmi < 18.5) return 'warning'
  return 'normal'
}
function bmiLabel(bmi?: number): string {
  if (bmi === undefined || bmi === 0) return ''
  if (bmi < 18.5) return 'Bajo peso'
  if (bmi < 25) return 'Normal'
  if (bmi < 30) return 'Sobrepeso'
  if (bmi < 35) return 'Obesidad I'
  if (bmi < 40) return 'Obesidad II'
  return 'Obesidad III'
}

export function VitalSignsForm({
  value,
  onChange,
  readOnly = false,
}: {
  value: VitalSigns
  onChange: (next: VitalSigns) => void
  readOnly?: boolean
}) {
  const bmi = useMemo(() => {
    const w = value.weight ?? 0
    const h = value.height ?? 0
    if (!w || !h) return undefined
    const meters = h / 100
    return Math.round((w / (meters * meters)) * 10) / 10
  }, [value.weight, value.height])

  function set<K extends keyof VitalSigns>(key: K, v: VitalSigns[K]) {
    onChange({ ...value, [key]: v, bmi: key === 'weight' || key === 'height' ? bmi : value.bmi })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tensión arterial */}
        <Field
          label="Tensión arterial"
          unit="mmHg"
          severity={classifyBP(value.systolic, value.diastolic)}
        >
          <div className="flex items-center gap-1">
            <NumberInput
              value={value.systolic}
              onChange={(v) => set('systolic', v)}
              placeholder="120"
              readOnly={readOnly}
              className="w-14"
            />
            <span className="text-gray-400">/</span>
            <NumberInput
              value={value.diastolic}
              onChange={(v) => set('diastolic', v)}
              placeholder="80"
              readOnly={readOnly}
              className="w-14"
            />
          </div>
        </Field>

        <Field label="Frecuencia cardíaca" unit="bpm" severity={classifyHR(value.heartRate)}>
          <NumberInput
            value={value.heartRate}
            onChange={(v) => set('heartRate', v)}
            placeholder="72"
            readOnly={readOnly}
          />
        </Field>

        <Field label="Frecuencia respiratoria" unit="rpm" severity="normal">
          <NumberInput
            value={value.respiratoryRate}
            onChange={(v) => set('respiratoryRate', v)}
            placeholder="16"
            readOnly={readOnly}
          />
        </Field>

        <Field label="Temperatura" unit="°C" severity={classifyTemp(value.temperature)}>
          <NumberInput
            value={value.temperature}
            onChange={(v) => set('temperature', v)}
            placeholder="36.5"
            readOnly={readOnly}
            step="0.1"
          />
        </Field>

        <Field label="Saturación O₂" unit="%" severity={classifySpO2(value.oxygenSat)}>
          <NumberInput
            value={value.oxygenSat}
            onChange={(v) => set('oxygenSat', v)}
            placeholder="98"
            readOnly={readOnly}
          />
        </Field>

        <Field label="Peso" unit="kg" severity="normal">
          <NumberInput
            value={value.weight}
            onChange={(v) => set('weight', v)}
            placeholder="70"
            readOnly={readOnly}
            step="0.1"
          />
        </Field>

        <Field label="Talla" unit="cm" severity="normal">
          <NumberInput
            value={value.height}
            onChange={(v) => set('height', v)}
            placeholder="170"
            readOnly={readOnly}
          />
        </Field>

        <Field label="IMC" unit="" severity={classifyBMI(bmi)}>
          <div className="flex items-center gap-2">
            <span className="text-base font-mono text-gray-900">
              {bmi !== undefined ? bmi.toFixed(1) : '—'}
            </span>
            {bmi !== undefined && (
              <span className="text-[10px] text-gray-500">{bmiLabel(bmi)}</span>
            )}
          </div>
        </Field>
      </div>
    </div>
  )
}

function Field({
  label,
  unit,
  severity,
  children,
}: {
  label: string
  unit: string
  severity: Severity
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${SEVERITY_CLS[severity]}`}>
      <div className="text-[10px] font-mono uppercase tracking-wide opacity-70 mb-1">
        {label} {unit && <span className="opacity-60">({unit})</span>}
      </div>
      {children}
    </div>
  )
}

function NumberInput({
  value,
  onChange,
  placeholder,
  className,
  readOnly,
  step,
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  placeholder?: string
  className?: string
  readOnly?: boolean
  step?: string
}) {
  return (
    <input
      type="number"
      step={step ?? '1'}
      readOnly={readOnly}
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === '' ? undefined : Number(v))
      }}
      placeholder={placeholder}
      className={
        'bg-transparent border-0 outline-none focus:ring-0 text-base font-mono text-gray-900 placeholder:text-gray-300 w-full ' +
        (className ?? '')
      }
    />
  )
}
