# Buroq Billing Management System

A professional Mikrotik Billing & User Management System built with Next.js 14, Prisma, and PostgreSQL.

## 📋 System Requirements

- **OS**: Ubuntu 20.04+ / Debian 11+
- **Node.js**: Version 20.x or higher
- **Database**: PostgreSQL 14+
- **RAM**: Minimum 1GB
- **Storage**: Minimum 10GB
- **Network**: Access to MikroTik Router via API (Port 8728)

---

## 🚀 Complete Installation Guide

Follow these steps to set up the application from scratch on a Linux server.

### Step 1: Server Preparation
Update your system and install basic tools.

```bash
# Update repositories
sudo apt update && sudo apt upgrade -y

# Install Git and Curl
sudo apt install -y git curl

# Set Timezone (Important for billing cycles)
sudo timedatectl set-timezone Asia/Jakarta
```

### Step 2: Install Node.js & PM2
Install Node.js version 20 LTS and PM2 process manager.

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# Verify installation
node -v   # Should be v20.x.x
npm -v

# Install PM2 Global
sudo npm install -g pm2
```

### Step 3: Install & Configure PostgreSQL
Set up the database server and user.

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Enter Postgres Prompt
sudo -u postgres psql
```

**Inside the PostgreSQL prompt (`postgres=#`), run:**

```sql
-- 1. Create User (Change 'your_secure_password'!)
CREATE USER billing_user WITH ENCRYPTED PASSWORD 'your_secure_password';

-- 2. Create Database
CREATE DATABASE mikrotik_billing;

-- 3. Grant Privileges
GRANT ALL PRIVILEGES ON DATABASE mikrotik_billing TO billing_user;
ALTER DATABASE mikrotik_billing OWNER TO billing_user;

-- 4. Exit
\q
```

### Step 4: Install Application

```bash
# 1. Clone Repository (Recommended to use /opt directory)
cd /opt
sudo git clone https://github.com/nurwendi/buroqmanager.git billing
sudo chown -R $USER:$USER /opt/billing
cd /opt/billing

# 2. Install Dependencies
npm install
```

### Step 5: Configuration

1. **Setup Environment Variables**
   ```bash
   cp .env.local.example .env
   nano .env
   ```

2. **Edit `.env` File**:
   Update `DATABASE_URL` with the password you set in Step 3.
   ```env
   # PostgreSQL Connection String
   DATABASE_URL="postgresql://billing_user:your_secure_password@localhost:5432/mikrotik_billing?schema=public"
   
   # App Details
   APP_URL=http://your-server-ip
   PORT=2000
   
   # Optional: Mikrotik Defaults (Can be configured in UI later)
   MIKROTIK_HOST=192.168.88.1
   MIKROTIK_PORT=8728
   ```

3. **Initialize Database**
   This creates all tables and the default admin user.
   ```bash
   npx prisma generate
   npx prisma db push
   # Optional: Seed initial data if needed (usually handled by app)
   # node prisma/seed.js 
   ```

### Step 6: Build & Start

```bash
# Build the application
npm run build

# Start with PM2
pm2 start npm --name "billing" -- start

# Save PM2 list so it restarts on reboot
pm2 save
pm2 startup
# (Run the command output by pm2 startup)
```

The app is now running on **Port 2000**.

---

## 🌐 Port 80 Configuration (Optional)

To access the app without a port number (e.g., `http://your-domain.com`), choose **Option A** OR **Option B**.

### Option A: Authbind (Simplest)
Allows the app to bind directly to port 80 safely.

```bash
sudo apt install authbind
sudo touch /etc/authbind/byport/80
sudo chmod 500 /etc/authbind/byport/80
sudo chown $USER /etc/authbind/byport/80

# Restart app on port 80
# First, edit package.json script "start" to use "-p 80" or just run:
pm2 delete billing
authbind --deep pm2 start npm --name "billing" -- start -- -p 80
```

### Option B: Nginx Reverse Proxy (Recommended for Domain/SSL)

```bash
sudo apt install nginx
```

Create config: `sudo nano /etc/nginx/sites-available/billing`

```nginx
server {
    listen 80;
    server_name your-domain.com; # Or your IP

    location / {
        proxy_pass http://localhost:2000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable & Restart:
```bash
sudo ln -s /etc/nginx/sites-available/billing /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

---

## 📡 MikroTik Router Setup

To allow the billing app to control users, enable API access on your MikroTik.

**Run these commands in MikroTik Terminal:**

```bash
# 1. Enable API Service
/ip service set api port=8728 address=0.0.0.0/0 disabled=no

# 2. Create Billing User (Full Permissions)
/user add name=billing password=YOUR_MIKROTIK_PASSWORD group=full comment="For Buroq Billing App"
```

---

## ⛔ Isolir Server Setup (Auto-Drop)

This system includes a dedicated server (Port 1500) to redirect isolated/unpaid users.

**1. Start Isolir Server**
```bash
pm2 start npm --name "isolir-server" -- run isolir
pm2 save
```

**2. Configure MikroTik**
1. Login to Buroq Manager.
2. Go to **Settings > Routers Management**.
3. Generate the "Isolir Script" and paste it into MikroTik Terminal.

---

## 🔄 How to Update

To update the application to the latest version:

```bash
cd /opt/billing
git pull origin master
npm install
npx prisma generate
npx prisma db push
npm run build
pm2 restart billing
```

---

## 🔑 Default Credentials

- **URL**: `http://YOUR_SERVER_IP:2000` (or Port 80 if configured)
- **Username**: `admin`
- **Password**: `admin123`

> ⚠️ **Change this password immediately after logging in!**

---

## 📂 File Locations & Logs

| Item | Location/Command |
|------|------------------|
| **App Directory** | `/opt/billing` |
| **Backups** | `/opt/billing/backups/` |
| **Logs** | `pm2 logs billing` |
| **Config** | `.env` |

## 🛠 Troubleshooting

**1. Database Connection Error**
- Ensure PostgreSQL is running: `systemctl status postgresql`
- Check `.env` `DATABASE_URL` credentials.

**2. Permission Denied (Schema Public)**
- Re-run the `GRANT ALL ON SCHEMA public...` command in PostgreSQL setup.

**3. App not accessible**
- Check firewall (`ufw status`). Allow port 2000 or 80: `ufw allow 2000`.

**4. Reset All Data**
- To wipe database and start fresh: `node scripts/reset-data.js`
