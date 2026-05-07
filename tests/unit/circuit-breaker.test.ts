/**
 * Tests against the REAL circuit breaker exported by `@quote-engine/ai`.
 * This is the same module the WhatsApp worker imports — if these tests
 * pass, the worker's resilience layer behaves as the design says.
 *
 * Threshold and reset windows live as constants inside fallback.ts; we
 * read them through behavior, not by re-importing the constants.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isCircuitOpen,
  recordFailure,
  recordSuccess,
  getCircuitStatus,
} from '@quote-engine/ai/fallback'

const FAILURE_THRESHOLD = 3 // mirror of CIRCUIT_THRESHOLD inside fallback.ts
const RESET_MS = 60_000 // mirror of CIRCUIT_RESET_MS

function reset() {
  // The circuit module has no public reset — we reset by recording successes
  // until the breaker is closed and counters are zeroed.
  for (let i = 0; i < FAILURE_THRESHOLD + 5; i++) recordSuccess()
}

describe('CircuitBreaker', () => {
  beforeEach(() => reset())
  afterEach(() => reset())

  it('starts closed', () => {
    expect(isCircuitOpen()).toBe(false)
  })

  it('stays closed after fewer failures than the threshold', () => {
    for (let i = 0; i < FAILURE_THRESHOLD - 1; i++) recordFailure()
    expect(isCircuitOpen()).toBe(false)
  })

  it('opens at exactly THRESHOLD consecutive failures', () => {
    for (let i = 0; i < FAILURE_THRESHOLD; i++) recordFailure()
    expect(isCircuitOpen()).toBe(true)
  })

  it('a single success resets the failure counter', () => {
    for (let i = 0; i < FAILURE_THRESHOLD - 1; i++) recordFailure()
    recordSuccess()
    // Now we should need a fresh THRESHOLD failures to open
    for (let i = 0; i < FAILURE_THRESHOLD - 1; i++) recordFailure()
    expect(isCircuitOpen()).toBe(false)
    recordFailure()
    expect(isCircuitOpen()).toBe(true)
  })

  it('after reset window, breaker enters half-open and lets ONE test through', () => {
    vi.useFakeTimers()
    try {
      const start = new Date('2026-05-07T10:00:00Z')
      vi.setSystemTime(start)
      for (let i = 0; i < FAILURE_THRESHOLD; i++) recordFailure()
      expect(isCircuitOpen()).toBe(true)

      // Travel past the reset window
      vi.setSystemTime(new Date(start.getTime() + RESET_MS + 1_000))

      // First isCircuitOpen call after reset window should return false
      // (half-open: one trial allowed)
      expect(isCircuitOpen()).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('getCircuitStatus reports a sane shape', () => {
    const s = getCircuitStatus()
    expect(s).toHaveProperty('open')
    expect(s).toHaveProperty('consecutiveFailures')
    expect(typeof s.open).toBe('boolean')
    expect(typeof s.consecutiveFailures).toBe('number')
  })
})
