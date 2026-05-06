import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { api } from './api'

/**
 * Configure how notifications behave when the app is in foreground.
 * Call once at app boot.
 */
export function configureNotificationsHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })
}

/**
 * Ask for permission, get the Expo push token, and POST it to the backend.
 * Returns the token on success, or null on permission denied / missing project id.
 */
export async function registerPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push notifications don't work in simulators
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Auctorum Med',
      importance: Notifications.AndroidImportance.MAX,
      lightColor: '#0891B2',
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  const projectId =
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId
    ?? Constants.easConfig?.projectId

  let token: string | null = null
  try {
    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    token = result.data
  } catch (err) {
    console.warn('[notifications] getExpoPushTokenAsync failed', err)
    return null
  }

  if (!token) return null

  // Best-effort: register with backend. Fail silently — the user can still use
  // the app if registration fails.
  try {
    await api.registerPushToken(token, Platform.OS as 'ios' | 'android')
  } catch (err) {
    console.warn('[notifications] backend register failed', err)
  }
  return token
}
