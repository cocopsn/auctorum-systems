/**
 * Tests for the bot identity prelude + out-of-hours fallback.
 *
 * Pre-2026-05-12 the dashboard /settings/bot page persisted bot_name,
 * tone, bot_personality and out_of_hours_message but the worker never
 * read any of them — write-only fields. This test pins the post-fix
 * behavior so a future refactor can't silently drop the prelude again.
 */
import { describe, it, expect } from 'vitest'
import {
  buildTenantSystemPrompt,
  getOutOfHoursMessage,
} from '../../packages/ai/prompts'
import type { Tenant } from '@quote-engine/db'

function mockTenant(overrides: Partial<Record<string, unknown>> = {}): Tenant {
  return {
    id: 't-1',
    slug: 'dra-test',
    name: 'Dra. Test',
    tenantType: 'medical',
    config: {
      bot_config: {},
      ...overrides,
    },
    isActive: true,
    plan: 'auctorum',
  } as unknown as Tenant
}

describe('bot identity prelude', () => {
  it('omits the prelude entirely when bot_config has no identity fields', () => {
    const tenant = mockTenant({ bot_config: {} })
    const prompt = buildTenantSystemPrompt({ tenant })
    expect(prompt).not.toMatch(/Te presentas como/)
    expect(prompt).not.toMatch(/Tu tono/)
  })

  it('includes bot_name when set', () => {
    const tenant = mockTenant({
      bot_config: { bot_name: 'Ana' },
    })
    const prompt = buildTenantSystemPrompt({ tenant })
    expect(prompt).toMatch(/Te presentas como "Ana"/)
  })

  it('maps known tone codes to natural-language sentences', () => {
    const amigable = buildTenantSystemPrompt({
      tenant: mockTenant({ bot_config: { tone: 'amigable' } }),
    })
    expect(amigable).toMatch(/amigable y cercano/)

    const formal = buildTenantSystemPrompt({
      tenant: mockTenant({ bot_config: { tone: 'formal' } }),
    })
    expect(formal).toMatch(/formal y respetuoso/)
  })

  it('passes unknown tone codes through verbatim', () => {
    const prompt = buildTenantSystemPrompt({
      tenant: mockTenant({ bot_config: { tone: 'sarcastico' } }),
    })
    expect(prompt).toMatch(/Tu tono de comunicación es "sarcastico"/)
  })

  it('includes free-form bot_personality verbatim', () => {
    const personality =
      'Soy amante de los perros y siempre saludo con un emoji 🐶.'
    const prompt = buildTenantSystemPrompt({
      tenant: mockTenant({ bot_config: { bot_personality: personality } }),
    })
    expect(prompt).toContain(personality)
  })

  it('composes identity + custom instructions when both are set', () => {
    const prompt = buildTenantSystemPrompt({
      tenant: mockTenant({
        bot_config: { bot_name: 'Ana', tone: 'profesional' },
      }),
      customInstructions: 'No menciones precios sin consultar el catálogo.',
    })
    expect(prompt).toMatch(/Te presentas como "Ana"/)
    expect(prompt).toMatch(/profesional y directo/)
    expect(prompt).toMatch(/No menciones precios sin consultar/)
  })

  it('trims whitespace-only fields', () => {
    const prompt = buildTenantSystemPrompt({
      tenant: mockTenant({
        bot_config: { bot_name: '   ', tone: '\t\n', bot_personality: '' },
      }),
    })
    expect(prompt).not.toMatch(/Te presentas como/)
    expect(prompt).not.toMatch(/Tu tono/)
  })
})

describe('getOutOfHoursMessage()', () => {
  it('returns null when not set', () => {
    expect(getOutOfHoursMessage(mockTenant({ bot_config: {} }))).toBe(null)
  })

  it('returns null for whitespace-only strings', () => {
    expect(
      getOutOfHoursMessage(
        mockTenant({ bot_config: { out_of_hours_message: '   \n' } }),
      ),
    ).toBe(null)
  })

  it('returns the trimmed message when set', () => {
    expect(
      getOutOfHoursMessage(
        mockTenant({
          bot_config: {
            out_of_hours_message: '  Estamos fuera de horario. Te contactamos mañana.  ',
          },
        }),
      ),
    ).toBe('Estamos fuera de horario. Te contactamos mañana.')
  })
})
