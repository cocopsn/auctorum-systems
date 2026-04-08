// Shared
export { tenants, type Tenant, type NewTenant, type TenantConfig, DEFAULT_TENANT_CONFIG } from './tenants';
export { users, type User, type NewUser } from './users';

// Quote Engine (B2B)
export { products, type Product, type NewProduct } from './products';
export { quotes, quoteItems, type Quote, type NewQuote, type QuoteItem, type NewQuoteItem } from './quotes';
export { quoteEvents, type QuoteEvent, type NewQuoteEvent } from './quote-events';
export { clients, type Client, type NewClient } from './clients';

// MedConcierge
export { doctors, type Doctor, type NewDoctor } from './doctors';
export { patients, type Patient, type NewPatient } from './patients';
export { appointments, type Appointment, type NewAppointment } from './appointments';
export { schedules, scheduleBlocks, type Schedule, type NewSchedule, type ScheduleBlock } from './schedules';
export { clinicalNotes, type ClinicalNote, type NewClinicalNote } from './clinical-notes';
export { appointmentEvents, type AppointmentEvent } from './appointment-events';
export { intakeForms, intakeResponses, type IntakeField, type IntakeForm, type IntakeResponse } from './intake-forms';
export { aiKnowledgeFiles, aiUsageEvents, type AiKnowledgeFile, type NewAiKnowledgeFile, type AiUsageEvent, type NewAiUsageEvent } from './ai';
