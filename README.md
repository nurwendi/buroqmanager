# Buroq Billing - Integrated Mikrotik Billing System

Buroq Billing is a modern, full-stack web application designed to streamline billing and user management for Mikrotik-based ISP networks. Built with **Next.js 14**, **Prisma ORM**, and **Mikrotik API**, it provides a robust solution for managing PPPoE services, tracking payments, and calculating staff commissions.

## 🚀 Key Features

### � Network Management
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

## 🐧 Installation for Debian/Ubuntu

### 1. Verification & Prerequisites
Update your system and install necessary compatible tools:
```bash
apt update && apt upgrade -y
apt install -y curl git unzip
```

### 2. Install Node.js (Version 20.x)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

### 3. Install & Setup Buroq Billing
**Method A: Automatic (Recommended)**
```bash
curl -fsSL https://raw.githubusercontent.com/nurwendi/mikrotikbilling/master/install.sh | bash
```

**Method B: Manual Step-by-Step**
```bash
# 1. Clone Repository
git clone https://github.com/nurwendi/mikrotikbilling.git
cd mikrotikbilling

# 2. Install Dependencies
npm install

# 3. Setup Database
npx prisma generate
npx prisma db push

# 4. Run Application
npm run dev
```

### 4. Setup Production (Optional using PM2)
To run the application in the background and start automatically on boot:

```bash
# 1. Install PM2
npm install -g pm2

# 2. Build for Production
npm run build

# 3. Start with PM2
pm2 start npm --name "billing" -- start

# 4. Save Startup Selection
pm2 save
pm2 startup
```

---

## 🔄 Maintenance & Tools

### Auto Update
To update the application to the latest version (code & database):
```bash
chmod +x update.sh
./update.sh
```

### Auto Remove / Reset
To uninstall or reset the application (clears database and node_modules):
```bash
chmod +x uninstall.sh
./uninstall.sh
```

---

## 🪟 Windows Installation
```powershell
iwr -useb https://raw.githubusercontent.com/nurwendi/mikrotikbilling/master/install.ps1 | iex
```


## ⚙️ Configuration

### Mikrotik Connection
Navigate to **Settings > Mikrotik Connections** to add your router credentials:
- **Host**: IP address of your Mikrotik router.
- **Port**: API port (default: 8728).
- **Username/Password**: Router login with API permissions.

### System Settings
- **Billing Config**: Set invoice prefixes, currencies, and due dates in **Settings > Billing**.
- **Backup**: Download database backups from **Settings > Backup & Restore**.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
