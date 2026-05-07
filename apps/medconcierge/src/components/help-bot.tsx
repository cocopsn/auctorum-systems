'use client'

/**
 * Floating help bot button + chat panel. Lives in the bottom-right corner of
 * every dashboard page. Asks `/api/dashboard/help-bot` (gpt-4o-mini, scoped
 * system prompt). Conversation is in-memory only — closing the panel does
 * NOT persist anything. Refreshing wipes the thread.
 *
 * Constraints:
 *  - Hidden on print (`@media print` workaround via class).
 *  - Hidden when the keyboard is open on mobile? Not really feasible; we just
 *    keep the panel small enough to coexist.
 *  - 6-message rolling history sent to the server (12 max in zod schema).
 */

import { useEffect, useRef, useState } from 'react'
import { MessageCircleQuestion, X, Send, Loader2 } from 'lucide-react'

type Msg = { role: 'user' | 'assistant'; content: string }

const INITIAL_GREETING: Msg = {
  role: 'assistant',
  content:
    '¡Hola! Soy el asistente de Auctorum. Pregúntame cualquier duda sobre el dashboard, integraciones, agenda, etc.',
}

export function HelpBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([INITIAL_GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // Focus input when opening
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  async function send() {
    const trimmed = input.trim()
    if (!trimmed || loading) return
    setInput('')
    const next = [...messages, { role: 'user' as const, content: trimmed }]
    setMessages(next)
    setLoading(true)

    try {
      const res = await fetch('/api/dashboard/help-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: trimmed,
          // Send the LAST 6 (3 turns) so context stays light. The endpoint
          // also caps via zod schema (max 12).
          history: next.slice(-6),
        }),
      })
      const data = await res.json().catch(() => ({}))
      const reply =
        typeof data?.reply === 'string' && data.reply.trim().length > 0
          ? data.reply
          : 'No pude obtener respuesta. Intenta de nuevo.'
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error de conexión. Intenta de nuevo.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setMessages([INITIAL_GREETING])
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar ayuda' : 'Abrir ayuda'}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-700 text-white shadow-lg transition-transform hover:scale-105 hover:bg-cyan-800 print:hidden"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircleQuestion className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-6 z-40 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl print:hidden"
          role="dialog"
          aria-label="Asistente Auctorum"
        >
          <header className="flex items-start justify-between bg-cyan-700 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Asistente Auctorum</p>
              <p className="text-[11px] text-cyan-100">Pregúntame sobre la plataforma</p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-[11px] text-cyan-100 underline-offset-2 hover:underline"
              title="Reiniciar conversación"
            >
              Reiniciar
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] whitespace-pre-wrap rounded-lg rounded-br-sm bg-cyan-700 px-3 py-2 text-sm text-white'
                      : 'max-w-[85%] whitespace-pre-wrap rounded-lg rounded-bl-sm bg-slate-100 px-3 py-2 text-sm text-slate-800'
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pensando…
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-slate-100 p-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="¿Cómo conecto mi calendario?"
              maxLength={2000}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-700"
            />
            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || loading}
              aria-label="Enviar"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-700 text-white hover:bg-cyan-800 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
