'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTenantRealtime } from '@/hooks/useTenantRealtime';
import { RealtimeStatusBadge } from '@/components/RealtimeStatusBadge';

type LiveEvent = {
  id: string;
  type: 'message' | 'appointment' | 'notification';
  label: string;
  urgent: boolean;
  at: number;
};

/**
 * Floating realtime indicator shown on every dashboard page.
 * Positioned bottom-right to not overlap topbar.
 * Urgent escalations persist until clicked (red, large).
 * Also dispatches CustomEvents on window so child pages can refresh their data.
 */
export function DashboardRealtimeIndicator({ tenantId }: { tenantId: string }) {
  const [events, setEvents] = useState<LiveEvent[]>([]);

  const pushEvent = useCallback((type: LiveEvent['type'], label: string, urgent: boolean) => {
    const ev: LiveEvent = { id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, type, label, urgent, at: Date.now() };
    setEvents((prev) => [ev, ...prev].slice(0, 8));
    if (!urgent) {
      window.setTimeout(() => {
        setEvents((prev) => prev.filter((e) => e.id !== ev.id));
      }, 30000);
    }
  }, []);

  const dismiss = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const status = useTenantRealtime({
    tenantId,
    tables: ['messages', 'appointments', 'notifications'],
    onNewMessage: (msg: any) => {
      console.log('[realtime] new message:', msg);
      const body = typeof msg?.content === 'string' ? msg.content.slice(0, 60) : 'mensaje';
      pushEvent('message', body, false);
      try { window.dispatchEvent(new CustomEvent('realtime:message', { detail: msg })); } catch {}
    },
    onNewAppointment: (appt: any) => {
      console.log('[realtime] new appointment:', appt);
      const label =
        appt?.date && appt?.start_time
          ? `Cita ${appt.date} ${String(appt.start_time).slice(0, 5)}`
          : 'Cita nueva';
      pushEvent('appointment', label, false);
      try { window.dispatchEvent(new CustomEvent('realtime:appointment', { detail: appt })); } catch {}
    },
    onNewNotification: (notif: any) => {
      console.log('[realtime] new notification:', notif);
      const isUrgent = notif?.type === 'urgent_escalation';
      pushEvent('notification', notif?.title ? `${notif.title}: ${String(notif.message ?? '').slice(0, 80)}` : 'Notificacion', isUrgent);
      try { window.dispatchEvent(new CustomEvent('realtime:notification', { detail: notif })); } catch {}
    },
  });

  // Listen for app requesting a manual dismiss (e.g. user navigates away)
  useEffect(() => {
    const h = () => setEvents([]);
    window.addEventListener('realtime:clear', h);
    return () => window.removeEventListener('realtime:clear', h);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {events.length > 0 && (
        <div className="pointer-events-auto flex flex-col gap-1 max-w-sm">
          {events.map((e) => (
            <div
              key={e.id}
              onClick={() => dismiss(e.id)}
              className={`cursor-pointer text-xs shadow-lg border rounded-lg px-3 py-2 flex items-center gap-2 animate-in fade-in slide-in-from-right-2 ${
                e.urgent
                  ? 'bg-red-600 text-white border-red-700 font-semibold text-sm px-4 py-3 shadow-xl ring-2 ring-red-400 animate-pulse'
                  : 'bg-white text-gray-800 border-gray-200'
              }`}
              title={e.urgent ? 'Click para descartar' : 'Click para cerrar'}
            >
              <span
                className={
                  e.urgent
                    ? 'text-white text-base'
                    : e.type === 'appointment'
                      ? 'text-blue-600'
                      : e.type === 'message'
                        ? 'text-green-600'
                        : 'text-amber-600'
                }
              >
                {e.urgent ? '🚨' : e.type === 'appointment' ? '[cita]' : e.type === 'message' ? '[msg]' : '[notif]'}
              </span>
              <span className={e.urgent ? 'flex-1' : 'truncate'}>{e.label}</span>
              {e.urgent && <span className="ml-2 text-xs opacity-80">×</span>}
            </div>
          ))}
        </div>
      )}
      <div className="pointer-events-auto">
        <RealtimeStatusBadge status={status} />
      </div>
    </div>
  );
}
