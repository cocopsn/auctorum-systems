import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { appointments } from './appointments'
import { patients } from './patients'

/**
 * Leads capturados de campañas de ads (Facebook/Instagram Lead Ads, Google
 * Ads Lead Extensions, formularios de la página, captura manual desde el
 * dashboard).
 *
 * Pipeline:  new → contacted → responded → appointed → converted
 *                                                  \→ lost
 *
 * El worker de WhatsApp / el endpoint de webhook auto-disparan
 * `autoContactLead()` cuando entra un lead nuevo con teléfono — la
 * velocidad de respuesta es lo que mueve la conversión.
 */
export const LEAD_SOURCES = ['facebook', 'instagram', 'google', 'manual', 'website'] as const
export const LEAD_STATUSES = [
  'new',
  'contacted',
  'responded',
  'appointed',
  'converted',
  'lost',
] as const

export type LeadSource = (typeof LEAD_SOURCES)[number]
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const adLeads = pgTable(
  'ad_leads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    source: varchar('source', { length: 20 }).notNull(),
    campaignName: varchar('campaign_name', { length: 255 }),
    adName: varchar('ad_name', { length: 255 }),
    formId: varchar('form_id', { length: 100 }),

    name: varchar('name', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),
    message: text('message'),

    status: varchar('status', { length: 20 }).notNull().default('new'),

    whatsappSent: boolean('whatsapp_sent').default(false),
    whatsappSentAt: timestamp('whatsapp_sent_at', { withTimezone: true }),

    appointmentId: uuid('appointment_id').references(() => appointments.id, {
      onDelete: 'set null',
    }),
    patientId: uuid('patient_id').references(() => patients.id, { onDelete: 'set null' }),

    rawData: jsonb('raw_data').default({}),
    utmSource: varchar('utm_source', { length: 100 }),
    utmMedium: varchar('utm_medium', { length: 100 }),
    utmCampaign: varchar('utm_campaign', { length: 100 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    tenantStatusIdx: index('idx_leads_tenant_status').on(t.tenantId, t.status),
    phoneIdx: index('idx_leads_phone').on(t.phone),
    tenantSourceIdx: index('idx_leads_tenant_source').on(t.tenantId, t.source),
    tenantCreatedIdx: index('idx_leads_tenant_created').on(t.tenantId, t.createdAt),
  }),
)

export type AdLead = typeof adLeads.$inferSelect
export type NewAdLead = typeof adLeads.$inferInsert
