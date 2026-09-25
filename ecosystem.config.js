module.exports = {
  apps: [
    {
      name: 'billing',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 2000',
      instances: 'max',
      exec_mode: 'cluster',
      node_args: '--max-old-space-size=4096', // Mengalokasikan hingga 4GB RAM per Core jika tersedia
      watch: false,
      max_memory_restart: '3G', // Batas aman restart dinaikkan menjadi 3GB
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
