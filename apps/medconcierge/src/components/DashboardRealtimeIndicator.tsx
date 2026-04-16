'use client';

import { useState, useCallback } from 'react';
import { useTenantRealtime } from '@/hooks/useTenantRealtime';
import { RealtimeStatusBadge } from '@/components/RealtimeStatusBadge';

type LiveEvent = {
  type: 'message' | 'appointment' | 'notification';
  label: string;
  at: number;
};

/**
 * Floating realtime indicator shown on every dashboard page.
 * - Shows connection status badge (top-right)
 * - Shows a pulsing counter when new events arrive (last 6 events, auto-expire after 30s)
 * - Logs all events to console for debugging / demo visibility
 */
export function DashboardRealtimeIndicator({ tenantId }: { tenantId: string }) {
  const [events, setEvents] = useState<LiveEvent[]>([]);

  const pushEvent = useCallback((type: LiveEvent['type'], label: string) => {
    const ev: LiveEvent = { type, label, at: Date.now() };
    setEvents((prev) => [ev, ...prev].slice(0, 6));
    // auto-expire single events after 30s
    window.setTimeout(() => {
      setEvents((prev) => prev.filter((e) => e !== ev));
    }, 30000);
  }, []);

  const status = useTenantRealtime({
    tenantId,
    tables: ['messages', 'appointments', 'notifications'],
    onNewMessage: (msg: any) => {
      console.log('[realtime] new message:', msg);
      const body = typeof msg?.content === 'string' ? msg.content.slice(0, 60) : 'mensaje';
      pushEvent('message', body);
    },
    onNewAppointment: (appt: any) => {
      console.log('[realtime] new appointment:', appt);
      const label =
        appt?.date && appt?.start_time
          ? `Cita ${appt.date} ${String(appt.start_time).slice(0, 5)}`
          : 'Cita nueva';
      pushEvent('appointment', label);
    },
    onNewNotification: (notif: any) => {
      console.log('[realtime] new notification:', notif);
      pushEvent('notification', notif?.title ?? 'Notificacion');
    },
  });

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
      <div className="pointer-events-auto">
        <RealtimeStatusBadge status={status} />
      </div>
      {events.length > 0 && (
        <div className="pointer-events-auto flex flex-col gap-1 max-w-xs">
          {events.map((e) => (
            <div
              key={`${e.type}-${e.at}`}
              className="text-xs bg-white shadow-md border border-gray-200 rounded-md px-3 py-2 text-gray-800 flex items-center gap-2 animate-in fade-in slide-in-from-right-2"
            >
              <span
                className={
                  e.type === 'appointment'
                    ? 'text-blue-600'
                    : e.type === 'message'
                      ? 'text-green-600'
                      : 'text-amber-600'
                }
              >
                {e.type === 'appointment' ? '[cita]' : e.type === 'message' ? '[msg]' : '[notif]'}
              </span>
              <span className="truncate">{e.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
