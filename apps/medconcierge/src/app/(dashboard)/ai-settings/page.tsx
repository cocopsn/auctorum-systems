"use client"

import { useState, useEffect, useCallback } from "react"
import { Bot, Settings, Play, BarChart3, Loader2, Send, RotateCcw, Zap, Sparkles, ChevronDown } from "lucide-react"

type Tab = "prompt" | "model" | "playground" | "stats"

// Mirrored from packages/ai/specialty-templates.ts.
// Kept inline so the client bundle does not pull the full template payload
// (~30KB of medical prompts) — we only need the picker metadata here.
const SPECIALTY_OPTIONS: Array<{ id: string; name: string; icon: string }> = [
  { id: 'odontologia',       name: 'Odontología',           icon: '🦷' },
  { id: 'medicina_general',  name: 'Medicina General',      icon: '🩺' },
  { id: 'dermatologia',      name: 'Dermatología',          icon: '🧴' },
  { id: 'cardiologia',       name: 'Cardiología',           icon: '❤️' },
  { id: 'pediatria',         name: 'Pediatría',             icon: '👶' },
  { id: 'ginecologia',       name: 'Ginecología',           icon: '🩷' },
  { id: 'traumatologia',     name: 'Traumatología',         icon: '🦴' },
]

export default function AiSettingsPage() {
  const [tab, setTab] = useState<Tab>("prompt")
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<any>(null)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/ai/config")
      if (res.ok) {
        const json = await res.json()
        setConfig(json.settings)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  async function saveConfig(updates: Record<string, any>) {
    setSaving(true)
    try {
      const res = await fetch("/api/dashboard/ai/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const json = await res.json()
        setConfig(json.settings)
      }
    } catch (e) { console.error(e) }
    setSaving(false)
  }

  if (loading) return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>

  const tabs = [
    { id: "prompt" as Tab, label: "System Prompt", icon: Bot },
    { id: "model" as Tab, label: "Modelo", icon: Settings },
    { id: "playground" as Tab, label: "Playground", icon: Play },
    { id: "stats" as Tab, label: "Estadisticas", icon: BarChart3 },
  ]

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">AI Concierge</h1>
        <p className="mt-1 text-sm text-gray-500">Configura el comportamiento del asistente de WhatsApp.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition
              ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {tab === "prompt" && <PromptTab config={config} saving={saving} onSave={saveConfig} onTemplateApplied={fetchConfig} />}
        {tab === "model" && <ModelTab config={config} saving={saving} onSave={saveConfig} />}
        {tab === "playground" && <PlaygroundTab />}
        {tab === "stats" && <StatsTab stats={stats} setStats={setStats} />}
      </div>
    </div>
  )
}

function PromptTab({
  config,
  saving,
  onSave,
  onTemplateApplied,
}: {
  config: any
  saving: boolean
  onSave: (u: any) => void
  onTemplateApplied: () => void
}) {
  const [prompt, setPrompt] = useState(config?.systemPrompt || "")
  const [pendingTemplate, setPendingTemplate] = useState<string>("")
  const [applying, setApplying] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [applyOpts, setApplyOpts] = useState({
    systemPrompt: true,
    botMessages: true,
    specialty: true,
    services: false,
    schedule: false,
  })

  // Re-sync the textarea when config refreshes (e.g., after applying a template).
  useEffect(() => {
    if (config?.systemPrompt !== undefined) setPrompt(config.systemPrompt || "")
  }, [config?.systemPrompt])

  const defaultPrompt =
    "Eres un concierge medico para el consultorio. Ayuda a resolver preguntas frecuentes, explicar horarios y preparar solicitudes de cita. No diagnostiques ni sustituyas criterio medico; si hay sintomas urgentes, indica contactar emergencias o transferir a humano."

  function handleSelectTemplate(value: string) {
    if (!value) return
    setPendingTemplate(value)
    setConfirming(true)
  }

  async function applyTemplate(overwrite: boolean) {
    if (!pendingTemplate) return
    setApplying(true)
    try {
      const res = await fetch("/api/dashboard/ai/apply-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialtyId: pendingTemplate,
          apply: applyOpts,
          overwrite,
        }),
      })
      if (res.ok) {
        setConfirming(false)
        setPendingTemplate("")
        onTemplateApplied() // refetches config + updates the prompt textarea
      } else {
        const err = await res.json().catch(() => ({}))
        alert(`Error: ${err.error || "No se pudo aplicar el template"}`)
      }
    } finally {
      setApplying(false)
    }
  }

  const pendingMeta = SPECIALTY_OPTIONS.find((o) => o.id === pendingTemplate)

  return (
    <div className="space-y-6">
      {/* Template selector */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-50/40 border border-blue-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900">Cargar template de especialidad</h4>
            <p className="text-xs text-gray-600 mt-0.5">
              Pre-configura el bot con prompt, reglas de emergencia y mensajes según tu especialidad médica.
            </p>
            <div className="relative mt-3">
              <select
                value={pendingTemplate}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full appearance-none px-3 py-2 pr-9 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
              >
                <option value="">— Selecciona una especialidad —</option>
                {SPECIALTY_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirming && pendingMeta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !applying && setConfirming(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl" aria-hidden>
                {pendingMeta.icon}
              </span>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Aplicar template: {pendingMeta.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Selecciona qué partes del template quieres aplicar.
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-sm">
              {[
                { key: 'systemPrompt' as const, label: 'System Prompt del bot' },
                { key: 'botMessages' as const, label: 'Mensajes del bot (bienvenida, recordatorios, etc.)' },
                { key: 'specialty' as const, label: 'Especialidad y duración de consulta' },
                { key: 'services' as const, label: 'Servicios sugeridos (con precios MXN base)' },
                { key: 'schedule' as const, label: 'Horarios sugeridos' },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition"
                >
                  <input
                    type="checkbox"
                    checked={applyOpts[opt.key]}
                    onChange={(e) =>
                      setApplyOpts((s) => ({ ...s, [opt.key]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Por defecto, el template <strong>NO sobrescribe</strong> tu configuración existente —
              sólo rellena los campos vacíos. Si quieres reemplazar todo, usa "Sobrescribir todo".
            </p>

            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
              <button
                onClick={() => setConfirming(false)}
                disabled={applying}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => applyTemplate(true)}
                disabled={applying}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
              >
                Sobrescribir todo
              </button>
              <button
                onClick={() => applyTemplate(false)}
                disabled={applying}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {applying ? 'Aplicando...' : 'Rellenar campos vacíos'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System prompt editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">System Prompt</h3>
          <button
            onClick={() => setPrompt(defaultPrompt)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            <RotateCcw className="w-3 h-3" /> Restaurar default
          </button>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={12}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono leading-relaxed resize-y focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{prompt.length} caracteres</span>
          <button
            onClick={() => onSave({ systemPrompt: prompt })}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModelTab({ config, saving, onSave }: { config: any; saving: boolean; onSave: (u: any) => void }) {
  // Hidrate from `config` so saved values stick after a reload.
  // Pre-2026-05-10 these were `useState(0.7)` / `useState(300)` regardless
  // of the persisted value, so the doctor's saved slider position was
  // wiped on every page navigation.
  const [model, setModel] = useState(config?.model ?? 'gpt-4o-mini')
  const [temperature, setTemperature] = useState<number>(
    typeof config?.temperature === 'number' ? config.temperature : 0.7,
  )
  const [maxTokens, setMaxTokens] = useState<number>(
    typeof config?.maxTokens === 'number' ? config.maxTokens : 300,
  )
  const [enabled, setEnabled] = useState(config?.enabled !== false)

  // Re-sync if the parent re-fetches config (eg. after another tab saves).
  useEffect(() => {
    if (config?.model !== undefined) setModel(config.model ?? 'gpt-4o-mini')
    if (typeof config?.temperature === 'number') setTemperature(config.temperature)
    if (typeof config?.maxTokens === 'number') setMaxTokens(config.maxTokens)
    if (config?.enabled !== undefined) setEnabled(config.enabled !== false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.model, config?.temperature, config?.maxTokens, config?.enabled])

  const models = [
    { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Rapido y economico (Recomendado)" },
    { value: "gpt-4o", label: "GPT-4o", desc: "Mas inteligente, mayor costo" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo", desc: "Balance calidad/velocidad" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
        <div>
          <p className="text-sm font-medium text-gray-900">Bot Activo</p>
          <p className="text-xs text-gray-500 mt-0.5">Si desactivado, el webhook no llama a OpenAI</p>
        </div>
        <button onClick={() => { setEnabled(!enabled); onSave({ enabled: !enabled }) }}
          className={`relative w-12 h-6 rounded-full transition ${enabled ? "bg-blue-600" : "bg-gray-300"}`}>
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-0.5"}`} />
        </button>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-900">Modelo</label>
        <div className="mt-2 grid gap-2">
          {models.map(m => (
            <button key={m.value} onClick={() => setModel(m.value)}
              className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${model === m.value ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
              <div>
                <p className="text-sm font-medium text-gray-900">{m.label}</p>
                <p className="text-xs text-gray-500">{m.desc}</p>
              </div>
              {model === m.value && <Zap className="w-4 h-4 text-blue-600" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-900">Creatividad (Temperature)</label>
          <span className="text-sm text-gray-500">{temperature.toFixed(1)}</span>
        </div>
        <input type="range" min="0" max="1" step="0.1" value={temperature}
          onChange={e => setTemperature(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>Preciso</span><span>Creativo</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-900">Longitud maxima de respuesta</label>
          <span className="text-sm text-gray-500">{maxTokens} tokens</span>
        </div>
        <input type="range" min="100" max="1000" step="50" value={maxTokens}
          onChange={e => setMaxTokens(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
      </div>

      <button onClick={() => onSave({ model, temperature, maxTokens, enabled })} disabled={saving}
        className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
        {saving ? "Guardando..." : "Guardar Configuracion"}
      </button>
    </div>
  )
}

function PlaygroundTab() {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Array<{ role: string; content: string; meta?: any }>>([])
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!message.trim() || sending) return
    const userMsg = message.trim()
    setMessage("")
    setMessages(prev => [...prev, { role: "user", content: userMsg }])
    setSending(true)

    try {
      const start = Date.now()
      const res = await fetch("/api/dashboard/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      })
      const json = await res.json()
      setMessages(prev => [...prev, {
        role: "assistant",
        content: json.answer || json.error || "Sin respuesta",
        meta: { model: json.model, latencyMs: json.latencyMs, responseId: json.responseId },
      }])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: "assistant", content: "Error: " + e.message }])
    }
    setSending(false)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900">Probar Bot</h3>
      <p className="text-xs text-gray-500">Envia mensajes de prueba usando tu configuracion actual. No envia WhatsApp.</p>

      <div className="h-80 overflow-y-auto border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-20">Envia un mensaje para probar el bot</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
              m.role === "user" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-800"
            }`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.meta && (
                <p className="text-[10px] mt-1 opacity-60">
                  {m.meta.model} | {m.meta.latencyMs}ms
                </p>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input type="text" value={message} onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Escribe un mensaje de prueba..."
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition" />
        <button onClick={handleSend} disabled={!message.trim() || sending}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function StatsTab({ stats, setStats }: { stats: any; setStats: (s: any) => void }) {
  const [loading, setLoading] = useState(!stats)

  useEffect(() => {
    if (!stats) {
      fetch("/api/dashboard/ai/stats")
        .then(r => r.json())
        .then(setStats)
        .finally(() => setLoading(false))
    }
  }, [stats, setStats])

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>

  return (
    <div className="space-y-6">
      <h3 className="text-base font-semibold text-gray-900">Estadisticas (30 dias)</h3>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Mensajes Procesados" value={stats?.totalMessages || 0} />
        <StatCard label="Tokens Consumidos" value={(stats?.totalTokens || 0).toLocaleString()} />
        <StatCard label="Costo Estimado (USD)" value={`$${stats?.estimatedCostUSD || "0.00"}`} />
        <StatCard label="Latencia Promedio" value={`${stats?.avgLatencyMs || 0}ms`} />
      </div>

      {stats?.dailyMessages && stats.dailyMessages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Mensajes por dia (7 dias)</h4>
          <div className="flex items-end gap-2 h-32">
            {stats.dailyMessages.map((d: any, i: number) => {
              const max = Math.max(...stats.dailyMessages.map((x: any) => x.count), 1)
              const height = (d.count / max) * 100
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500">{d.count}</span>
                  <div className="w-full bg-blue-500 rounded-t-lg transition-all" style={{ height: `${height}%`, minHeight: "4px" }} />
                  <span className="text-[10px] text-gray-400">{d.date.slice(5)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  )
}
