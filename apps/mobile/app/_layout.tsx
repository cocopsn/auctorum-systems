import { useEffect } from 'react'
import { Stack, router, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AuthContext, useAuthState } from '@/lib/auth'
import { configureNotificationsHandler } from '@/lib/notifications'

configureNotificationsHandler()

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

export default function RootLayout() {
  const auth = useAuthState()
  const segments = useSegments()

  // Redirect rules: if no user, force /(auth)/login; if user, lift them out of /(auth)
  useEffect(() => {
    if (auth.loading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!auth.user && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (auth.user && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [auth.loading, auth.user, segments])

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthContext.Provider value={auth}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="patient/[id]"
              options={{ headerShown: true, title: 'Paciente', presentation: 'card' }}
            />
            <Stack.Screen
              name="conversation/[id]"
              options={{ headerShown: true, title: 'Conversación', presentation: 'card' }}
            />
            <Stack.Screen
              name="settings"
              options={{ headerShown: true, title: 'Ajustes', presentation: 'modal' }}
            />
          </Stack>
        </AuthContext.Provider>
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}
