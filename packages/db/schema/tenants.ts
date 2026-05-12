import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';

export const TENANT_TYPES = ['medical', 'industrial'] as const;
export const PUBLIC_SUBDOMAIN_PREFIXES = ['dr', 'dra', 'doc'] as const;
// 'unverified' (post-2026-05-11) = signup happened, email confirmation
// pending. Auth callback promotes to 'pending_plan' on first verified
// login. Stripe / MercadoPago webhook promotes to 'active' on
// successful payment. 'suspended' = past_due > N attempts.
export const TENANT_PROVISIONING_STATUSES = [
  'draft',
  'unverified',
  'pending_plan',
  'active',
  'suspended',
  'cancelled',
] as const;

export type TenantType = (typeof TENANT_TYPES)[number];
export type PublicSubdomainPrefix = (typeof PUBLIC_SUBDOMAIN_PREFIXES)[number];
export type TenantProvisioningStatus = (typeof TENANT_PROVISIONING_STATUSES)[number];

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 63 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  tenantType: varchar('tenant_type', { length: 20 }).notNull().default('industrial'),
  publicSubdomain: varchar('public_subdomain', { length: 120 }),
  publicSubdomainPrefix: varchar('public_subdomain_prefix', { length: 20 }),
  provisioningStatus: varchar('provisioning_status', { length: 20 }).notNull().default('draft'),
  provisionedAt: timestamp('provisioned_at', { withTimezone: true }),
  logoUrl: text('logo_url'),
  config: jsonb('config').notNull().default({}),
  isActive: boolean('is_active').default(true),
  plan: varchar('plan', { length: 20 }).default('basico'),
  quoteSequence: integer('quote_sequence').notNull().default(0),
  // ─── Stripe Connect (patient → doctor payments) ───
  // Stripe Express account id for this tenant. Patients pay through
  // Auctorum's platform; the destination of the transfer is this account.
  stripeConnectAccountId: varchar('stripe_connect_account_id', { length: 50 }),
  stripeConnectStatus: varchar('stripe_connect_status', { length: 20 }).default('none'),
  stripeConnectOnboardedAt: timestamp('stripe_connect_onboarded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  // Tier 2 columns
  botMessages: jsonb('bot_messages').default({}),
  botConfig: jsonb('bot_config').default({}),
  budgetSequence: integer('budget_sequence').default(0),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  // Tier 3 columns
  paymentConfig: jsonb('payment_config').default({}),
  invoiceConfig: jsonb('invoice_config').default({}),
  invoiceSequence: integer('invoice_sequence').default(0),
  channelsConfig: jsonb('channels_config').default({}),
});

// TypeScript types derived from schema
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

// Unified TenantConfig — quote-engine + medconcierge sections
export interface TenantConfig {
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
    background: string;
  };
  contact: {
    phone: string;
    email: string;
    whatsapp: string;
    address: string;
  };
  business: {
    razon_social: string;
    rfc: string;
    giro: string;
  };
  account?: {
    type?: TenantType;
    plan?: string;
    portalHost?: string;
    publicHost?: string;
  };
  // Quote Engine (B2B)
  quote_settings?: {
    currency: string;
    tax_rate: number;
    validity_days: number;
    payment_terms: string;
    delivery_terms: string;
    custom_footer: string;
    auto_number_prefix?: string;
    show_sku?: boolean;
    show_images_in_pdf?: boolean;
  };
  // MedConcierge
  medical?: {
    specialty: string;
    sub_specialty: string;
    cedula_profesional: string;
    cedula_especialidad: string;
    consultation_fee: number;
    consultation_duration_min: number;
    accepts_insurance: boolean;
    insurance_providers: string[];
  };
  schedule_settings?: {
    timezone: string;
    advance_booking_days: number;
    min_booking_hours_ahead: number;
    cancellation_hours: number;
    auto_confirm: boolean;
    allow_online_payment: boolean;
    show_fee_on_portal: boolean;
  };
  // Notifications — all fields optional, each app uses its own subset
  notifications?: {
    // Quote Engine
    whatsapp_on_new_quote?: boolean;
    email_on_new_quote?: boolean;
    notify_on_quote_viewed?: boolean;
    auto_reminder_hours?: number;
    // MedConcierge
    whatsapp_on_new_appointment?: boolean;
    whatsapp_reminder_24h?: boolean;
    whatsapp_reminder_2h?: boolean;
    whatsapp_post_consultation?: boolean;
    email_on_new_appointment?: boolean;
    notify_on_cancellation?: boolean;
    daily_agenda_email?: boolean;
  };
  // Features — all fields optional, each app uses its own subset
  features?: {
    // Quote Engine
    quote_tracking?: boolean;
    quote_expiration_alerts?: boolean;
    client_directory?: boolean;
    // MedConcierge
    intake_forms?: boolean;
    clinical_records?: boolean;
    ai_scribe?: boolean;
    telehealth?: boolean;
    online_payment?: boolean;
    prescription_pdf?: boolean;
    receipt_pdf?: boolean;
  };
  ai?: {
    enabled: boolean;
    systemPrompt: string;
    autoSchedule: boolean;
    answerFaq: boolean;
    humanHandoff: boolean;
    model: string;
    vectorStoreId?: string | null;
    temperature?: number;
    maxTokens?: number;
  };
}

// Default config for new B2B tenants
export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  colors: {
    primary: '#1B3A5C',
    secondary: '#C0392B',
    background: '#FFFFFF',
  },
  contact: {
    phone: '',
    email: '',
    whatsapp: '',
    address: '',
  },
  business: {
    razon_social: '',
    rfc: '',
    giro: '',
  },
  account: {
    type: 'industrial',
    plan: 'basico',
    portalHost: 'portal.auctorum.com.mx',
  },
  quote_settings: {
    currency: 'MXN',
    tax_rate: 0.16,
    validity_days: 15,
    payment_terms: '50% anticipo, 50% contra entrega',
    delivery_terms: '3-5 dias habiles',
    custom_footer: 'Precios sujetos a cambio sin previo aviso.',
  },
};
