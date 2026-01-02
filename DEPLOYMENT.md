# Deployment Guide - Buroq Billing Management System

This guide explains how to deploy the Buroq Billing Management application on Ubuntu/Debian Server.

## System Requirements

- **OS**: Ubuntu 20.04+ / Debian 11+
- **Node.js**: 20.x or higher
- **Database**: PostgreSQL 14+
- **RAM**: Minimum 1GB
- **Storage**: Minimum 10GB
- **Network**: Access to MikroTik Router via API

## Quick Installation (Ubuntu/Debian)

### Prerequisite Check
Before installing, ensure ports 80 and 5432 are not in use.
```bash
sudo lsof -i :80
sudo lsof -i :5432
```


### 1. Update System
```bash
apt update && apt upgrade -y
```

### 2. Install PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
### 2. Install PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Configure Firewall (UFW)
Ensure your server allows traffic on necessary ports.
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```


### 3. Create Database & User
```bash
sudo -u postgres psql
# In psql prompt:
CREATE DATABASE mikrotik_billing;
CREATE USER billing_user WITH ENCRYPTED PASSWORD 'B1LL1n6#2025';
GRANT ALL PRIVILEGES ON DATABASE mikrotik_billing TO billing_user;
ALTER DATABASE mikrotik_billing OWNER TO billing_user;
\q
```

### 4. Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v  # Verify installation
```

### 5. Install Process Manager (PM2)
```bash
npm install -g pm2
```


### 5. Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### 6. Install Git
```bash
apt install -y git
```

### 7. Clone Repository
```bash
cd /opt
git clone https://github.com/nurwendi/buroqmanager.git billing
chown -R $USER:$USER /opt/billing
cd /opt/billing
```

### 8. Configure Environment
```bash
cp .env.local.example .env
nano .env
# Set DATABASE_URL="postgresql://billing_user:your_secure_password@localhost:5432/mikrotik_billing?schema=public"
```
> **Note**: If your password contains special characters (like `#`), you must URL encode them (e.g., `#` becomes `%23`).


### 9. Install & Setup
```bash
npm install
npx prisma generate
npx prisma db push
npm install
npx prisma generate
npx prisma db push
npx prisma db seed  # CRITICAL: Creates default admin/admin123 user
```


### 10. Build Application
```bash
npm run build
```

### 11. Start Application with PM2
```bash
pm2 start npm --name "billing" -- start
pm2 save
pm2 startup  # Follow the instructions to enable auto-start
```

### 12. Set Timezone
```bash
sudo timedatectl set-timezone Asia/Jakarta
```

## Configuration

### Default Login
- **Username**: `admin`
- **Password**: `admin123`

> ⚠️ **Important**: Change the default password after first login!

### Port Configuration
The app runs on port **2000** by default. To run on port 80:

**Option A: Use authbind (Recommended)**
```bash
sudo apt install authbind
sudo touch /etc/authbind/byport/80
sudo chmod 500 /etc/authbind/byport/80
sudo chown $USER /etc/authbind/byport/80
sudo chown $USER /etc/authbind/byport/80
```

To run with authbind:
```bash
# Run interactively (to test)
authbind --deep npx next start -p 80 -H 0.0.0.0

# Run with PM2 (Production)
authbind --deep pm2 start npm --name "billing" -- start
```


**Option B: Use Nginx as Reverse Proxy**
```bash
sudo apt install nginx
```

Create config file:
```bash
sudo nano /etc/nginx/sites-available/billing
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:2000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/billing /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## MikroTik Router Setup

### Enable API Access
On MikroTik RouterOS:
```
/ip service set api address=YOUR_SERVER_IP enabled=yes port=8728
```

### Create API User
```
/user add name=billing password=YOUR_PASSWORD group=full
```

## Data Files Location

| File | Description |
|------|-------------|
| `config.json` | Router connections and settings |
| `app-settings.json` | Application name and logo |
| `billing-settings.json` | Invoice settings |
| `customer-data.json` | Customer information |
| `data/users.json` | System users |
| `data/traffic-history.json` | Traffic history (7 days) |
| `data/temperature-history.json` | Temperature history (3 days) |
| `data/cpu-history.json` | CPU usage history (3 days) |
| `backups/` | Automatic backups |

## Scheduled Tasks

The application runs automatic tasks:

| Task | Schedule | Description |
|------|----------|-------------|
| Daily Backup | 00:00 | Backs up all data to `backups/` folder |
| Auto-Drop | 01:00 | Disconnects users with overdue payments |
| Traffic Collection | Every minute | Collects bandwidth data |
| Usage Sync | Every 5 minutes | Syncs user data usage |

## PM2 Commands

```bash
pm2 list              # Show all processes
pm2 logs billing      # View logs
pm2 restart billing   # Restart application
pm2 stop billing      # Stop application
pm2 delete billing    # Remove from PM2
```

## Update Application

```bash
cd /opt/billing
git pull origin master
npm install
npx prisma generate
npx prisma db push
npm run build
pm2 restart billing
```

## Jika Anda ingin memaksa update dan menimpa semua perubahan di server dengan versi terbaru dari GitHub, jalankan perintah ini di server:

```bash
cd /opt/billing
git fetch --all
git reset --hard origin/master
npm install
npx prisma generate
npx prisma db push
npm run build
pm2 restart billing
```
Peringatan: Perintah git reset --hard akan menghapus semua perubahan lokal (jika ada) yang Anda buat langsung di server. Pastikan Anda tidak mengubah kode penting langsung di server.

## Resetting Data

To reset all data to fresh state:
```bash
node scripts/reset-data.js
```

This will:
- Clear all customer data
- Reset to default admin user
- Clear all history data
- Keep configuration files

## Troubleshooting

### Port 2000 Already in Use
```bash
sudo lsof -i :2000
sudo kill -9 <PID>
```

### PM2 Not Starting on Boot
```bash
pm2 unstartup
pm2 startup
pm2 save
```

### Check Application Logs
```bash
pm2 logs billing --lines 100
```

### Verify Node.js Version
```bash
node -v  # Should be 20.x or higher
```

### Invalid Credentials / Login Failed
If you cannot login with `admin` / `admin123`:
1. Ensure you ran the seed command: `npx prisma db seed`
2. If that fails, manually reset the password via `prisma studio` or a script.

### App Running but Not Accessible
1. Check Firewall: `sudo ufw status` (Ensure 80/tcp is ALLOWED)
2. Check Listen Address: `sudo ss -tulpn | grep :80`. If it says `127.0.0.1:80`, you need to bind to `0.0.0.0` using `-H 0.0.0.0`.


## Features

- ✅ Dashboard with real-time stats
- ✅ PPPoE User Management
- ✅ Billing & Invoice System
- ✅ Customer Data Management
- ✅ Multi-Router Support
- ✅ Temperature & CPU Monitoring (3-day graphs)
- ✅ Traffic Monitoring (7-day graphs)
- ✅ Auto-Drop Unpaid Users
- ✅ Automatic Backups
- ✅ Dark Mode Support
- ✅ Mobile Responsive

## Support

For issues and feature requests, please open an issue on GitHub:
https://github.com/nurwendi/mikrotikbilling/issues
