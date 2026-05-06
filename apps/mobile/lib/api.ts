import Constants from 'expo-constants'
import { getStoredAccessToken, logout } from './auth'

function apiBaseUrl(): string {
  return (Constants.expoConfig?.extra?.apiBaseUrl as string)
    ?? 'https://portal.auctorum.com.mx'
}

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

/**
 * Authenticated fetch wrapper. Reads the access token from SecureStore and
 * sends it as Bearer. On 401 the user is signed out (token expired).
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getStoredAccessToken()
  if (!token) throw new ApiError('Not authenticated', 401, null)

  const res = await fetch(`${apiBaseUrl()}/api${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  })

  if (res.status === 401) {
    await logout()
    throw new ApiError('Session expired', 401, null)
  }

  let body: unknown = null
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) body = await res.json()

  if (!res.ok) {
    throw new ApiError(
      (typeof body === 'object' && body && 'error' in body && typeof (body as any).error === 'string')
        ? (body as any).error
        : `HTTP ${res.status}`,
      res.status,
      body,
    )
  }
  return body as T
}

/* --------------------------- Typed endpoints -------------------------- */

export type Appointment = {
  id: string
  patientId: string
  patientName?: string
  patientPhone?: string
  doctorId: string | null
  date: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  reason: string | null
  createdAt: string
}

export type Patient = {
  id: string
  name: string
  phone: string
  email: string | null
  dateOfBirth: string | null
  createdAt: string
}

export type Conversation = {
  id: string
  patientId?: string
  patientName?: string
  phone: string
  lastMessage?: string
  lastMessageAt?: string
  unreadCount?: number
}

export type Message = {
  id: string
  conversationId: string
  direction: 'inbound' | 'outbound'
  body: string
  createdAt: string
  status?: string
}

export type SearchResults = {
  results: {
    patients: Array<{ type: 'patient'; id: string; title: string; subtitle: string; url: string }>
    appointments: Array<{ type: 'appointment'; id: string; title: string; subtitle: string; url: string }>
  }
}

export const api = {
  // Reports / KPIs (reuses the dashboard reports endpoint with default current-month range)
  getReportsSummary: () =>
    request<{
      period: { from: string; to: string; days: number }
      appointments: { total: number; completed: number; cancelled: number; noShow: number; completionRate: number }
      patients: { new: number }
      revenue: { total: number; net: number; payments: number; avgPerDay: number }
    }>('/dashboard/reports'),

  // Appointments — same endpoint the web dashboard uses
  getAppointments: (date?: string) =>
    request<Appointment[] | { data: Appointment[] }>(
      `/dashboard/appointments${date ? `?date=${date}` : ''}`,
    ),

  // Patients
  getPatients: (search?: string) =>
    request<{ data: Patient[]; meta?: unknown } | Patient[]>(
      `/dashboard/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    ),
  getPatient: (id: string) => request<Patient>(`/dashboard/patients/${id}`),

  // Conversations
  getConversations: () =>
    request<{ data: Conversation[] } | Conversation[]>(`/dashboard/conversations`),
  getMessages: (conversationId: string) =>
    request<{ data: Message[] } | Message[]>(`/dashboard/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, body: string) =>
    request<Message>(`/dashboard/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  // Global search (already exists at /api/dashboard/search)
  search: (q: string) => request<SearchResults>(`/dashboard/search?q=${encodeURIComponent(q)}`),

  // Push token registration
  registerPushToken: (expoPushToken: string, platform: 'ios' | 'android') =>
    request<{ ok: true }>(`/dashboard/me/push-token`, {
      method: 'POST',
      body: JSON.stringify({ expoPushToken, platform }),
    }),
}

export function unwrap<T>(maybe: T[] | { data?: T[] } | undefined | null): T[] {
  if (!maybe) return []
  if (Array.isArray(maybe)) return maybe
  return Array.isArray(maybe.data) ? maybe.data : []
}
