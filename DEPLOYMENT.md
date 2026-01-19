# Deployment Guide - Buroq Billing Management System

This guide explains how to deploy the Buroq Billing Management application on Ubuntu/Debian Server.

## System Requirements

- **OS**: Ubuntu 20.04+ / Debian 11+
- **Node.js**: 20.x (LTS)
- **Database**: PostgreSQL 14+
- **RAM**: Minimum 1GB
- **Storage**: Minimum 10GB
- **Network**: Access to MikroTik Router via API

---

## 🚀 Quick Installation (Automated)

The easiest way to install is using the automated script. This script handles dependencies, database connection, and PM2 setup.

```bash
curl -sL https://raw.githubusercontent.com/nurwendi/buroqmanager/master/scripts/install.sh | sudo bash
```

After installation:
1.  Go to the app directory: `cd /opt/billing`
2.  Configure your environment: `cp .env.example .env && nano .env`
    *   Set `DATABASE_URL` (see Database Setup below)
    *   Set `MIKROTIK_HOST` and credentials
3.  Initialize Database:
    ```bash
    npx prisma generate
    npx prisma migrate deploy
    npx prisma db seed
    ```
4.  Restart App: `pm2 restart billing`

---

## 🛠 Manual Installation

If you prefer to install manually, follow these steps.

### 1. Update System & Install Dependencies
```bash
# Update System
sudo apt update && sudo apt upgrade -y

# Install Git & Curl
sudo apt install -y git curl

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (Process Manager)
sudo npm install -g pm2
```

### 2. Install & Configure PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create Database & User
sudo -u postgres psql

# In psql prompt:
CREATE DATABASE buroq_billing;
CREATE USER buroq_user WITH ENCRYPTED PASSWORD 'B1LL1n6-2025';
GRANT ALL PRIVILEGES ON DATABASE buroq_billing TO buroq_user;
ALTER DATABASE buroq_billing OWNER TO buroq_user;
\q
```

### 3. Clone Repository
```bash
cd /opt
sudo git clone https://github.com/nurwendi/buroqmanager.git billing
sudo chown -R $USER:$USER /opt/billing
cd /opt/billing
```

### 4. Configure Application
```bash
# Setup Environment Variables
cp .env.example .env
nano .env
```
Update `DATABASE_URL` in `.env`:
```env
DATABASE_URL="postgresql://buroq_user:B1LL1n6-2025@localhost:5432/buroq_billing?schema=public"
```
*Note: If your password has special characters like `#`, encode them (e.g., `%23`).*

### 5. Install Dependencies & Build
```bash
npm install
npx prisma generate
npx prisma migrate deploy
# If migration fails, force push: npx prisma db push

# Seed Database (Creates default superadmin)
npx prisma db seed
```

**Default Credentials:**
- **Username**: `superadmin`
- **Password**: `admin123`

### 6. Build & Start
```bash
npm run build

# Start with PM2
pm2 start npm --name "billing" -- start
pm2 save
pm2 startup
```

### 7. File Permissions (Important)
Ensure public images are accessible:
```bash
chmod -R 755 /opt/billing/public
```

---

## 🔄 Update Application

To update to the latest version:

```bash
cd /opt/billing
git pull origin master
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart billing
```

---

## 🔧 Troubleshooting

### Database "Table does not exist"
Run migration command manually:
```bash
npx prisma migrate deploy
```

### "PM2 not found" after install
Refresh your shell hash:
```bash
hash -r
```
Or use full path: `npx pm2 ...`

### Images not loading
Check permissions of the public folder:
```bash
chmod -R 755 /opt/billing/public
```

### Resetting Data
To wipe all data and start fresh:
```bash
# WARNING: Deletes all data!
node scripts/reset-data.js
```
