-- 0059_dashboard_perf_indexes.sql
--
-- Indexes that accelerate the dashboard hot queries. P2-11 of the
-- 2026-05-12 audit. All CREATE INDEX IF NOT EXISTS so the migration is
-- idempotent and safe to re-run after the partial set that existed
-- pre-2026-05-12.
--
-- Naming convention matches the rest of the schema: `idx_<table>_<columns>`.

-- Patients — list/sort by recency per tenant
CREATE INDEX IF NOT EXISTS idx_patients_tenant_created
  ON patients (tenant_id, created_at DESC);

-- Patient payments — filtered by status + time-window in revenue queries
CREATE INDEX IF NOT EXISTS idx_patient_payments_tenant_status_created
  ON patient_payments (tenant_id, status, created_at DESC);

-- Notifications — bell unread count + recent list (descending)
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_read_created
  ON notifications (tenant_id, read, created_at DESC);

-- Conversations — last_message_at DESC is the inbox order
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_last_msg
  ON conversations (tenant_id, last_message_at DESC NULLS LAST)
  WHERE status = 'open';

-- Documents — by tenant + type for "pending assignment" filters
CREATE INDEX IF NOT EXISTS idx_documents_tenant_status_created
  ON documents (tenant_id, status, created_at DESC);

-- Ad leads — kanban + filtered status views
CREATE INDEX IF NOT EXISTS idx_ad_leads_tenant_status_created
  ON ad_leads (tenant_id, status, created_at DESC);

-- Audit logs — when surfaced in the admin/audit panel
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_action_created
  ON audit_logs (tenant_id, action, created_at DESC);

-- Clinical records — patient-timeline view
CREATE INDEX IF NOT EXISTS idx_clinical_records_tenant_patient_created
  ON clinical_records (tenant_id, patient_id, created_at DESC);

-- Appointments — multi-column for revenue + status reports
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status_date
  ON appointments (tenant_id, status, date);

-- Patient communications — patient timeline
CREATE INDEX IF NOT EXISTS idx_patient_comms_patient_occurred
  ON patient_communications (patient_id, occurred_at DESC);
