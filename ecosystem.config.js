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
      name: 'auctorum-worker',
      cwd: '/opt/auctorum-systems/repo',
      script: 'npx',
      args: '-y tsx scripts/worker.ts',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '450M',
      env: {
        ...medEnv,
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max-old-space-size=384'
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
    }
  ]
};
