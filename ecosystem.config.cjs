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
  ],
};
