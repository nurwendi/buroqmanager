# Buroq Billing Management System

A professional Mikrotik Billing & User Management System built with Next.js 14, Prisma, and PostgreSQL.

## 🚀 Installation Guide

### 1. Prerequisites
Ensure you have the following installed on your server (Debian/Ubuntu/Windows):
- **Node.js** (Version 20 or higher)
- **PostgreSQL** (Version 15 or higher)
- **Git**

### 2. Database Setup (PostgreSQL)
Before installing the app, you must create a database and user.

#### For Linux (Debian/Ubuntu)
**Step 1: Access PostgreSQL Shell**
If you have `sudo`:
```bash
sudo -u postgres psql
```
If you are **root** (without sudo):
```bash
su - postgres
psql
```

**Step 2: Create User & Database**
Copy and paste these commands into the `postgres=#` prompt:

```sql
-- 1. Create User (Change 'your_password' to a secure password)
CREATE USER billing WITH PASSWORD 'your_password';

-- 2. Create Database
CREATE DATABASE mikrotikbilling;

-- 3. Grant Privileges
GRANT ALL PRIVILEGES ON DATABASE mikrotikbilling TO billing;

-- 4. Grant Schema Permissions (Crucial for Prisma)
GRANT ALL ON SCHEMA public TO billing;
ALTER DATABASE mikrotikbilling OWNER TO billing;

-- 5. Exit
\q
```

### 3. Application Installation

**1. Clone Repository**
```bash
git clone https://github.com/nurwendi/mikrotikmanagement.git
cd mikrotikmanagement
```

**2. Install Dependencies**
```bash
npm install
```

**3. Configure Environment**
Copy the example environment file:
```bash
cp .env.example .env
```

Edit the `.env` file:
```bash
nano .env
```
Find `DATABASE_URL` and update it with your password:
```env
DATABASE_URL="postgresql://billing:your_password@localhost:5432/mikrotikbilling?schema=public"
```
*Also configure your Mikrotik IP, User, and Password in this file.*

**4. Initialize Database**
Run these commands to create tables and default admin user:
```bash
npx prisma db push
node prisma/seed.js
```

### 4. Running the Application

**Development Mode:**
```bash
npm run dev
# App will run at http://localhost (Port 80)
```

**Production Build:**
```bash
npm run build
npm start
```

### 🔑 Default Login
- **Username:** `superadmin`
- **Password:** `admin123`

---

## 🛠 Troubleshooting

**Error: `Can't reach database server`**
- Check if PostgreSQL is running: `systemctl status postgresql`
- check your `.env` credentials.

**Error: `permission denied for schema public`**
- Re-run the Grant Schema Permissions SQL commands in Step 2.

**Error: `The table public.SystemSetting does not exist` (P2021)**
- This means the database is empty. You must create the tables:
  ```bash
  npx prisma db push
  node prisma/seed.js
  ```

- Do not run `npm` commands as the `postgres` user. Type `exit` to return to your root/regular user.

## 🔄 Updating Server Application

To force update the server with the latest changes from GitHub (Hard Reset):

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
> **Warning**: This command (`git reset --hard`) will overwrite any local changes made directly on the server.

