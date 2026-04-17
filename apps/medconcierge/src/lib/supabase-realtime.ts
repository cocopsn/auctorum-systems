import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return client;
}

export type RealtimeTable = 'messages' | 'appointments' | 'notifications' | 'conversations';

export type RealtimeEvent<T = any> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  schema: string;
  table: string;
};

/**
 * Subscribe to tenant-scoped changes on a table.
 * Returns an unsubscribe function.
 */
export function subscribeTenantTable<T = any>(params: {
  tenantId: string;
  table: RealtimeTable;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  onEvent: (event: RealtimeEvent<T>) => void;
  onStatusChange?: (status: string) => void;
}): () => void {
  const { tenantId, table, event = 'INSERT', onEvent, onStatusChange } = params;
  const supabase = getSupabaseClient();
  const channelName = `tenant:${tenantId}:${table}`;

  const channel: RealtimeChannel = supabase
    .channel(channelName)
    .on(
      'postgres_changes' as any,
      {
        event,
        schema: 'public',
        table,
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload: any) => {
        onEvent({
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
          schema: payload.schema,
          table: payload.table,
        });
      },
    )
    .subscribe((status) => {
      console.log(`[realtime ${channelName}] status=${status}`);
      if (onStatusChange) onStatusChange(status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
