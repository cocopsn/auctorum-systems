'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Send, Bot, User, Pause, Play, Phone, Search, Pencil, Check, X, Instagram } from 'lucide-react'

// Color-coded indicator for the inbox channel.
function ChannelBadge({ channel }: { channel: string }) {
  if (channel === 'instagram') {
    return (
      <span title="Instagram" className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-gradient-to-br from-pink-500 via-fuchsia-500 to-orange-400 text-white">
        <Instagram className="h-3 w-3" />
      </span>
    )
  }
  // WhatsApp default
  return (
    <span title="WhatsApp" className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-emerald-500 text-white">
      <MessageCircle className="h-3 w-3" />
    </span>
  )
}

interface ConversationItem {
  id: string
  status: string
  channel: string
  botPaused: boolean
  unreadCount: number
  lastMessageAt: string | null
  createdAt: string
  clientId: string | null
  clientName: string | null
  clientPhone: string | null
  clientCompany: string | null
  lastMessage: string | null
}

interface MessageItem {
  id: string
  conversationId: string
  direction: string
  senderType: string
  content: string
  mediaUrl: string | null
  createdAt: string
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return ''
  const now = Date.now()
  const diff = now - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(dateStr))
}

function formatTime(dateStr: string): string {
  return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr))
}

export default function ConversationsPage() {
  const [convos, setConvos] = useState<ConversationItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<MessageItem[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'instagram'>('all')
  const chatEndRef = useRef<HTMLDivElement>(null)

  const fetchConvos = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/conversations')
      if (res.ok) {
        const data = await res.json()
        setConvos(data.conversations || [])
      }
    } catch {}
    setLoading(false)
  }, [])

  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/dashboard/conversations/${convId}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMsgs(data.messages || [])
      }
    } catch {}
  }, [])

  // Realtime: refresh conversations list + active messages on new message event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail: any = (e as CustomEvent).detail
      fetchConvos()
      const convId = detail?.conversation_id
      if (convId && convId === selectedId) {
        fetchMessages(convId)
      } else if (selectedId) {
        // still refresh in case selected conversation got a message from other side
        fetchMessages(selectedId)
      }
    }
    window.addEventListener('realtime:message', handler)
    return () => window.removeEventListener('realtime:message', handler)
  }, [fetchConvos, fetchMessages, selectedId])

  useEffect(() => {
    fetchConvos()
    const interval = setInterval(fetchConvos, 10000)
    return () => clearInterval(interval)
  }, [fetchConvos])

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId)
      const interval = setInterval(() => fetchMessages(selectedId), 10000)
      return () => clearInterval(interval)
    }
  }, [selectedId, fetchMessages])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  const selectedConvo = convos.find(c => c.id === selectedId)

  async function handleSend() {
    if (!input.trim() || !selectedId || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/dashboard/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setMsgs(prev => [...prev, data.message])
        setInput('')
      }
    } catch {}
    setSending(false)
  }

  async function toggleBot() {
    if (!selectedId || !selectedConvo) return
    try {
      await fetch(`/api/dashboard/conversations/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botPaused: !selectedConvo.botPaused }),
      })
      fetchConvos()
    } catch {}
  }

  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState('')
  async function saveRename() {
    if (!selectedId || !renameVal.trim()) { setRenaming(false); return }
    try {
      const res = await fetch(`/api/dashboard/conversations/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: renameVal.trim() }),
      })
      if (res.ok) {
        await fetchConvos()
      }
    } catch {}
    setRenaming(false)
  }

  const filtered = convos.filter(c => {
    if (channelFilter !== 'all' && c.channel !== channelFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (c.clientName && c.clientName.toLowerCase().includes(q)) ||
      (c.clientPhone && c.clientPhone.includes(q)) ||
      (c.clientCompany && c.clientCompany.toLowerCase().includes(q))
    )
  })

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Left panel - Conversation list */}
      <div className="w-full md:w-96 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-gray-900">Conversaciones</h1>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {convos.length}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300"
            />
          </div>
          <div className="mt-2 flex gap-1 rounded-lg border border-gray-100 bg-gray-50 p-0.5 text-xs">
            {(['all', 'whatsapp', 'instagram'] as const).map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setChannelFilter(opt)}
                className={`flex-1 rounded-md px-2 py-1 font-medium transition-colors ${
                  channelFilter === opt
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt === 'all' ? 'Todos' : opt === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <MessageCircle className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">Sin conversaciones</p>
              <p className="text-xs text-gray-500">Cuando un cliente escriba por WhatsApp, aparecerá aquí.</p>
            </div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-2 ${
                  selectedId === c.id
                    ? 'bg-indigo-50 border-indigo-600'
                    : 'border-transparent hover:bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700">
                  {(c.clientName || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ChannelBadge channel={c.channel} />
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {c.clientName || (c.channel === 'instagram' ? 'Instagram' : 'Sin nombre')}
                      </p>
                    </div>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">
                      {formatRelative(c.lastMessageAt || c.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {c.lastMessage || 'Sin mensajes'}
                  </p>
                </div>
                {c.unreadCount > 0 && (
                  <span className="flex-shrink-0 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {c.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel - Chat */}
      <div className="hidden md:flex flex-1 flex-col bg-white">
        {!selectedConvo ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <MessageCircle className="h-7 w-7 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">Selecciona una conversación</p>
            <p className="text-xs text-gray-500">Elige un chat del panel izquierdo para ver los mensajes.</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700">
                {(selectedConvo.clientName || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                {renaming ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={renameVal}
                      onChange={(e) => setRenameVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenaming(false) }}
                      className="text-sm font-semibold text-gray-900 border border-indigo-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-0 flex-1"
                      placeholder="Nombre del contacto"
                      maxLength={255}
                    />
                    <button onClick={saveRename} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Guardar">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setRenaming(false)} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="Cancelar">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 group">
                    <p className="text-sm font-semibold text-gray-900 truncate">{selectedConvo.clientName || 'Sin nombre'}</p>
                    <button
                      onClick={() => { setRenameVal(selectedConvo.clientName || ''); setRenaming(true) }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-opacity"
                      title="Renombrar contacto"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {selectedConvo.clientPhone && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {selectedConvo.clientPhone}
                  </p>
                )}
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                selectedConvo.botPaused
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {selectedConvo.botPaused ? 'Bot pausado' : 'Bot activo'}
              </span>
              <button
                onClick={toggleBot}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedConvo.botPaused
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                {selectedConvo.botPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                {selectedConvo.botPaused ? 'Reanudar' : 'Pausar bot'}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
              {msgs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-gray-400">
                  Sin mensajes en esta conversación
                </div>
              ) : (
                msgs.map(m => (
                  <div
                    key={m.id}
                    className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2.5 text-sm ${
                        m.direction === 'outbound'
                          ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm'
                          : 'bg-white text-gray-900 rounded-2xl rounded-bl-sm border border-gray-100'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <div className={`flex items-center gap-1.5 mt-1 text-[10px] ${
                        m.direction === 'outbound' ? 'text-white/60' : 'text-gray-400'
                      }`}>
                        <span>{formatTime(m.createdAt)}</span>
                        {m.direction === 'outbound' && (
                          <span className="flex items-center gap-0.5">
                            {m.senderType === 'bot' && <Bot className="h-2.5 w-2.5" />}
                            {m.senderType === 'bot' ? 'Bot' : 'Manual'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input bar */}
            <div className="border-t border-gray-100 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-full bg-gray-50 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
