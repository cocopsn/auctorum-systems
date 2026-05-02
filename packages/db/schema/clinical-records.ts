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
  // ─── NOM-004-SSA3-2012 compliance ───
  // Once a record is locked it cannot be edited or deleted (§4.4).
  isLocked: boolean("is_locked").notNull().default(false),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockedBy: uuid("locked_by"),
  // Snapshot of the doctor at lock time — survives doctor profile changes.
  doctorId: uuid("doctor_id"),
  doctorCedula: varchar("doctor_cedula", { length: 20 }),
  doctorName: varchar("doctor_name", { length: 255 }),
  // Structured clinical fields (NOM-004 mandates diagnosis, plan, prognosis,
  // and vital signs at every consultation).
  vitalSigns: jsonb("vital_signs").default({}),
  diagnosisIcd10: varchar("diagnosis_icd10", { length: 10 }),
  diagnosisText: text("diagnosis_text"),
  treatmentPlan: text("treatment_plan"),
  prognosis: text("prognosis"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastSavedAt: timestamp("last_saved_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  patientIdx: index("idx_clinical_records_patient").on(t.patientId),
  tenantIdx: index("idx_clinical_records_tenant").on(t.tenantId),
  lockedIdx: index("idx_clinical_records_locked").on(t.tenantId, t.isLocked),
}))

export type ClinicalRecord = typeof clinicalRecords.$inferSelect
export type NewClinicalRecord = typeof clinicalRecords.$inferInsert
