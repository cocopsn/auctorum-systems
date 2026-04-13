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
  serviceAccountEmail: string;
  serviceAccountPrivateKey: string;
}

/**
 * Get calendar config from tenant config or environment variables.
 * Tenant config takes precedence over env vars.
 */
export function getCalendarConfig(tenantConfig?: Record<string, any>): CalendarConfig | null {
  // Try tenant-level config first
  const gc = tenantConfig?.googleCalendar;
  if (gc?.calendarId && gc?.serviceAccountEmail && gc?.serviceAccountPrivateKey) {
    return {
      calendarId: gc.calendarId,
      serviceAccountEmail: gc.serviceAccountEmail,
      serviceAccountPrivateKey: gc.serviceAccountPrivateKey.replace(/\\n/g, '\n'),
    };
  }

  // Fall back to environment variables
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!calendarId || !email || !key) return null;

  return {
    calendarId,
    serviceAccountEmail: email,
    serviceAccountPrivateKey: key.replace(/\\n/g, '\n'),
  };
}

export function isGoogleCalendarConfigured(tenantConfig?: Record<string, any>): boolean {
  return getCalendarConfig(tenantConfig) !== null;
}

/**
 * Build an authenticated Google Calendar client from config.
 */
function getCalendarClient(config: CalendarConfig) {
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
): Promise<string | null> {
  const config = getCalendarConfig(tenantConfig);
  if (!config) {
    console.log('[google-calendar] not configured, skipping event creation');
    return null;
  }

  try {
    const calendar = getCalendarClient(config);
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
): Promise<CalendarEvent[]> {
  const config = getCalendarConfig(tenantConfig);
  if (!config) return [];

  try {
    const calendar = getCalendarClient(config);
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
): Promise<boolean> {
  const config = getCalendarConfig(tenantConfig);
  if (!config) return false;

  try {
    const calendar = getCalendarClient(config);
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
): Promise<boolean> {
  const config = getCalendarConfig(tenantConfig);
  if (!config) return false;

  try {
    const calendar = getCalendarClient(config);
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
): Promise<{ success: boolean; eventCount: number }> {
  const config = getCalendarConfig(tenantConfig);
  if (!config) throw new Error('Google Calendar no esta configurado');

  const calendar = getCalendarClient(config);
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
