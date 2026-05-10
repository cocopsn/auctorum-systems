'use client'

import { useEffect, useRef, useState } from 'react'

type Notification = {
  id: string
  title: string
  // DB column is `message` (notifications.message TEXT NOT NULL); the
  // earlier `body` field was a phantom — the bell rendered title + date
  // only, dropping the actual content. Camel-cased because the API
  // returns drizzle-style.
  message: string | null
  type: string | null
  read: boolean
  createdAt: string
  /**
   * Optional metadata object — when present, the renderer pulls a deep
   * link out of it (`metadata.url` / `metadata.conversationId` /
   * `metadata.appointmentId`) so clicking the row navigates to the
   * resource instead of leaving the user to find it by hand.
   */
  metadata?: Record<string, unknown> | null
}

/**
 * Best-effort URL inference from notification fields. Keeps known types
 * stable and falls back to `null` so the renderer doesn't render a link
 * when there's nothing to navigate to.
 */
function urlForNotification(n: Notification): string | null {
  const meta = (n.metadata ?? {}) as Record<string, unknown>
  if (typeof meta.url === 'string' && meta.url.length > 0) return meta.url
  if (typeof meta.conversationId === 'string') return `/conversaciones?cid=${meta.conversationId}`
  if (typeof meta.appointmentId === 'string') return `/citas?focus=${meta.appointmentId}`
  if (n.type === 'new_message') return '/conversaciones'
  if (n.type === 'new_appointment' || n.type === 'appointment_cancelled') return '/citas'
  if (n.type === 'human_escalation' || n.type === 'urgent_escalation') return '/conversaciones'
  return null
}

/**
 * Header bell. Polls /api/dashboard/notifications every 30s. Shows a
 * badge with the unread count and a panel with the latest 10 items.
 * Marks all as read on open.
 */
export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  async function fetchNotifs() {
    try {
      const res = await fetch('/api/dashboard/notifications')
      if (!res.ok) return
      const data = await res.json()
      setItems(Array.isArray(data.notifications) ? data.notifications : [])
      setUnread(Number(data.unreadCount ?? 0))
    } catch {
      // silent
    }
  }

  async function markAllRead() {
    try {
      await fetch('/api/dashboard/notifications/read-all', { method: 'POST' })
      setUnread(0)
      setItems((prev) => prev.map((it) => ({ ...it, read: true })))
    } catch {
      // silent
    }
  }

  useEffect(() => {
    void fetchNotifs()
    const id = setInterval(fetchNotifs, 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function toggle() {
    if (!open && unread > 0) void markAllRead()
    setOpen((v) => !v)
  }

  return (
    <div ref={wrapRef} className="notif-bell">
      <button type="button" onClick={toggle} className="notif-bell__btn" aria-label="Notificaciones">
        <BellIcon />
        {unread > 0 && (
          <span className="notif-bell__badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
      {open && (
        <div className="notif-bell__panel" role="listbox">
          <div className="notif-bell__header">
            <p className="notif-bell__eyebrow">NOTIFICACIONES</p>
          </div>
          {items.length === 0 ? (
            <p className="notif-bell__empty">No tienes notificaciones recientes.</p>
          ) : (
            <ul className="notif-bell__list">
              {items.slice(0, 10).map((n) => {
                const href = urlForNotification(n)
                const inner = (
                  <>
                    <p className="notif-bell__title">{n.title}</p>
                    {n.message ? <p className="notif-bell__body">{n.message}</p> : null}
                    <p className="notif-bell__time">{relativeTime(n.createdAt)}</p>
                  </>
                )
                return (
                  <li key={n.id} className={`notif-bell__item ${n.read ? 'is-read' : ''}`}>
                    {href ? (
                      <a
                        href={href}
                        className="notif-bell__link"
                        onClick={() => setOpen(false)}
                      >
                        {inner}
                      </a>
                    ) : (
                      inner
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
      <style>{`
        .notif-bell { position: relative; }
        .notif-bell__btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid transparent;
          color: rgba(15, 23, 42, 0.6);
          cursor: pointer;
        }
        .notif-bell__btn:hover {
          color: rgb(15, 23, 42);
          background: rgba(15, 23, 42, 0.04);
        }
        .notif-bell__badge {
          position: absolute;
          top: -2px;
          right: -2px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 999px;
          background: #dc2626;
          color: white;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 10px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .notif-bell__panel {
          position: absolute;
          right: 0;
          top: calc(100% + 6px);
          width: 340px;
          max-height: 480px;
          overflow-y: auto;
          background: #FFFFFC;
          border: 1px solid rgba(15, 23, 42, 0.1);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.12);
          z-index: 50;
        }
        .notif-bell__header {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.06);
        }
        .notif-bell__eyebrow {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: rgba(15, 23, 42, 0.5);
          margin: 0;
        }
        .notif-bell__empty {
          padding: 20px;
          text-align: center;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13px;
          color: rgba(15, 23, 42, 0.5);
        }
        .notif-bell__list {
          list-style: none;
          margin: 0;
          padding: 6px 0;
        }
        .notif-bell__item {
          padding: 10px 16px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.05);
        }
        .notif-bell__item:last-child { border-bottom: none; }
        .notif-bell__item.is-read .notif-bell__title { color: rgba(15, 23, 42, 0.6); font-weight: 400; }
        .notif-bell__link {
          display: block;
          color: inherit;
          text-decoration: none;
          margin: -10px -16px;
          padding: 10px 16px;
          border-radius: 6px;
        }
        .notif-bell__link:hover { background: rgba(14, 116, 144, 0.04); }
        .notif-bell__title {
          font-family: 'Fraunces', serif;
          font-size: 14px;
          font-weight: 500;
          color: rgb(15, 23, 42);
          margin: 0;
        }
        .notif-bell__body {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 12px;
          color: rgba(15, 23, 42, 0.6);
          margin: 2px 0 0;
        }
        .notif-bell__time {
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 10px;
          color: rgba(15, 23, 42, 0.4);
          letter-spacing: 0.06em;
          margin: 4px 0 0;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

function relativeTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000)
  if (diffSec < 60) return 'Hace un momento'
  if (diffSec < 3600) return `Hace ${Math.round(diffSec / 60)} min`
  if (diffSec < 86_400) return `Hace ${Math.round(diffSec / 3600)} h`
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}
