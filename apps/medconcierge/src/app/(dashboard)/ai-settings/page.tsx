"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Bot, Settings, BookOpen, Play, BarChart3, Loader2, Send,
  RotateCcw, Upload, Trash2, FileText, MessageSquare, Zap,
  DollarSign, Clock, CheckCircle2
} from "lucide-react"
import { toast } from "@/components/ui/Toast"

type Tab = "config" | "knowledge" | "playground" | "stats"

interface AiConfig {
  enabled: boolean
  systemPrompt: string
  model: string
  temperature: number
  maxTokens: number
  autoSchedule: boolean
  answerFaq: boolean
  humanHandoff: boolean
  vectorStoreId: string | null
}

interface KnowledgeFile {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: string
  status: string
  createdAt: string
}

interface AiStats {
  totalMessages: number
  totalTokens: number
  estimatedCostUSD: number
  avgLatencyMs: number
}

interface ChatMsg {
  role: "user" | "assistant"
  content: string
  model?: string
  latencyMs?: number
}

const DEFAULT_PROMPT = "Eres el concierge de Auctorum para este negocio. Responde de forma clara, breve y profesional. Si no sabes algo, ofrece transferir a un humano."

const MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Rapido y economico (Recomendado)" },
  { value: "gpt-4o", label: "GPT-4o", desc: "Mas inteligente, mayor costo" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", desc: "Balance calidad/velocidad" },
]

export default function AiSettingsPage() {
  const [tab, setTab] = useState<Tab>("config")
  const [config, setConfig] = useState<AiConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/settings")
      if (res.ok) {
        const json = await res.json()
        setConfig(json.data)
      }
    } catch (e) {
      console.error("Failed to fetch AI config:", e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const tabs: { id: Tab; label: string; icon: typeof Bot }[] = [
    { id: "config", label: "Configuracion", icon: Settings },
    { id: "knowledge", label: "Base de Conocimiento", icon: BookOpen },
    { id: "playground", label: "Playground", icon: Play },
    { id: "stats", label: "Estadisticas", icon: BarChart3 },
  ]

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-indigo-100 rounded-xl">
            <Bot className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">AI Concierge</h1>
            <p className="text-sm text-gray-500">Configura el comportamiento de tu asistente inteligente</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
              ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <t.icon className="w-4 h-4" /> <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm text-gray-400">Cargando configuracion...</p>
          </div>
        </div>
      ) : (
        <>
          {tab === "config" && <ConfigTab config={config} onUpdate={setConfig} />}
          {tab === "knowledge" && <KnowledgeTab />}
          {tab === "playground" && <PlaygroundTab />}
          {tab === "stats" && <StatsTab />}
        </>
      )}
    </div>
  )
}

/* ============================================================
   TAB 1: CONFIGURACION
   ============================================================ */
function ConfigTab({ config, onUpdate }: { config: AiConfig | null; onUpdate: (c: AiConfig) => void }) {
  const [prompt, setPrompt] = useState(config?.systemPrompt || "")
  const [model, setModel] = useState(config?.model || "gpt-4o-mini")
  const [temperature, setTemperature] = useState(config?.temperature ?? 0.7)
  const [maxTokens, setMaxTokens] = useState(config?.maxTokens ?? 300)
  const [enabled, setEnabled] = useState(config?.enabled !== false)
  const [autoSchedule, setAutoSchedule] = useState(config?.autoSchedule || false)
  const [answerFaq, setAnswerFaq] = useState(config?.answerFaq !== false)
  const [humanHandoff, setHumanHandoff] = useState(config?.humanHandoff !== false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/ai/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled, systemPrompt: prompt, model, temperature, maxTokens, autoSchedule, answerFaq, humanHandoff }),
      })
      if (res.ok) {
        const json = await res.json()
        onUpdate(json.data)
        toast("success", "Configuracion guardada correctamente")
      } else {
        toast("error", "Error al guardar la configuracion")
      }
    } catch {
      toast("error", "Error de conexion al guardar")
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* System Prompt */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Comportamiento del Agente</h3>
            <p className="text-xs text-gray-500 mt-0.5">Define como responde tu asistente a los pacientes</p>
          </div>
          <button onClick={() => setPrompt(DEFAULT_PROMPT)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            <RotateCcw className="w-3 h-3" /> Restaurar Default
          </button>
        </div>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
          rows={8}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono leading-relaxed resize-y min-h-[200px] focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition bg-gray-50" />
        <div className="flex justify-end mt-1">
          <span className="text-xs text-gray-400">{prompt.length} / 8000 caracteres</span>
        </div>
      </div>

      {/* Model & Parameters */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Modelo y Parametros</h3>
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Modelo de IA</label>
            <div className="grid gap-2">
              {MODELS.map(m => (
                <button key={m.value} onClick={() => setModel(m.value)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200
                    ${model === m.value ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200" : "border-gray-200 hover:border-gray-300"}`}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.label}</p>
                    <p className="text-xs text-gray-500">{m.desc}</p>
                  </div>
                  {model === m.value && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Creatividad (Temperature)</label>
              <span className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{temperature.toFixed(1)}</span>
            </div>
            <input type="range" min="0" max="1" step="0.1" value={temperature}
              onChange={e => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>Preciso</span><span>Creativo</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Longitud maxima de respuesta</label>
              <span className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{maxTokens} tokens</span>
            </div>
            <input type="range" min="100" max="2000" step="50" value={maxTokens}
              onChange={e => setMaxTokens(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>100</span><span>2000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Automatizaciones</h3>
        <div className="space-y-4">
          <ToggleRow label="Bot activo" description="El asistente responde mensajes de WhatsApp automaticamente" checked={enabled} onChange={setEnabled} />
          <ToggleRow label="Auto-agendar citas" description="El bot puede proponer y agendar citas directamente" checked={autoSchedule} onChange={setAutoSchedule} />
          <ToggleRow label="Responder FAQ automaticamente" description="Responde preguntas frecuentes sin intervencion humana" checked={answerFaq} onChange={setAnswerFaq} />
          <ToggleRow label="Transferir a humano si no sabe" description="Transfiere la conversacion cuando no tiene respuesta" checked={humanHandoff} onChange={setHumanHandoff} />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all duration-200 disabled:opacity-50 shadow-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {saving ? "Guardando..." : "Guardar Configuracion"}
        </button>
      </div>
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button onClick={() => onChange(!checked)} role="switch" aria-checked={checked}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? "bg-indigo-600" : "bg-gray-300"}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
    </div>
  )
}

/* ============================================================
   TAB 2: BASE DE CONOCIMIENTO
   ============================================================ */
function KnowledgeTab() {
  const [files, setFiles] = useState<KnowledgeFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/knowledge")
      if (res.ok) {
        const json = await res.json()
        setFiles(json.data || [])
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/ai/knowledge", { method: "POST", body: form })
      if (res.ok) {
        toast("success", `"${file.name}" subido correctamente`)
        fetchFiles()
      } else {
        const json = await res.json()
        toast("error", json.error || "Error al subir archivo")
      }
    } catch {
      toast("error", "Error de conexion al subir archivo")
    }
    setUploading(false)
  }

  async function handleDelete(id: string, name: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/ai/knowledge?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast("success", `"${name}" eliminado`)
        setFiles(prev => prev.filter(f => f.id !== id))
      } else {
        toast("error", "Error al eliminar archivo")
      }
    } catch {
      toast("error", "Error de conexion")
    }
    setDeleting(null)
  }

  function formatBytes(bytes: string | number) {
    const b = typeof bytes === "string" ? parseInt(bytes) : bytes
    if (b < 1024) return `${b} B`
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1048576).toFixed(1)} MB`
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
  }

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Subir Documentos</h3>
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-indigo-400", "bg-indigo-50") }}
          onDragLeave={e => { e.currentTarget.classList.remove("border-indigo-400", "bg-indigo-50") }}
          onDrop={e => {
            e.preventDefault()
            e.currentTarget.classList.remove("border-indigo-400", "bg-indigo-50")
            const file = e.dataTransfer.files[0]
            if (file) handleUpload(file)
          }}
          className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-200">
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm text-indigo-600 font-medium">Subiendo archivo...</p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">Arrastra archivos o haz click para seleccionar</p>
              <p className="text-xs text-gray-400 mt-1">PDF, TXT, Markdown, DOCX — Max 20MB</p>
            </>
          )}
          <input ref={inputRef} type="file" className="hidden" accept=".pdf,.txt,.md,.markdown,.docx"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = "" }} />
        </div>
      </div>

      {/* File List */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Archivos Ingeridos</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Tu asistente aun no tiene documentos.</p>
            <p className="text-xs text-gray-400 mt-1">Sube archivos para que pueda responder con informacion de tu negocio.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {files.map(f => (
              <div key={f.id} className="flex items-center justify-between py-3 group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{f.fileName}</p>
                    <p className="text-xs text-gray-400">
                      {formatBytes(f.sizeBytes)} · {formatDate(f.createdAt)} ·{" "}
                      <span className={f.status === "processing" ? "text-amber-500" : "text-green-500"}>
                        {f.status === "processing" ? "Procesando" : "Listo"}
                      </span>
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDelete(f.id, f.fileName)} disabled={deleting === f.id}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100">
                  {deleting === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   TAB 3: PLAYGROUND
   ============================================================ */
function PlaygroundTab() {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, sending])

  async function handleSend() {
    const text = message.trim()
    if (!text || sending) return
    setMessage("")
    setMessages(prev => [...prev, { role: "user", content: text }])
    setSending(true)

    try {
      const res = await fetch("/api/ai/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: json.data.answer,
          model: json.data.model,
          latencyMs: json.data.latencyMs,
        }])
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: json.error || "Error al consultar AI" }])
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Error de conexion" }])
    }
    setSending(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Probar Bot</h3>
        <p className="text-xs text-gray-500 mt-0.5">Envia mensajes de prueba usando tu configuracion actual. No se envian por WhatsApp.</p>
      </div>

      <div ref={scrollRef} className="h-[400px] overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">Envia un mensaje para probar tu asistente</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm
              ${m.role === "user"
                ? "bg-white text-gray-900 shadow-sm ml-auto"
                : "bg-indigo-600 text-white"}`}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
              {m.model && (
                <p className={`text-[10px] mt-2 ${m.role === "user" ? "text-gray-400" : "text-indigo-200"}`}>
                  {m.model} · {m.latencyMs}ms
                </p>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-indigo-600 rounded-2xl px-4 py-3 flex gap-1">
              <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 bg-white">
        <div className="flex gap-2">
          <input type="text" value={message} onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Escribe un mensaje de prueba..."
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition bg-gray-50" />
          <button onClick={handleSend} disabled={!message.trim() || sending}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   TAB 4: ESTADISTICAS
   ============================================================ */
function StatsTab() {
  const [stats, setStats] = useState<AiStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/ai/stats")
      .then(r => r.json())
      .then(json => { if (json.success) setStats(json.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm p-5 animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-20 mb-3" />
          <div className="h-7 bg-gray-200 rounded w-16" />
        </div>
      ))}
    </div>
  )

  if (!stats || (stats.totalMessages === 0 && stats.totalTokens === 0)) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-700">Aun no hay estadisticas</p>
        <p className="text-xs text-gray-400 mt-1">Las metricas apareceran cuando tu asistente empiece a atender pacientes.</p>
      </div>
    )
  }

  const kpis = [
    { label: "Mensajes (30d)", value: stats.totalMessages.toLocaleString(), icon: MessageSquare, color: "bg-blue-50 text-blue-600" },
    { label: "Tokens Usados", value: stats.totalTokens.toLocaleString(), icon: Zap, color: "bg-amber-50 text-amber-600" },
    { label: "Costo Estimado", value: `$${stats.estimatedCostUSD.toFixed(2)} USD`, icon: DollarSign, color: "bg-green-50 text-green-600" },
    { label: "Latencia Promedio", value: `${stats.avgLatencyMs}ms`, icon: Clock, color: "bg-purple-50 text-purple-600" },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-1.5 rounded-lg ${k.color}`}>
                <k.icon className="w-4 h-4" />
              </div>
              <span className="text-xs text-gray-500">{k.label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 text-gray-400">
          <BarChart3 className="w-5 h-5" />
          <p className="text-sm">Proximamente: Grafica de uso diario</p>
        </div>
      </div>
    </div>
  )
}
