'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeTenantTable, type RealtimeTable } from '@/lib/supabase-realtime';

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useTenantRealtime(params: {
  tenantId: string;
  tables: RealtimeTable[];
  onNewMessage?: (msg: any) => void;
  onNewAppointment?: (appt: any) => void;
  onNewNotification?: (notif: any) => void;
}): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>('connecting');

  // Keep latest callbacks in refs to avoid re-subscribing when parent re-renders
  const onMsgRef = useRef(params.onNewMessage);
  const onApptRef = useRef(params.onNewAppointment);
  const onNotifRef = useRef(params.onNewNotification);
  onMsgRef.current = params.onNewMessage;
  onApptRef.current = params.onNewAppointment;
  onNotifRef.current = params.onNewNotification;

  const tablesKey = params.tables.join(',');

  useEffect(() => {
    if (!params.tenantId) return;

    const unsubscribes: Array<() => void> = [];
    const statuses: Record<string, string> = {};

    for (const table of params.tables) {
      const unsub = subscribeTenantTable({
        tenantId: params.tenantId,
        table,
        event: 'INSERT',
        onEvent: (event) => {
          if (table === 'messages') onMsgRef.current?.(event.new);
          else if (table === 'appointments') onApptRef.current?.(event.new);
          else if (table === 'notifications') onNotifRef.current?.(event.new);
        },
        onStatusChange: (s) => {
          statuses[table] = s;
          const all = Object.values(statuses);
          if (all.length === params.tables.length && all.every((st) => st === 'SUBSCRIBED')) {
            setStatus('connected');
          } else if (all.some((st) => st === 'CHANNEL_ERROR' || st === 'TIMED_OUT')) {
            setStatus('error');
          } else if (all.some((st) => st === 'CLOSED')) {
            setStatus('disconnected');
          }
        },
      });
      unsubscribes.push(unsub);
    }

    return () => {
      unsubscribes.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenantId, tablesKey]);

  return status;
}
