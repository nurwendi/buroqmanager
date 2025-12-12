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
- **Staff System**: Comprehensive role-based access for Admins, Staff (formerly Partner), Agents, and Technicians.
- **Commission Tracking**: Automatic calculation of commissions for staff, agents, and technicians.
- **Customer Portal**: Dedicated view for customers to check their package info and payment status.

### 🛠 System & Tools
- **Database**: SQLite database managed via Prisma ORM.
- **Auto Backup**: 
  - **Database**: Daily automatic backup to local storage.
  - **Mikrotik**: Daily automatic configuration backup `.backup` files on the router itself.
- **Theme Support**: Dark/Light mode, Glassmorphism, and customizable color themes.
- **Localization**: Full support for English and Indonesian languages.
- **Responsive Design**: Built with Tailwind CSS for seamless mobile and desktop experience.

## 💻 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Database**: [SQLite](https://www.sqlite.org/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **UI**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [Lucide React](https://lucide.dev/), [Framer Motion](https://www.framer.com/motion/), [Recharts](https://recharts.org/)
- **Authentication**: Custom session-based auth with bcrypt hashing.

---

## 📦 Deployment & Installation

### System Requirements
- **OS**: Ubuntu 20.04+ / Debian 11+
- **Node.js**: 20.x or higher
- **RAM**: Minimum 1GB
- **Storage**: Minimum 10GB
- **Network**: Access to MikroTik Router via API

### 1. Update System
```bash
apt update && apt upgrade -y
```

### 2. Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v  # Verify installation
```

### 3. Install PM2 (Process Manager)
```bash
npm install -g pm2
```

### 4. Install Git
```bash
apt install -y git
```

### 5. Install & Setup Buroq Billing
**Method A: Automatic (Recommended)**
```bash
curl -fsSL https://raw.githubusercontent.com/nurwendi/mikrotikbilling/master/install.sh | bash
```
*Note: This script will auto-clone the repository if not present, install dependencies, and setup the database.*

**Method B: Manual Step-by-Step**
```bash
# Clone Repository
cd /opt
git clone https://github.com/nurwendi/mikrotikbilling.git billing
chown -R $USER:$USER /opt/billing
cd /opt/billing

# Install Dependencies
npm install

# Setup Database
npx prisma generate
npx prisma db push

# Run Application
npm run dev
```

### 6. Start Application with PM2 (Production)
```bash
cd /opt/billing
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
The app runs on port **3000** by default. To run on port 80:

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
        proxy_pass http://localhost:3000;
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
```bash
chmod +x uninstall.sh
./uninstall.sh
```
To reset ONLY data (keep config):
```bash
node scripts/reset-data.js
```

### PM2 Commands
```bash
pm2 list              # Show all processes
pm2 logs billing      # View logs
pm2 restart billing   # Restart application
pm2 stop billing      # Stop application
```

## ❓ Troubleshooting

### Port 3000 Already in Use
```bash
lsof -i :3000
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
