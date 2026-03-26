// PM2 Ecosystem Config — Auctorum Systems (Quote Engine + MedConcierge)
module.exports = {
  apps: [
    {
      name: 'auctorum-quote-engine',
      cwd: '/opt/auctorum-systems/repo/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/auctorum/quote-engine-error.log',
      out_file: '/var/log/auctorum/quote-engine-out.log',
      merge_logs: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
    {
      name: 'auctorum-medconcierge',
      cwd: '/opt/auctorum-systems/repo/apps/medconcierge',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/auctorum/medconcierge-error.log',
      out_file: '/var/log/auctorum/medconcierge-out.log',
      merge_logs: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],

  // Cron jobs
  cron_restart: '0 4 * * *', // Restart daily at 4am for memory cleanup
};
