import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import { createContext, useContext, useEffect, useState } from 'react'
import { router } from 'expo-router'

const ACCESS_KEY  = 'auctorum_access_token'
const REFRESH_KEY = 'auctorum_refresh_token'
const USER_KEY    = 'auctorum_user'
const TENANT_KEY  = 'auctorum_tenant'

export type AuthUser = {
  id: string
  email: string
  name: string | null
  role: string
}

export type AuthTenant = {
  id: string
  name: string
  slug: string
  plan: string
}

export type LoginResponse = {
  access_token: string
  refresh_token: string
  user: AuthUser
  tenant: AuthTenant | null
}

function apiBaseUrl(): string {
  return (Constants.expoConfig?.extra?.apiBaseUrl as string)
    ?? 'https://portal.auctorum.com.mx'
}

/**
 * Login via the medconcierge mobile-login endpoint. Stores tokens in
 * SecureStore (encrypted on iOS Keychain / Android Keystore).
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${apiBaseUrl()}/api/auth/mobile-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? 'Login failed')
  }
  const data = (await res.json()) as LoginResponse
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY,  data.access_token),
    SecureStore.setItemAsync(REFRESH_KEY, data.refresh_token),
    SecureStore.setItemAsync(USER_KEY,    JSON.stringify(data.user)),
    data.tenant
      ? SecureStore.setItemAsync(TENANT_KEY, JSON.stringify(data.tenant))
      : SecureStore.deleteItemAsync(TENANT_KEY),
  ])
  return data
}

export async function getStoredAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_KEY)
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY)
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY)
  return raw ? (JSON.parse(raw) as AuthUser) : null
}

export async function getStoredTenant(): Promise<AuthTenant | null> {
  const raw = await SecureStore.getItemAsync(TENANT_KEY)
  return raw ? (JSON.parse(raw) as AuthTenant) : null
}

export async function logout(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
    SecureStore.deleteItemAsync(TENANT_KEY),
  ])
  router.replace('/(auth)/login')
}

/* ------------------- React context for app-wide state ------------------ */

type AuthContextValue = {
  user: AuthUser | null
  tenant: AuthTenant | null
  loading: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  tenant: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
})

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

export function useAuthState(): AuthContextValue {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [tenant, setTenant] = useState<AuthTenant | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    const [u, t] = await Promise.all([getStoredUser(), getStoredTenant()])
    setUser(u)
    setTenant(t)
    setLoading(false)
  }

  const signOut = async () => {
    await logout()
    setUser(null)
    setTenant(null)
  }

  useEffect(() => { void refresh() }, [])

  return { user, tenant, loading, refresh, signOut }
}
