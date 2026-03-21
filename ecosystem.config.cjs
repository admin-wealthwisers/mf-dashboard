module.exports = {
  apps: [
    {
      name: 'mf-api',
      script: 'server/index.js',
      cwd: '/opt/mf-dashboard',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    {
      name: 'mf-api-dev',
      script: 'server/index.js',
      cwd: '/opt/mf-dashboard-dev',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        MF_DB_PATH: '/opt/mf-dashboard/server/db/mf-data.db',
      },
    },
    {
      // Scheduled NAV update — 6:00 AM IST (00:30 UTC) Mon-Sat
      // Smart: checks if MFAPI has new data before running
      name: 'mf-nav-update',
      script: 'scripts/scheduledUpdate.js',
      cwd: '/opt/mf-dashboard',
      node_args: '--env-file=.env',
      cron_restart: '30 0 * * 1-6', // 00:30 UTC = 6:00 AM IST, Mon-Sat
      autorestart: false, // Don't restart after script finishes
      watch: false,
    },
  ],
};
