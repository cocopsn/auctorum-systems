import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { patients } from "./patients"
import { appointments } from "./appointments"

export const clinicalRecords = pgTable("clinical_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  authorId: uuid("author_id"),
  title: varchar("title", { length: 255 }).notNull().default("Sin título"),
  recordType: varchar("record_type", { length: 32 }).notNull().default("general"),
  content: jsonb("content").notNull().default({}),
  soapSubjective: text("soap_subjective"),
  soapObjective: text("soap_objective"),
  soapAssessment: text("soap_assessment"),
  soapPlan: text("soap_plan"),
  isPinned: boolean("is_pinned").notNull().default(false),
  isDraft: boolean("is_draft").notNull().default(false),
  isTemplate: boolean("is_template").notNull().default(false),
  aiGenerated: boolean("ai_generated").default(false),
  aiTranscript: text("ai_transcript"),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastSavedAt: timestamp("last_saved_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  patientIdx: index("idx_clinical_records_patient").on(t.patientId),
  tenantIdx: index("idx_clinical_records_tenant").on(t.tenantId),
}))

export type ClinicalRecord = typeof clinicalRecords.$inferSelect
export type NewClinicalRecord = typeof clinicalRecords.$inferInsert
