import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 63 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  logoUrl: text('logo_url'),
  config: jsonb('config').notNull().default({}),
  isActive: boolean('is_active').default(true),
  plan: varchar('plan', { length: 20 }).default('basico'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// TypeScript types derived from schema
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

// Config shape for type safety
export interface TenantConfig {
  colors: {
    primary: string;
    secondary: string;
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
  quote_settings: {
    currency: string;
    tax_rate: number;
    validity_days: number;
    payment_terms: string;
    delivery_terms: string;
    custom_footer: string;
  };
}

// Default config for new tenants
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
  quote_settings: {
    currency: 'MXN',
    tax_rate: 0.16,
    validity_days: 15,
    payment_terms: '50% anticipo, 50% contra entrega',
    delivery_terms: '3-5 días hábiles',
    custom_footer: 'Precios sujetos a cambio sin previo aviso.',
  },
};
