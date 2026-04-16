'use client';

import type { RealtimeStatus } from '@/hooks/useTenantRealtime';

export function RealtimeStatusBadge({ status }: { status: RealtimeStatus }) {
  const config = {
    connecting: { color: 'bg-yellow-500', label: 'Conectando', pulse: true },
    connected: { color: 'bg-green-500', label: 'En vivo', pulse: false },
    disconnected: { color: 'bg-gray-500', label: 'Desconectado', pulse: false },
    error: { color: 'bg-red-500', label: 'Error', pulse: false },
  }[status];

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700">
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color}`} />
      </span>
      {config.label}
    </div>
  );
}
