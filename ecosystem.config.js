/**
 * Konfigurasi PM2 Multi-Core Cluster untuk Buroq Billing Management System
 *
 * Penjelasan Arsitektur Multi-Core:
 * 1. Aplikasi 'billing' menggunakan `exec_mode: 'cluster'` dan `instances: 'max'`.
 *    PM2 secara otomatis mendeteksi jumlah core CPU pada server dan menjalankan
 *    worker Next.js di seluruh core CPU secara paralel (Load Balancing otomatis).
 * 2. Setiap core mendapatkan alokasi memori hingga 1GB (`--max-old-space-size=1024`)
 *    dan akan di-restart otomatis tanpa downtime jika melewati batas `max_memory_restart: '1G'`.
 * 3. Penjadwalan otomatis (Cron Job) di `instrumentation.js` & `lib/scheduler.js`
 *    dikunci hanya pada Worker Utama (`NODE_APP_INSTANCE === '0'`) agar tidak terjadi
 *    duplikasi pembuatan invoice, pengiriman email, atau auto-isolir di core lainnya.
 * 4. Aplikasi 'isolir-server' berjalan di port 1500 menggunakan mode `fork` (1 instance)
 *    untuk menangani halaman pemberitahuan pelanggan yang terisolir.
 */
module.exports = {
  apps: [
    {
      name: 'billing',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 2000',
      instances: 'max', // Gunakan seluruh core CPU yang tersedia di server
      exec_mode: 'cluster', // Jalankan dalam mode cluster multi-core
      node_args: '--max-old-space-size=1024', // Mengalokasikan max 1GB RAM per Core (Total 4GB untuk 4 Core)
      watch: false,
      max_memory_restart: '1G', // Restart otomatis jika memori tembus 1GB per-core agar tidak menghabiskan RAM server
      env: {
        NODE_ENV: 'production',
        PORT: 2000
      }
    },
    {
      name: 'isolir-server',
      script: 'scripts/isolir-server.mjs',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};

