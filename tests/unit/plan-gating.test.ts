/**
 * Tests for the new plan-tier feature gating module (apps/medconcierge/src/lib/plan-gating.ts).
 *
 * Pre-2026-05-11 medconcierge had zero plan gating — `grep "tenant.plan ==="` returned 0 hits.
 * Basico tenants had identical functionality to Auctorum. This module is the
 * single source of truth that paid-feature endpoints consult.
 */
import { describe, it, expect } from 'vitest'
import {
  PLAN_FEATURES,
  PLAN_TIER_ORDER,
  FEATURE_NAMES,
  planFeatures,
  hasFeature,
  requireFeature,
  PlanLimitError,
  minPlanFor,
} from '../../apps/medconcierge/src/lib/plan-gating'

describe('PLAN_FEATURES catalog', () => {
  it('has the three plan tiers', () => {
    expect(Object.keys(PLAN_FEATURES).sort()).toEqual(['auctorum', 'basico', 'enterprise'])
  })

  it('basico has NO paid features enabled', () => {
    const b = PLAN_FEATURES.basico
    expect(b.campaigns).toBe(false)
    expect(b.api_access).toBe(false)
    expect(b.reports_export).toBe(false)
    expect(b.smart_documents).toBe(false)
    expect(b.instagram_dm).toBe(false)
    expect(b.stripe_connect).toBe(false)
    expect(b.cfdi_invoicing).toBe(false)
  })

  it('auctorum unlocks every gated feature', () => {
    const a = PLAN_FEATURES.auctorum
    expect(a.campaigns).toBe(true)
    expect(a.api_access).toBe(true)
    expect(a.reports_export).toBe(true)
    expect(a.smart_documents).toBe(true)
    expect(a.instagram_dm).toBe(true)
    expect(a.stripe_connect).toBe(true)
    expect(a.cfdi_invoicing).toBe(true)
  })

  it('enterprise has higher caps than auctorum', () => {
    expect(PLAN_FEATURES.enterprise.max_users).toBeGreaterThan(
      PLAN_FEATURES.auctorum.max_users,
    )
    expect(PLAN_FEATURES.enterprise.max_doctors).toBeGreaterThan(
      PLAN_FEATURES.auctorum.max_doctors,
    )
  })

  it('FEATURE_NAMES has Spanish copy for every flag', () => {
    const featureKeys = Object.keys(PLAN_FEATURES.basico)
    for (const key of featureKeys) {
      expect(FEATURE_NAMES[key as keyof typeof FEATURE_NAMES]).toBeTruthy()
    }
  })
})

describe('planFeatures()', () => {
  it('defaults to basico for unknown / null / undefined plans', () => {
    expect(planFeatures(null).campaigns).toBe(false)
    expect(planFeatures(undefined).campaigns).toBe(false)
    expect(planFeatures('not-a-plan').campaigns).toBe(false)
    expect(planFeatures('').campaigns).toBe(false)
  })

  it('case-insensitive on plan code', () => {
    expect(planFeatures('AUCTORUM').campaigns).toBe(true)
    expect(planFeatures('Auctorum').campaigns).toBe(true)
  })
})

describe('hasFeature()', () => {
  it('returns false for unknown plan', () => {
    expect(hasFeature(null, 'campaigns')).toBe(false)
    expect(hasFeature('basico', 'campaigns')).toBe(false)
  })

  it('returns true when plan includes feature', () => {
    expect(hasFeature('auctorum', 'campaigns')).toBe(true)
    expect(hasFeature('enterprise', 'api_access')).toBe(true)
  })

  it('returns false for numeric features (caller should use planFeatures)', () => {
    // max_users is a number, not a boolean — hasFeature should never
    // return true for it. Callers that want the count use planFeatures().
    expect(hasFeature('auctorum', 'max_users' as never)).toBe(false)
  })
})

describe('requireFeature()', () => {
  it('throws PlanLimitError for basico on a paid feature', () => {
    expect(() => requireFeature('basico', 'campaigns')).toThrow(PlanLimitError)
  })

  it('does not throw for auctorum on a paid feature', () => {
    expect(() => requireFeature('auctorum', 'campaigns')).not.toThrow()
  })

  it('PlanLimitError carries the feature + plan + machine-readable code', () => {
    try {
      requireFeature('basico', 'instagram_dm')
      throw new Error('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(PlanLimitError)
      const e = err as PlanLimitError
      expect(e.feature).toBe('instagram_dm')
      expect(e.plan).toBe('basico')
      expect(e.code).toBe('PLAN_LIMIT')
    }
  })
})

describe('minPlanFor()', () => {
  it('returns auctorum as the cheapest plan for paid features', () => {
    expect(minPlanFor('campaigns')).toBe('auctorum')
    expect(minPlanFor('api_access')).toBe('auctorum')
    expect(minPlanFor('stripe_connect')).toBe('auctorum')
  })

  it('returns null for numeric feature keys', () => {
    expect(minPlanFor('max_users' as never)).toBe(null)
  })
})

describe('PLAN_TIER_ORDER invariants', () => {
  it('lists tiers cheapest → most expensive', () => {
    expect(PLAN_TIER_ORDER).toEqual(['basico', 'auctorum', 'enterprise'])
  })

  it('each tier in order is >= previous tier for every boolean feature', () => {
    const booleanFeatures = Object.entries(PLAN_FEATURES.basico)
      .filter(([, v]) => typeof v === 'boolean')
      .map(([k]) => k as keyof typeof PLAN_FEATURES.basico)
    for (const feature of booleanFeatures) {
      const basicoValue = PLAN_FEATURES.basico[feature] as boolean
      const auctorumValue = PLAN_FEATURES.auctorum[feature] as boolean
      const enterpriseValue = PLAN_FEATURES.enterprise[feature] as boolean
      // basico ≤ auctorum ≤ enterprise (no regressive features).
      expect(Number(auctorumValue)).toBeGreaterThanOrEqual(Number(basicoValue))
      expect(Number(enterpriseValue)).toBeGreaterThanOrEqual(Number(auctorumValue))
    }
  })
})
