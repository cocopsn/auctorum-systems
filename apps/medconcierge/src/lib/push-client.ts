/**
 * Browser-side Web Push subscription helper.
 *
 * Strategy:
 *  - Lazily request Notification permission ONLY after a user gesture (the
 *    `<PushBootstrap>` component triggers this on first dashboard load if
 *    permission is in the `default` state and the user hasn't dismissed)
 *  - Subscribe with the VAPID public key exposed via NEXT_PUBLIC_VAPID_PUBLIC_KEY
 *  - POST the subscription JSON to /api/dashboard/push/subscribe so the
 *    server can fan out push messages later
 *  - All operations are best-effort: any failure is swallowed so a missing
 *    key or denied permission never blocks the dashboard from rendering
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = typeof atob === 'function' ? atob(base64) : ''
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i)
  return out
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function ensurePushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  if (!VAPID_PUBLIC_KEY) return null

  try {
    const reg = await navigator.serviceWorker.ready
    let subscription = await reg.pushManager.getSubscription()
    if (!subscription) {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return null
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    // Persist (server is idempotent on the endpoint URL)
    await fetch('/api/dashboard/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(subscription.toJSON()),
    }).catch(() => {})

    return subscription
  } catch (_e) {
    return null
  }
}
