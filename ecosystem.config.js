module.exports = {
  apps: [
    {
      name: 'billing',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 2000',
      instances: 'max',
      exec_mode: 'cluster',
      node_args: '--max-old-space-size=1024', // Mengalokasikan max 1GB RAM per Core (Total 4GB untuk 4 Core)
      watch: false,
      max_memory_restart: '1G', // Restart otomatis jika memori tembus 1GB per-core agar tidak menghabiskan RAM server
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
