// PM2 Ecosystem Config — Auctorum Systems (Quote Engine + MedConcierge)

// ---------- Dynamic env loader (reads .env.local at PM2 start) ----------
const fs = require('fs');
function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const env = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
    return env;
  } catch { return {}; }
}

const webEnv = loadEnvFile('/opt/auctorum-systems/repo/apps/web/.env.local');
const medEnv = loadEnvFile('/opt/auctorum-systems/repo/apps/medconcierge/.env.local');

// Cron scripts need: DATABASE_URL, SUPABASE keys, WhatsApp keys, APP_DOMAIN
const cronEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: webEnv.DATABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_URL: webEnv.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: webEnv.SUPABASE_SERVICE_ROLE_KEY || '',
  NEXT_PUBLIC_APP_DOMAIN: webEnv.NEXT_PUBLIC_APP_DOMAIN || 'auctorum.com.mx',
  WHATSAPP_TOKEN: medEnv.WHATSAPP_TOKEN || webEnv.WHATSAPP_TOKEN || '',
  WHATSAPP_PHONE_NUMBER_ID: medEnv.WHATSAPP_PHONE_NUMBER_ID || webEnv.WHATSAPP_PHONE_NUMBER_ID || '',
  REDIS_URL: medEnv.REDIS_URL || '',
};

module.exports = {
  apps: [
    {
      name: 'auctorum-quote-engine',
      cwd: '/opt/auctorum-systems/repo/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 127.0.0.1 -p 3000',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      node_args: '--max-old-space-size=600',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/auctorum/quote-engine-error.log',
      out_file: '/var/log/auctorum/quote-engine-out.log',
      merge_logs: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      exp_backoff_restart_delay: 200,
      kill_timeout: 5000,
      listen_timeout: 10000
    },
    {
      name: 'auctorum-medconcierge',
      cwd: '/opt/auctorum-systems/repo/apps/medconcierge',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 127.0.0.1 -p 3001',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      node_args: '--max-old-space-size=600',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/auctorum/medconcierge-error.log',
      out_file: '/var/log/auctorum/medconcierge-out.log',
      merge_logs: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      exp_backoff_restart_delay: 200,
      kill_timeout: 5000,
      listen_timeout: 10000
    },
    {
      name: 'cron-reminders',
      cwd: '/opt/auctorum-systems/repo',
      script: 'npx',
      args: 'tsx scripts/cron-reminders.ts',
      cron_restart: '0 */4 * * *',
      autorestart: false,
      watch: false,
      env: { ...cronEnv, TZ: 'America/Monterrey' },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/auctorum/cron-reminders-error.log',
      out_file: '/var/log/auctorum/cron-reminders-out.log',
      merge_logs: true
    },
    {
      name: 'cron-appointment-reminders',
      cwd: '/opt/auctorum-systems/repo',
      script: 'npx',
      args: 'tsx scripts/cron-appointment-reminders.ts',
      cron_restart: '*/15 * * * *',
      autorestart: false,
      watch: false,
      env: { ...cronEnv, TZ: 'America/Monterrey' },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/auctorum/cron-appointment-reminders-error.log',
      out_file: '/var/log/auctorum/cron-appointment-reminders-out.log',
      merge_logs: true
    },
    {
      name: "cron-calendar-sync",
      cwd: "/opt/auctorum-systems/repo",
      script: "npx",
      args: "tsx scripts/cron-calendar-sync.ts",
      cron_restart: "*/5 * * * *",
      autorestart: false,
      watch: false,
      env: { ...cronEnv, TZ: 'America/Monterrey' },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/auctorum/cron-calendar-sync-error.log",
      out_file: "/var/log/auctorum/cron-calendar-sync-out.log",
      merge_logs: true
    },
    {
      // WhatsApp queue worker — 2 PM2 instances × 4 jobs concurrency each
      // = 8 lanes ≈ 120 msg/min ceiling (vs the 30 msg/min single-instance
      // ceiling pre-2026-05-11). BullMQ distributes jobs across both
      // instances via the shared Redis stream so duplicate processing is
      // impossible. ALS scoping (runWithDoctorContext) makes the per-job
      // doctor context isolated across all lanes.
      //
      // exec_mode: 'fork' (NOT cluster) because we want independent BullMQ
      // workers each calling createWorker() with its own connection —
      // cluster mode shares the listening socket but this isn't an HTTP
      // server.
      name: 'auctorum-worker',
      cwd: '/opt/auctorum-systems/repo',
      script: 'npx',
      args: '-y tsx scripts/worker.ts',
      interpreter: 'none',
      instances: 2,
      exec_mode: 'fork',
      max_memory_restart: '450M',
      env: {
        ...medEnv,
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=384',
        WORKER_CONCURRENCY: '4',
        DB_POOL_MAX: '3',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/auctorum/worker-error.log',
      out_file: '/var/log/auctorum/worker-out.log',
      merge_logs: true
    },
    {
      // Campaign worker — processes whatsapp_campaigns BullMQ queue with
      // 45s rate limiting between sends to stay under Meta WABA marketing
      // limits. Concurrency 1 (one campaign at a time across all tenants).
      name: 'auctorum-campaign-worker',
      cwd: '/opt/auctorum-systems/repo',
      script: 'npx',
      args: '-y tsx scripts/campaign-worker.ts',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '256M',
      env: {
        ...medEnv,
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=256'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/auctorum/campaign-worker-error.log',
      out_file: '/var/log/auctorum/campaign-worker-out.log',
      merge_logs: true
    },
    {
      // Cron — every minute, picks up scheduled campaigns whose
      // scheduledAt has passed and enqueues them on whatsapp_campaigns.
      name: 'cron-campaigns',
      cwd: '/opt/auctorum-systems/repo',
      script: 'npx',
      args: 'tsx scripts/cron-campaigns.ts',
      cron_restart: '* * * * *',
      autorestart: false,
      watch: false,
      env: { ...cronEnv, TZ: 'America/Monterrey' },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/auctorum/cron-campaigns-error.log',
      out_file: '/var/log/auctorum/cron-campaigns-out.log',
      merge_logs: true
    },
    {
      // Resilience cron: re-deliver webhooks (Stripe / MercadoPago / Meta)
      // that hit transient errors. See packages/queue/src/webhook-retry.ts
      // and scripts/cron-webhook-retries.ts. Runs every minute, exits clean.
      name: 'cron-webhook-retries',
      cwd: '/opt/auctorum-systems/repo',
      script: 'npx',
      args: 'tsx scripts/cron-webhook-retries.ts',
      cron_restart: '* * * * *',
      autorestart: false,
      watch: false,
      env: { ...cronEnv, TZ: 'America/Monterrey' },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/auctorum/cron-webhook-retries-error.log',
      out_file: '/var/log/auctorum/cron-webhook-retries-out.log',
      merge_logs: true
    },
    {
      // Resilience cron: drains pending_calendar_ops — Google Calendar
      // operations that previously failed (5xx, network, expired token).
      // See packages/ai/calendar-fallback.ts. Runs every 5 minutes.
      name: 'cron-calendar-pending',
      cwd: '/opt/auctorum-systems/repo',
      script: 'npx',
      args: 'tsx scripts/cron-calendar-pending.ts',
      cron_restart: '*/5 * * * *',
      autorestart: false,
      watch: false,
      env: { ...cronEnv, TZ: 'America/Monterrey' },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/auctorum/cron-calendar-pending-error.log',
      out_file: '/var/log/auctorum/cron-calendar-pending-out.log',
      merge_logs: true
    },
    {
      // Weekly KPI summary delivered by WhatsApp every Monday at 8:00 AM
      // (America/Monterrey). Skips tenants with no phone or with the
      // tenant.config.notifications.weekly_report_enabled = false flag.
      // Also skips weeks of zero activity to avoid spammy "0 / 0 / 0"
      // messages.
      name: 'cron-weekly-report',
      cwd: '/opt/auctorum-systems/repo',
      script: 'npx',
      args: 'tsx scripts/cron-weekly-report.ts',
      cron_restart: '0 8 * * 1',
      autorestart: false,
      watch: false,
      env: { ...cronEnv, TZ: 'America/Monterrey' },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/auctorum/cron-weekly-report-error.log',
      out_file: '/var/log/auctorum/cron-weekly-report-out.log',
      merge_logs: true
    },
    {
      // Daily DB integrity audit. 16 SELECT-COUNT-must-be-zero invariants
      // covering tenant_id consistency, FK orphans, NOM-004 cedula snapshots,
      // and uniqueness rules. Logs JSON one-liners; exits non-zero on fatal
      // failures so PM2 records a restart we can alert on.
      name: 'cron-data-integrity',
      cwd: '/opt/auctorum-systems/repo',
      script: 'npx',
      args: 'tsx scripts/check-data-integrity.ts',
      cron_restart: '0 6 * * *',
      autorestart: false,
      watch: false,
      env: { ...cronEnv, TZ: 'America/Monterrey' },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/auctorum/cron-data-integrity-error.log',
      out_file: '/var/log/auctorum/cron-data-integrity-out.log',
      merge_logs: true
    },
    {
      // P1-29: surfaces dead-letter signals from webhook_failures +
      // BullMQ failed sets + stuck data_deletion_requests. Emits one
      // JSON line per cycle. Pre-2026-05-12 these silently rotted.
      name: 'cron-dlq-monitor',
      cwd: '/opt/auctorum-systems/repo',
      script: 'npx',
      args: 'tsx scripts/cron-dlq-monitor.ts',
      cron_restart: '*/15 * * * *',
      autorestart: false,
      watch: false,
      env: { ...cronEnv, TZ: 'America/Monterrey' },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/auctorum/cron-dlq-monitor-error.log',
      out_file: '/var/log/auctorum/cron-dlq-monitor-out.log',
      merge_logs: true
    },
    {
      // Drains data_deletion_requests scheduled <= now(). Runs daily at
      // 4am local. Pre-2026-05-11 the Meta Data Deletion webhook
      // returned a confirmation code that resolved to nothing — Meta
      // Platform Policy + LFPDPPP violation. This cron is the actual
      // purge engine.
      name: 'cron-data-deletion',
      cwd: '/opt/auctorum-systems/repo',
      script: 'npx',
      args: 'tsx scripts/cron-data-deletion.ts',
      cron_restart: '0 4 * * *',
      autorestart: false,
      watch: false,
      env: { ...cronEnv, TZ: 'America/Monterrey' },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/auctorum/cron-data-deletion-error.log',
      out_file: '/var/log/auctorum/cron-data-deletion-out.log',
      merge_logs: true
    },
    {
      // Drains follow_ups whose `scheduled_at` has passed — sends the
      // doctor's customizable WhatsApp template (or a sensible default
      // per type) and flips the row to status='sent'. Pre-2026-05-10
      // the schema + UI for follow-ups existed but no consumer ever
      // dispatched them — pure UI placebo. Runs every 15 minutes.
      name: 'cron-follow-ups',
      cwd: '/opt/auctorum-systems/repo',
      script: 'npx',
      args: 'tsx scripts/cron-follow-ups.ts',
      cron_restart: '*/15 * * * *',
      autorestart: false,
      watch: false,
      env: { ...cronEnv, TZ: 'America/Monterrey' },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/auctorum/cron-follow-ups-error.log',
      out_file: '/var/log/auctorum/cron-follow-ups-out.log',
      merge_logs: true
    }
  ]
};
