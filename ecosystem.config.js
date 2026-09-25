module.exports = {
  apps: [
    {
      name: 'billing',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 2000
      }
    }
  ]
};
