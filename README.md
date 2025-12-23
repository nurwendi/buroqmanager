# Buroq Billing - Integrated Mikrotik Billing System

Buroq Billing is a modern, full-stack web application designed to streamline billing and user management for Mikrotik-based ISP networks. Built with **Next.js 14**, **Prisma ORM**, and **Mikrotik API**, it provides a robust solution for managing PPPoE services, tracking payments, and calculating staff commissions.

## 🚀 Key Features

### 📡 Network Management
- **Mikrotik Integration**: Direct connection to Mikrotik routers via API.
- **PPPoE Management**: Create, edit, and delete PPPoE users directly from the dashboard.
- **Active Connections**: Real-time monitoring of online users and session duration.
- **Remote Actions**: Instantly disconnect active sessions.

### 💰 Billing & Finance
- **Automated Invoicing**: Generate monthly invoices for all customers.
- **Payment Tracking**: Record manual payments and track payment history.
- **Auto-Drop**: Configurable logic to automatically disable unpaid users after a grace period.
- **Financial Reports**: Visual charts for revenue, paid vs. unpaid users, and growth trends.

### 👥 User & Staff Management
- **Role System**:
  - **Admin**: Full access to all features.
  - **Manager**: Full access except System Users management.
  - **Editor**: Can manage PPPoE users (register/approve) but restricted from System Users and App Settings. Starts with Staff Dashboard.
  - **Staff**: Can view Dashboard, manage assigned customers, and request changes (requires approval).
  - **Agent**: Can view Dashboard and manage their own customers.
  - **Technician**: Can view Dashboard and manage assigned tasks/customers.
  - **Viewer**: Read-only access.
- **Commission Tracking**: Automatic calculation of commissions for staff, agents, and technicians.
- **Customer Portal**: Dedicated view for customers to check their package info and payment status.

### 🛠 System & Tools
- **Database**: PostgreSQL managed via Prisma ORM.
- **Auto Backup**: 
  - **Database**: Daily automatic backup to local storage.
  - **Mikrotik**: Daily automatic configuration backup `.backup` files on the router itself.
- **Theme Support**: Dark/Light mode, Glassmorphism, and customizable color themes.
- **Localization**: Full support for English and Indonesian languages.
- **Responsive Design**: Built with Tailwind CSS for seamless mobile and desktop experience.

## 💻 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **UI**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [Lucide React](https://lucide.dev/), [Framer Motion](https://www.framer.com/motion/), [Recharts](https://recharts.org/)
- **Authentication**: Custom session-based auth with bcrypt hashing.

---

## 📦 Deployment & Installation

### System Requirements
- **OS**: Windows, Ubuntu 20.04+, or Debian 11+
- **Node.js**: 20.x or higher
- **Database**: PostgreSQL 13+ (Required)
- **RAM**: Minimum 1GB
- **Storage**: Minimum 10GB
- **Network**: Access to MikroTik Router via API

### 1. Install Node.js
**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```
**Windows:**
Download and install from [nodejs.org](https://nodejs.org/).

### 2. Install PostgreSQL
**Linux:**
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```
**Windows:**
Download and install from [postgresql.org](https://www.postgresql.org/).

**Configure Database User:**
Create a database user and password (e.g., `postgres` / `32326655`).
Create a new database named `mikrotikbilling` (optional, script can create tables).

### 3. Setup Application
```bash
# Clone Repository
git clone https://github.com/nurwendi/mikrotikmanagement.git billing
cd billing

# Install Dependencies
npm install

# Configure Environment
cp .env.example .env
# Edit .env and set DATABASE_URL:
# DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/mikrotikbilling?schema=public"
```

### 4. Initialize Database (Fresh Install)
This will create tables and the default `superadmin` user.
```bash
npx prisma migrate dev --name init_postgres
npx prisma db seed
```
> **Note**: This resets the database completely.

### 5. Run Application
The application is configured to run on Port **80** by default.

**Development/Testing:**
```bash
npm run dev
# Access at http://localhost
```

**Production (PM2):**
```bash
npm install -g pm2
npm run build
pm2 start npm --name "billing" -- start
pm2 save
pm2 startup
```

## ⚙️ Configuration

### Default Login
- **Username**: `admin`
- **Password**: `admin123`
> ⚠️ **Important**: Change the default password after first login!

### Port Configuration
The app runs on port **2000** by default. To run on port 80:

**Option A: Use authbind (Recommended)**
```bash
apt install authbind
touch /etc/authbind/byport/80
chmod 500 /etc/authbind/byport/80
chown $USER /etc/authbind/byport/80
```
*Then update your PM2 start command to use authbind.*

**Option B: Use Nginx as Reverse Proxy**
```bash
apt install nginx
nano /etc/nginx/sites-available/billing
```
Add configuration:
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
Enable site:
```bash
ln -s /etc/nginx/sites-available/billing /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Mikrotik Connection
Navigate to **Settings > Mikrotik Connections** to add your router credentials:
- **Host**: IP address of your Mikrotik router.
- **Port**: API port (default: 8728).
- **Username/Password**: Router login with API permissions.
    - Command: `/ip service set api address=YOUR_SERVER_IP enabled=yes port=8728`
    - Command: `/user add name=billing password=YOUR_PASSWORD group=full`

## 📂 Data Files Location

| File | Description |
|------|-------------|
| `config.json` | Router connections and settings |
| `app-settings.json` | Application name and logo |
| `billing-settings.json` | Invoice settings |
| `customer-data.json` | Customer information |
| `data/users.json` | System users |
| `backups/` | Automatic backups |

## 🔄 Maintenance & Tools

### Scheduled Tasks
| Task | Schedule | Description |
|------|----------|-------------|
| Daily Backup | 00:00 | Backs up all data to `backups/` folder |
| Auto-Drop | 01:00 | Disconnects users with overdue payments |
| Traffic Collection | Every minute | Collects bandwidth data |
| Usage Sync | Every 5 minutes | Syncs user data usage |

### Auto Update
To update the application to the latest version (code & database):
```bash
chmod +x update.sh
./update.sh
```
*Alternatively, you can manually `git pull`, `npm install`, `npx prisma db push`, `npm run build`, and `pm2 restart billing`.*

### Auto Remove / Reset
To uninstall or reset the application (clears database and node_modules):

**Linux / Mac**
```bash
chmod +x uninstall.sh
./uninstall.sh
```

**Windows**
```powershell
.\uninstall.ps1
```
To reset ONLY data (keep config):
```bash
node scripts/reset-data.js
```

### Push Changes to GitHub
To upload your changes to the repository:
```bash
git add .
git commit -m "Description of your changes"
git push
```

### Manual Removal (Linux)
If you prefer to remove the application manually or if the script fails:

1. **Stop the Application**
   ```bash
   pm2 stop billing
   pm2 delete billing
   ```

2. **Remove Application Files**
   ```bash
   # Remove dependencies and build output
   rm -rf node_modules .next
   
   # Remove database
   rm prisma/dev.db prisma/dev.db-journal
   
   # Rename configuration (optional backup)
   mv .env .env.bak
   ```

3. **Delete Repository (Optional)**
   ```bash
   cd ..
   rm -rf billing
   ```

### PM2 Commands
```bash
pm2 list              # Show all processes
pm2 logs billing      # View logs
pm2 restart billing   # Restart application
pm2 stop billing      # Stop application
```

## ❓ Troubleshooting

### Port 2000 Already in Use
```bash
lsof -i :2000
kill -9 <PID>
```

### PM2 Not Starting on Boot
```bash
pm2 unstartup
pm2 startup
pm2 save
```

### Verify Node.js Version
```bash
node -v  # Should be 20.x or higher
```

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
