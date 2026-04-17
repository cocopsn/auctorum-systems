'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Save, Bot, Plus, X, Check, MessageCircle } from 'lucide-react'

type BotScheduleDay = { enabled: boolean; start: string; end: string }
type FAQ = { question: string; answer: string }
type BotConfig = {
  tone: string
  bot_name: string
  bot_personality: string
  brand_color: string
  schedule: Record<string, BotScheduleDay>
  out_of_hours_message: string
  faqs: FAQ[]
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

const TONE_OPTIONS = [
  { value: 'amigable', label: 'Amigable' },
  { value: 'profesional', label: 'Profesional' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
]

const DEFAULT_CONFIG: BotConfig = {
  tone: 'amigable',
  bot_name: 'Asistente',
  bot_personality: 'Soy un asistente virtual profesional y amable.',
  brand_color: '#6366f1',
  schedule: {
    monday: { enabled: true, start: '09:00', end: '18:00' },
    tuesday: { enabled: true, start: '09:00', end: '18:00' },
    wednesday: { enabled: true, start: '09:00', end: '18:00' },
    thursday: { enabled: true, start: '09:00', end: '18:00' },
    friday: { enabled: true, start: '09:00', end: '18:00' },
    saturday: { enabled: false, start: '09:00', end: '14:00' },
    sunday: { enabled: false, start: '', end: '' },
  },
  out_of_hours_message: 'Estamos fuera de horario. Te responderemos en cuanto abramos.',
  faqs: [],
}

export default function BotConfigPage() {
  const [config, setConfig] = useState<BotConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' })
  const [showFaqForm, setShowFaqForm] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/settings/bot', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.config && Object.keys(data.config).length > 0) {
          setConfig({ ...DEFAULT_CONFIG, ...data.config })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/dashboard/settings/bot', {
        credentials: 'include',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {}
    setSaving(false)
  }

  function addFaq() {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return
    setConfig(c => ({
      ...c,
      faqs: [...(c.faqs || []), { question: newFaq.question.trim(), answer: newFaq.answer.trim() }],
    }))
    setNewFaq({ question: '', answer: '' })
    setShowFaqForm(false)
  }

  function removeFaq(index: number) {
    setConfig(c => ({
      ...c,
      faqs: (c.faqs || []).filter((_, i) => i !== index),
    }))
  }

  function updateSchedule(day: string, field: keyof BotScheduleDay, value: any) {
    setConfig(c => ({
      ...c,
      schedule: {
        ...c.schedule,
        [day]: { ...c.schedule[day], [field]: value },
      },
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Bot className="h-5 w-5 text-indigo-600" />
          Configuración del Bot IA
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Personaliza el comportamiento y la identidad de tu asistente virtual
        </p>
      </div>

      <div className="space-y-6">
        {/* Tone */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Tono del Bot</h3>
          <select
            value={config.tone}
            onChange={e => setConfig(c => ({ ...c, tone: e.target.value }))}
            className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            {TONE_OPTIONS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Identity */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Identidad del Bot (White Label)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del bot</label>
              <input
                type="text"
                value={config.bot_name}
                onChange={e => setConfig(c => ({ ...c, bot_name: e.target.value }))}
                placeholder="Ej: Ana, Dr. Bot, Asistente"
                className="w-full max-w-xs px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Personalidad</label>
              <textarea
                value={config.bot_personality}
                onChange={e => setConfig(c => ({ ...c, bot_personality: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Color de marca</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.brand_color}
                  onChange={e => setConfig(c => ({ ...c, brand_color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={config.brand_color}
                  onChange={e => setConfig(c => ({ ...c, brand_color: e.target.value }))}
                  className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Horario de Atención</h3>
          <div className="space-y-2">
            {Object.entries(DAY_LABELS).map(([day, label]) => {
              const dayConfig = config.schedule?.[day] || { enabled: false, start: '', end: '' }
              return (
                <div key={day} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 w-28">
                    <input
                      type="checkbox"
                      checked={dayConfig.enabled}
                      onChange={e => updateSchedule(day, 'enabled', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={`text-sm ${dayConfig.enabled ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
                  </label>
                  <input
                    type="time"
                    value={dayConfig.start}
                    onChange={e => updateSchedule(day, 'start', e.target.value)}
                    disabled={!dayConfig.enabled}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 disabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <span className="text-gray-400 text-sm">a</span>
                  <input
                    type="time"
                    value={dayConfig.end}
                    onChange={e => updateSchedule(day, 'end', e.target.value)}
                    disabled={!dayConfig.enabled}
                    className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 disabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Out of hours message */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Mensaje Fuera de Horario</h3>
          <p className="text-xs text-gray-500 mb-3">Respuesta automática cuando alguien escribe fuera del horario configurado</p>
          <textarea
            value={config.out_of_hours_message}
            onChange={e => setConfig(c => ({ ...c, out_of_hours_message: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
          />
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Respuestas Frecuentes (FAQ)</h3>
            <button
              onClick={() => setShowFaqForm(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Plus className="h-3 w-3" />
              Agregar
            </button>
          </div>

          {(!config.faqs || config.faqs.length === 0) && !showFaqForm && (
            <p className="text-sm text-gray-400 text-center py-4">No hay preguntas frecuentes configuradas.</p>
          )}

          <div className="space-y-2">
            {(config.faqs || []).map((faq, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{faq.question}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{faq.answer}</p>
                </div>
                <button
                  onClick={() => removeFaq(i)}
                  className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {showFaqForm && (
            <div className="mt-3 p-3 border border-indigo-200 bg-indigo-50/50 rounded-lg space-y-2">
              <input
                type="text"
                value={newFaq.question}
                onChange={e => setNewFaq(f => ({ ...f, question: e.target.value }))}
                placeholder="Pregunta del cliente"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <input
                type="text"
                value={newFaq.answer}
                onChange={e => setNewFaq(f => ({ ...f, answer: e.target.value }))}
                placeholder="Respuesta del bot"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowFaqForm(false)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
                <button onClick={addFaq} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Agregar</button>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-indigo-600" />
            Vista Previa
          </h3>
          <div className="bg-gray-50 rounded-xl p-4 max-w-sm">
            <div className="flex justify-start mb-2">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[80%]">
                <p className="text-sm text-gray-900">Hola, quiero información sobre sus servicios</p>
                <p className="text-[10px] text-gray-400 mt-1">Cliente</p>
              </div>
            </div>
            <div className="flex justify-end">
              <div style={{ backgroundColor: config.brand_color }} className="rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%]">
                <p className="text-sm text-white">
                  Hola, soy {config.bot_name}. {config.bot_personality.split('.')[0]}.
                </p>
                <p className="text-[10px] text-white/60 mt-1 flex items-center gap-1">
                  <Bot className="h-2.5 w-2.5" /> Bot · {config.tone}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4" />
              Guardado
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Guardar cambios
            </>
          )}
        </button>
        {saved && <span className="text-sm text-green-600">Cambios guardados correctamente</span>}
      </div>
    </div>
  )
}
