#!/bin/bash

# MikroTik Billing - Installation Script
# https://github.com/nurwendi/mikrotikbilling

set -e

echo "=============================================="
echo "  MikroTik Billing - Installation Script"
echo "=============================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

echo -e "${GREEN}[1/7]${NC} Updating system..."
apt update && apt upgrade -y

echo -e "${GREEN}[2/7]${NC} Installing curl and git..."
apt install -y curl git

echo -e "${GREEN}[3/7]${NC} Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo -e "${GREEN}[4/7]${NC} Installing PM2..."
npm install -g pm2

echo -e "${GREEN}[5/7]${NC} Cloning repository..."
cd /opt
if [ -d "billing" ]; then
    echo -e "${YELLOW}Directory /opt/billing already exists. Removing...${NC}"
    rm -rf billing
fi
git clone https://github.com/nurwendi/buroqmanager.git billing
cd /opt/billing

echo -e "${GREEN}[6/7]${NC} Installing dependencies and preparing database..."
npm install
npx prisma generate

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${RED}IMPORTANT: Please edit .env with your database and Mikrotik credentials later!${NC}"
fi

# Try to run migrations (will fail if DB not ready, but that's okay, user is instructed to run it later)
echo -e "${YELLOW}Attempting to run database migrations...${NC}"
npx prisma migrate deploy || echo -e "${RED}Migration failed (likely due to missing DB config). Please run manually after configuring .env.${NC}"

echo -e "${GREEN}[7/7]${NC} Building and starting application with PM2..."
npm run build

pm2 start npm --name "billing" -- start
pm2 start npm --name "isolir" -- run isolir
pm2 save
pm2 startup

echo ""
echo "=============================================="
echo -e "${GREEN}  Installation Complete!${NC}"
echo "=============================================="
echo ""
echo "1. Configure your environment: nano /opt/billing/.env"
echo "2. Initialize Database (if Step 6 failed):"
echo "   cd /opt/billing"
echo "   npx prisma migrate deploy"
echo "   npx prisma db seed"
echo "3. Restart App: pm2 restart billing"
echo ""
echo "Access the application at:"
echo -e "  ${GREEN}http://$(hostname -I | awk '{print $1}'):2000${NC}"
echo ""
