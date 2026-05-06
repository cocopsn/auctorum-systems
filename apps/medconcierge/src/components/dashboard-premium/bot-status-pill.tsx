'use client'

export function BotStatusPill({
  online,
  processedToday,
  lastSeenAt,
}: {
  online: boolean
  processedToday: number
  lastSeenAt: string | null
}) {
  const lastSeen = lastSeenAt ? new Date(lastSeenAt) : null
  const lastSeenFmt =
    !lastSeen
      ? 'sin actividad'
      : Date.now() - lastSeen.getTime() < 60_000
        ? 'activo ahora'
        : `visto hace ${relMin(lastSeen)}`

  return (
    <div className={`bot-pill ${online ? 'is-online' : 'is-offline'}`}>
      <span className="bot-pill__dot">
        <span className="bot-pill__pulse" />
      </span>
      <span className="bot-pill__label">
        Bot {online ? 'online' : 'offline'} · {processedToday.toLocaleString('es-MX')} mensajes hoy
      </span>
      <span className="bot-pill__sep">·</span>
      <span className="bot-pill__sub">{lastSeenFmt}</span>
      <style>{`
        .bot-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 999px;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 12px;
          color: rgb(15, 23, 42);
          background: rgba(15, 23, 42, 0.04);
          border: 1px solid rgba(15, 23, 42, 0.08);
        }
        .bot-pill.is-online { background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.2); }
        .bot-pill.is-offline { background: rgba(220, 38, 38, 0.06); border-color: rgba(220, 38, 38, 0.18); }
        .bot-pill__dot {
          position: relative;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${'#dc2626'};
        }
        .bot-pill.is-online .bot-pill__dot { background: #10b981; }
        .bot-pill__pulse {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: inherit;
          animation: bot-pulse 1.6s ease-out infinite;
        }
        .bot-pill.is-offline .bot-pill__pulse { animation: none; opacity: 0; }
        .bot-pill__label { font-weight: 500; }
        .bot-pill__sep { color: rgba(15, 23, 42, 0.3); }
        .bot-pill__sub { color: rgba(15, 23, 42, 0.55); }
        @keyframes bot-pulse {
          0%   { transform: scale(1); opacity: 0.6; }
          80%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function relMin(d: Date): string {
  const min = Math.max(1, Math.round((Date.now() - d.getTime()) / 60_000))
  if (min < 60) return `${min} min`
  if (min < 1440) return `${Math.round(min / 60)} h`
  return `${Math.round(min / 1440)} d`
}
