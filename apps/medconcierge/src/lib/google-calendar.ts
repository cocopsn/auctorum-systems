import { google } from 'googleapis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  status: string;
}

export interface CreateEventParams {
  summary: string;
  description?: string;
  startDateTime: string; // ISO 8601
  endDateTime: string;   // ISO 8601
  location?: string;
  attendeeEmail?: string;
  reminderMinutes?: number;
}

export interface UpdateEventParams {
  summary?: string;
  description?: string;
  startDateTime?: string;
  endDateTime?: string;
  location?: string;
}

// ---------------------------------------------------------------------------
// Configuration helpers
// ---------------------------------------------------------------------------

interface CalendarConfig {
  calendarId: string;
  mode: 'oauth' | 'service_account';
  // Service account fields
  serviceAccountEmail?: string;
  serviceAccountPrivateKey?: string;
  // OAuth fields
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: string;
  tenantId?: string;
}

/**
 * Get calendar config from tenant config or environment variables.
 * Supports both OAuth (per-doctor) and service account (legacy) modes.
 */
export function getCalendarConfig(tenantConfig?: Record<string, any>, tenantId?: string): CalendarConfig | null {
  const gc = tenantConfig?.googleCalendar;
  if (!gc) {
    // Fall back to environment variables (service account only)
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    if (!calendarId || !email || !key) return null;
    return {
      calendarId,
      mode: 'service_account',
      serviceAccountEmail: email,
      serviceAccountPrivateKey: key.replace(/\\n/g, '\n'),
    };
  }

  // OAuth mode (preferred)
  if (gc.mode === 'oauth' && gc.oauth?.refreshToken) {
    // Decrypt at-rest tokens. Rows written after 2026-05-12 have
    // `encrypted: true`. Pre-existing rows have plaintext tokens until
    // the backfill script runs — detect via the ciphertext shape
    // (`iv:tag:cipher` = 3 hex segments separated by ':').
    const maybeDecrypt = (val: string | undefined | null): string | undefined => {
      if (!val) return undefined
      if (!gc.oauth?.encrypted) return val
      try {
        // Lazy import to keep packages/db edge-bundle small.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { decrypt } = require('@quote-engine/db') as { decrypt: (s: string) => string }
        return decrypt(val)
      } catch (err) {
        console.error('[google-calendar] decrypt failed:', err instanceof Error ? err.message : err)
        return undefined
      }
    }

    return {
      calendarId: gc.oauth.calendarId || gc.calendarId || 'primary',
      mode: 'oauth',
      accessToken: maybeDecrypt(gc.oauth.accessToken),
      refreshToken: maybeDecrypt(gc.oauth.refreshToken),
      tokenExpiry: gc.oauth.tokenExpiry,
      tenantId,
    };
  }

  // Service account mode (legacy)
  if (gc.calendarId && gc.serviceAccountEmail && gc.serviceAccountPrivateKey) {
    return {
      calendarId: gc.calendarId,
      mode: 'service_account',
      serviceAccountEmail: gc.serviceAccountEmail,
      serviceAccountPrivateKey: gc.serviceAccountPrivateKey.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

export function isGoogleCalendarConfigured(tenantConfig?: Record<string, any>): boolean {
  return getCalendarConfig(tenantConfig) !== null;
}

// ---------------------------------------------------------------------------
// OAuth token refresh
// ---------------------------------------------------------------------------

/**
 * Refresh an OAuth access token using the refresh token.
 * Returns the new access token or null on failure.
 */
async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
} | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[google-calendar] Cannot refresh token: missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    return null;
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[google-calendar] Token refresh failed:', err);
      return null;
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600,
    };
  } catch (err: any) {
    console.error('[google-calendar] Token refresh error:', err?.message || err);
    return null;
  }
}

/**
 * Get a valid access token, refreshing if needed.
 * Updates the tenant config in the DB if the token was refreshed.
 */
async function getValidAccessToken(config: CalendarConfig): Promise<string | null> {
  if (!config.accessToken || !config.refreshToken) return null;

  // Check if token is still valid (with 5min buffer)
  if (config.tokenExpiry) {
    const expiry = new Date(config.tokenExpiry).getTime();
    if (Date.now() < expiry - 5 * 60 * 1000) {
      return config.accessToken;
    }
  }

  // Token expired or no expiry info — refresh it
  console.log('[google-calendar] Access token expired, refreshing...');
  const refreshed = await refreshAccessToken(config.refreshToken);
  if (!refreshed) return null;

  // Update DB with new token if we have tenantId
  if (config.tenantId) {
    try {
      // Dynamic import to avoid circular dependency in cron scripts
      const { db, tenants } = await import('@quote-engine/db');
      const { eq } = await import('drizzle-orm');

      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, config.tenantId)).limit(1);
      if (tenant) {
        const tenantConfig = (tenant.config as Record<string, any>) || {};
        if (tenantConfig.googleCalendar?.oauth) {
          tenantConfig.googleCalendar.oauth.accessToken = refreshed.accessToken;
          tenantConfig.googleCalendar.oauth.tokenExpiry = new Date(
            Date.now() + refreshed.expiresIn * 1000,
          ).toISOString();

          await db
            .update(tenants)
            .set({ config: tenantConfig, updatedAt: new Date() })
            .where(eq(tenants.id, config.tenantId));

          console.log('[google-calendar] Token refreshed and saved to DB');
        }
      }
    } catch (err: any) {
      console.error('[google-calendar] Failed to save refreshed token:', err?.message);
    }
  }

  return refreshed.accessToken;
}

// ---------------------------------------------------------------------------
// Calendar client builders
// ---------------------------------------------------------------------------

/**
 * Build an authenticated Google Calendar client from config.
 * Supports both OAuth and service account authentication.
 */
async function getCalendarClient(config: CalendarConfig) {
  if (config.mode === 'oauth') {
    const accessToken = await getValidAccessToken(config);
    if (!accessToken) {
      throw new Error('Failed to get valid OAuth access token');
    }
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.calendar({ version: 'v3', auth });
  }

  // Service account auth (legacy)
  const auth = new google.auth.JWT({
    email: config.serviceAccountEmail,
    key: config.serviceAccountPrivateKey,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a calendar event. Returns the event ID or null on failure.
 */
export async function createCalendarEvent(
  params: CreateEventParams,
  tenantConfig?: Record<string, any>,
  tenantId?: string,
): Promise<string | null> {
  const config = getCalendarConfig(tenantConfig, tenantId);
  if (!config) {
    console.log('[google-calendar] not configured, skipping event creation');
    return null;
  }

  try {
    const calendar = await getCalendarClient(config);
    const reminderMinutes = params.reminderMinutes ?? 60;

    const event = await calendar.events.insert({
      calendarId: config.calendarId,
      requestBody: {
        summary: params.summary,
        description: params.description,
        location: params.location,
        start: {
          dateTime: params.startDateTime,
          timeZone: 'America/Monterrey',
        },
        end: {
          dateTime: params.endDateTime,
          timeZone: 'America/Monterrey',
        },
        attendees: params.attendeeEmail
          ? [{ email: params.attendeeEmail }]
          : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: reminderMinutes },
          ],
        },
      },
    });

    console.log('[google-calendar] event created:', event.data.id);
    return event.data.id ?? null;
  } catch (error: any) {
    console.error('[google-calendar] create event error:', error?.message || error);
    return null;
  }
}

/**
 * List calendar events in a date range.
 */
export async function listCalendarEvents(
  timeMin: string,
  timeMax: string,
  tenantConfig?: Record<string, any>,
  tenantId?: string,
): Promise<CalendarEvent[]> {
  const config = getCalendarConfig(tenantConfig, tenantId);
  if (!config) return [];

  try {
    const calendar = await getCalendarClient(config);
    const response = await calendar.events.list({
      calendarId: config.calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });

    return (response.data.items ?? []).map((item) => ({
      id: item.id ?? '',
      summary: item.summary ?? '',
      description: item.description ?? undefined,
      location: item.location ?? undefined,
      start: item.start?.dateTime ?? item.start?.date ?? '',
      end: item.end?.dateTime ?? item.end?.date ?? '',
      status: item.status ?? 'confirmed',
    }));
  } catch (error: any) {
    console.error('[google-calendar] list events error:', error?.message || error);
    return [];
  }
}

/**
 * Cancel (delete) a calendar event by ID.
 */
export async function cancelCalendarEvent(
  eventId: string,
  tenantConfig?: Record<string, any>,
  tenantId?: string,
): Promise<boolean> {
  const config = getCalendarConfig(tenantConfig, tenantId);
  if (!config) return false;

  try {
    const calendar = await getCalendarClient(config);
    await calendar.events.delete({
      calendarId: config.calendarId,
      eventId,
    });
    console.log('[google-calendar] event cancelled:', eventId);
    return true;
  } catch (error: any) {
    console.error('[google-calendar] cancel event error:', error?.message || error);
    return false;
  }
}

/**
 * Update a calendar event.
 */
export async function updateCalendarEvent(
  eventId: string,
  updates: UpdateEventParams,
  tenantConfig?: Record<string, any>,
  tenantId?: string,
): Promise<boolean> {
  const config = getCalendarConfig(tenantConfig, tenantId);
  if (!config) return false;

  try {
    const calendar = await getCalendarClient(config);
    const requestBody: any = {};

    if (updates.summary) requestBody.summary = updates.summary;
    if (updates.description) requestBody.description = updates.description;
    if (updates.location) requestBody.location = updates.location;
    if (updates.startDateTime) {
      requestBody.start = {
        dateTime: updates.startDateTime,
        timeZone: 'America/Monterrey',
      };
    }
    if (updates.endDateTime) {
      requestBody.end = {
        dateTime: updates.endDateTime,
        timeZone: 'America/Monterrey',
      };
    }

    await calendar.events.patch({
      calendarId: config.calendarId,
      eventId,
      requestBody,
    });
    console.log('[google-calendar] event updated:', eventId);
    return true;
  } catch (error: any) {
    console.error('[google-calendar] update event error:', error?.message || error);
    return false;
  }
}

/**
 * Test the connection by listing upcoming events (next 24h). Throws on failure.
 */
export async function testCalendarConnection(
  tenantConfig?: Record<string, any>,
  tenantId?: string,
): Promise<{ success: boolean; eventCount: number }> {
  const config = getCalendarConfig(tenantConfig, tenantId);
  if (!config) throw new Error('Google Calendar no esta configurado');

  const calendar = await getCalendarClient(config);
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const response = await calendar.events.list({
    calendarId: config.calendarId,
    timeMin: now.toISOString(),
    timeMax: tomorrow.toISOString(),
    singleEvents: true,
    maxResults: 5,
  });

  return {
    success: true,
    eventCount: response.data.items?.length ?? 0,
  };
}
