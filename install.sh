#!/bin/bash

# Buroq Billing Installation Script for Linux/Ubuntu/Debian
# Usage: ./install.sh

set -e # Exit on error

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Buroq Billing Installation...${NC}"

# 0. Check for Repository
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}📂 No package.json found. Cloning repository...${NC}"
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git is not installed.${NC}"
        echo -e "${YELLOW}Please install Git first: apt install -y git${NC}"
        exit 1
    fi
    git clone https://github.com/nurwendi/mikrotikbilling.git
    cd mikrotikbilling || exit
fi

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed.${NC}"
    echo -e "${YELLOW}Please install Node.js 20.x or higher using:${NC}"
    echo "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
    echo "apt-get install -y nodejs"
    exit 1
fi

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# 2. Setup Environment Variables
if [ ! -f .env ]; then
    if [ -f .env.local.example ]; then
        echo -e "${YELLOW}⚙️  Creating .env from .env.local.example...${NC}"
        cp .env.local.example .env
    else
        echo -e "${YELLOW}⚠️  No .env.local.example found. Creating default .env...${NC}"
        echo 'DATABASE_URL="file:./dev.db"' > .env
    fi
fi

# 3. Setup Database
echo -e "${YELLOW}🗄️  Setting up database...${NC}"
npx prisma generate
npx prisma db push

echo -e "${GREEN}✅ Installation Complete!${NC}"
if [ "$PWD" != "$OLDPWD" ] && [ -n "$OLDPWD" ]; then
    echo -e "${YELLOW}👉 NOTE: Please enter the directory first:${NC}"
    echo -e "   cd mikrotikbilling"
fi
echo -e "${GREEN}To start the application, run: npm run dev${NC}"
echo -e "${YELLOW}For production deployment, see DEPLOYMENT.md${NC}"
