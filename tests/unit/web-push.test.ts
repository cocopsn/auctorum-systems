/**
 * Tests against the Web Push transport. We don't try to actually send a
 * push (that requires a real subscription endpoint owned by a browser);
 * we test the configuration gating and the result shape contract.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  isWebPushConfigured,
  sendWebPush,
  sendWebPushBatch,
} from '@quote-engine/notifications/web-push'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  // Reset every test to a known-bad state
  delete process.env.VAPID_PUBLIC_KEY
  delete process.env.VAPID_PRIVATE_KEY
  delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  delete process.env.VAPID_SUBJECT
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('isWebPushConfigured', () => {
  it('returns false without VAPID env vars', () => {
    expect(isWebPushConfigured()).toBe(false)
  })
})

describe('sendWebPush', () => {
  it('returns ok=false with reason when VAPID is unset', async () => {
    const result = await sendWebPush(
      {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        p256dh: 'p256dh-test',
        authKey: 'auth-test',
      },
      { title: 'test', body: 'test' },
    )
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/vapid/i)
    expect(result.endpoint).toBe('https://fcm.googleapis.com/fcm/send/test')
  })
})

describe('sendWebPushBatch', () => {
  it('returns 0 sent when VAPID is unset', async () => {
    const result = await sendWebPushBatch(
      [
        { endpoint: 'https://fcm.googleapis.com/fcm/send/a', p256dh: 'a', authKey: 'a' },
        { endpoint: 'https://fcm.googleapis.com/fcm/send/b', p256dh: 'b', authKey: 'b' },
      ],
      { title: 'x', body: 'y' },
    )
    expect(result.sent).toBe(0)
    expect(result.failed).toBe(2)
    expect(result.expired).toEqual([])
    expect(result.results).toHaveLength(2)
  })

  it('handles empty subscription list', async () => {
    const result = await sendWebPushBatch([], { title: 'x', body: 'y' })
    expect(result.sent).toBe(0)
    expect(result.failed).toBe(0)
    expect(result.results).toHaveLength(0)
  })
})
