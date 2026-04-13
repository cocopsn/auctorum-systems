import { pgTable, uuid, varchar, text, boolean, jsonb, integer, timestamp } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"

export const portalPages = pgTable("portal_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 100 }).default("home"),
  title: varchar("title", { length: 255 }).notNull(),
  isHomepage: boolean("is_homepage").default(false),
  sections: jsonb("sections").notNull().default([]),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: text("seo_description"),
  published: boolean("published").default(true),
  sortOrder: integer("sort_order").default(0),
  portalConfig: jsonb("portal_config").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

export type PortalPage = typeof portalPages.$inferSelect
export type NewPortalPage = typeof portalPages.$inferInsert

export interface PortalSection {
  id: string
  type: "hero" | "about" | "services" | "gallery" | "testimonials" | "team" | "faq" | "contact" | "cta" | "custom"
  visible: boolean
  order: number
  data: Record<string, any>
}

export interface PortalConfig {
  businessName?: string
  logoUrl?: string
  colors?: { primary: string; secondary: string; accent: string }
  font?: string
  contact?: { phone: string; email: string; address: string; hours: string }
  social?: { facebook?: string; instagram?: string; tiktok?: string; website?: string }
  seo?: { title: string; description: string; keywords: string }
  published?: boolean
}
