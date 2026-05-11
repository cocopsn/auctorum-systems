// Shared
export {
  tenants,
  type Tenant,
  type NewTenant,
  type TenantConfig,
  type TenantType,
  type PublicSubdomainPrefix,
  type TenantProvisioningStatus,
  DEFAULT_TENANT_CONFIG,
  TENANT_TYPES,
  PUBLIC_SUBDOMAIN_PREFIXES,
  TENANT_PROVISIONING_STATUSES,
} from './tenants';
export { users, type User, type NewUser } from './users';
export {
  userDashboardPreferences,
  type UserDashboardPreference,
  type NewUserDashboardPreference,
} from './user-dashboard-preferences';
export { botInstances, type BotInstance, type NewBotInstance } from './bot-instances';

// Quote Engine (B2B)
export { products, type Product, type NewProduct } from './products';
export { quotes, quoteItems, type Quote, type NewQuote, type QuoteItem, type NewQuoteItem } from './quotes';
export { quoteEvents, type QuoteEvent, type NewQuoteEvent } from './quote-events';
export { clients, type Client, type NewClient } from './clients';

// MedConcierge
export { doctors, type Doctor, type NewDoctor } from './doctors';
export { patients, type Patient, type NewPatient } from './patients';
export { patientFiles, type PatientFile, type NewPatientFile } from './patient-files';
export { appointments, type Appointment, type NewAppointment } from './appointments';
export { schedules, scheduleBlocks, type Schedule, type NewSchedule, type ScheduleBlock } from './schedules';
export { clinicalRecords, type ClinicalRecord, type NewClinicalRecord } from "./clinical-records";
export { informedConsents, type InformedConsent, type NewInformedConsent } from './informed-consents';
export { patientPayments, type PatientPayment, type NewPatientPayment } from './patient-payments';
export { appointmentEvents, type AppointmentEvent } from './appointment-events';
export { intakeForms, intakeResponses, type IntakeField, type IntakeForm, type IntakeResponse } from './intake-forms';
export { aiKnowledgeFiles, aiUsageEvents, type AiKnowledgeFile, type NewAiKnowledgeFile, type AiUsageEvent, type NewAiUsageEvent } from './ai';

// Agente 2 Backend (Checkpoint 2)
export { conversations, type Conversation, type NewConversation } from './conversations';
export { messages, type Message, type NewMessage } from './messages';
export { campaigns, type Campaign, type NewCampaign } from './campaigns';
export { campaignMessages, type CampaignMessage, type NewCampaignMessage } from './campaign-messages';
export { payments, type Payment, type NewPayment } from './payments';
export { invoices, type Invoice, type NewInvoice } from './invoices';
export { followUps, type FollowUp, type NewFollowUp } from './follow-ups';
export { funnelStages, type FunnelStage, type NewFunnelStage } from './funnel-stages';
export { clientFunnel, type ClientFunnel, type NewClientFunnel } from './client-funnel';
export { botFaqs, type BotFaq, type NewBotFaq } from './bot-faqs';
export { onboardingProgress, type OnboardingProgress, type NewOnboardingProgress, type OnboardingSteps } from './onboarding-progress';

// Tier 2
export { budgets, type Budget, type NewBudget } from './budgets';

// Tier 3
export {
  integrations,
  type Integration,
  type NewIntegration,
  type IntegrationConfig,
  type MetaBusinessConfig,
  type GoogleCalendarConfig,
  type MetaAdsConfig,
  type GoogleAdsConfig,
  type InstagramDmConfig,
} from './integrations';
export { subscriptions, type Subscription, type NewSubscription } from './subscriptions';

// Portal
export { portalPages, type PortalPage, type NewPortalPage, type PortalSection, type PortalConfig } from "./portal-pages";

// Notifications
export { notifications, type Notification, type NewNotification } from "./notifications";
export {
  webPushSubscriptions,
  type WebPushSubscription,
  type NewWebPushSubscription,
} from './web-push-subscriptions';
export { knowledgeBase } from './knowledge-base';
export { auditLogs } from './audit-logs';

// Public API
export { apiKeys, type ApiKey, type NewApiKey, type ApiPermission } from './api-keys';

// Resilience / fallbacks
export { pendingCalendarOps, type PendingCalendarOp, type NewPendingCalendarOp } from './pending-calendar-ops';
export { webhookFailures, type WebhookFailure, type NewWebhookFailure } from './webhook-failures';

// Usage tracking + addons
export {
  tenantUsage, type TenantUsage, type NewTenantUsage,
  usageAddons, type UsageAddon, type NewUsageAddon,
} from './tenant-usage';

// Ads → Leads CRM
export {
  adLeads,
  LEAD_SOURCES,
  LEAD_STATUSES,
  type AdLead,
  type NewAdLead,
  type LeadSource,
  type LeadStatus,
} from './ad-leads';

// Documents (lab results, radiology, prescriptions, referrals, etc.)
export {
  documents,
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  type Document,
  type NewDocument,
  type DocumentType,
  type DocumentStatus,
} from './documents';

// Per-patient communication ledger (timeline of emails / WA / calls / notes)
export {
  patientCommunications,
  COMM_TYPES,
  type PatientCommunication,
  type NewPatientCommunication,
  type CommType,
} from './patient-communications';

// Data deletion requests — Meta Data Deletion Callback + LFPDPPP ARCO.
export {
  dataDeletionRequests,
  type DataDeletionRequest,
  type NewDataDeletionRequest,
} from './data-deletion-requests';
