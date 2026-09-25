module.exports = {
  apps: [
    {
      name: 'billing',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 2000',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
