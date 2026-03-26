import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server-side Supabase client using the service role key.
 * Use in API routes that need full DB access (bypasses RLS).
 * NEVER expose this client to the browser.
 */
export function createServerClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Anon Supabase client for auth operations (magic link, session exchange).
 * Safe to use in server-side auth flows with user-scoped keys.
 */
export function createAnonClient() {
  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
