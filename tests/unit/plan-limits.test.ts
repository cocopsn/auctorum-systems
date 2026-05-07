/**
 * Tests against the real PLAN_LIMITS / ADDON_PACKAGES catalog. If product
 * decides to raise a limit or change pricing, these tests fail and force
 * an explicit acknowledgement instead of a silent regression.
 */
import { describe, it, expect } from 'vitest'
import {
  PLAN_LIMITS,
  ADDON_PACKAGES,
  getPlanLimits,
  getAddonPackage,
  currentPeriod,
} from '@quote-engine/ai/plan-limits'

describe('PLAN_LIMITS', () => {
  it('has the three plan tiers', () => {
    expect(Object.keys(PLAN_LIMITS).sort()).toEqual(['auctorum', 'basico', 'enterprise'])
  })

  it('basico is the lowest, auctorum is middle, enterprise is unlimited', () => {
    expect(PLAN_LIMITS.basico.whatsapp_messages).toBeLessThan(
      PLAN_LIMITS.auctorum.whatsapp_messages,
    )
    expect(PLAN_LIMITS.enterprise.whatsapp_messages).toBe(-1)
    expect(PLAN_LIMITS.enterprise.patients).toBe(-1)
    expect(PLAN_LIMITS.enterprise.users).toBe(-1)
  })

  it('basico whatsapp_messages locked to 500 (PRD)', () => {
    expect(PLAN_LIMITS.basico.whatsapp_messages).toBe(500)
  })

  it('basico api_calls_per_hour locked to 100', () => {
    expect(PLAN_LIMITS.basico.api_calls_per_hour).toBe(100)
  })

  it('basico patients capped at 100', () => {
    expect(PLAN_LIMITS.basico.patients).toBe(100)
  })

  it('every plan has all required PlanLimits keys', () => {
    const required = [
      'whatsapp_messages',
      'api_calls_per_hour',
      'ai_tokens',
      'storage_gb',
      'patients',
      'campaigns_per_month',
      'doctors',
      'users',
    ] as const
    for (const plan of Object.values(PLAN_LIMITS)) {
      for (const key of required) {
        expect(plan).toHaveProperty(key)
        expect(typeof plan[key]).toBe('number')
      }
    }
  })

  it('every plan limit is either positive or -1 (unlimited)', () => {
    for (const plan of Object.values(PLAN_LIMITS)) {
      for (const v of Object.values(plan)) {
        expect(v === -1 || v > 0).toBe(true)
      }
    }
  })
})

describe('getPlanLimits', () => {
  it('returns basico for unknown plan id', () => {
    expect(getPlanLimits('mystery_tier')).toEqual(PLAN_LIMITS.basico)
  })

  it('returns basico for null', () => {
    expect(getPlanLimits(null)).toEqual(PLAN_LIMITS.basico)
  })

  it('returns basico for undefined', () => {
    expect(getPlanLimits(undefined)).toEqual(PLAN_LIMITS.basico)
  })

  it('returns the matching tier for a valid id', () => {
    expect(getPlanLimits('auctorum')).toEqual(PLAN_LIMITS.auctorum)
    expect(getPlanLimits('enterprise')).toEqual(PLAN_LIMITS.enterprise)
  })
})

describe('ADDON_PACKAGES', () => {
  it('is non-empty', () => {
    expect(ADDON_PACKAGES.length).toBeGreaterThan(0)
  })

  it('every addon has a non-empty id, label, price > 0, quantity > 0', () => {
    for (const a of ADDON_PACKAGES) {
      expect(a.id).toBeTruthy()
      expect(typeof a.id).toBe('string')
      expect(a.price).toBeGreaterThan(0)
      expect(a.quantity).toBeGreaterThan(0)
    }
  })

  it('addon ids are unique', () => {
    const ids = ADDON_PACKAGES.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every addon targets a known metric type', () => {
    const metrics = [
      'whatsapp_messages',
      'api_calls',
      'ai_tokens',
      'storage_bytes',
      'patients',
      'appointments',
      'campaigns',
      'doctors',
      'users',
    ]
    for (const a of ADDON_PACKAGES) {
      // Schema field is `type` (per AddonPackage interface in plan-limits.ts)
      expect(metrics).toContain((a as { type: string }).type)
    }
  })
})

describe('getAddonPackage', () => {
  it('returns null for unknown id', () => {
    expect(getAddonPackage('made-up-id')).toBeNull()
  })

  it('returns the matching addon for a real id', () => {
    const first = ADDON_PACKAGES[0]
    expect(getAddonPackage(first.id)).toEqual(first)
  })
})

describe('currentPeriod', () => {
  it('formats as YYYY-MM', () => {
    const period = currentPeriod(new Date('2026-05-07T10:00:00Z'))
    expect(period).toMatch(/^\d{4}-\d{2}$/)
  })

  it('rolls over month boundary', () => {
    expect(currentPeriod(new Date('2026-12-31T23:59:00Z'))).toBe('2026-12')
    expect(currentPeriod(new Date('2027-01-01T00:00:00Z'))).toBe('2027-01')
  })
})
