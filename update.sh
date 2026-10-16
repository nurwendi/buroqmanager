#!/bin/bash

# Buroq Billing Update Script
# Usage: ./update.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔄 Starting Buroq Billing Update...${NC}"

# 1. Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes from git...${NC}"
git pull

# 2. Install dependencies
echo -e "${YELLOW}📦 Updating dependencies...${NC}"
npm install

# 3. Update Database
echo -e "${YELLOW}🗄️  Updating database schema...${NC}"
npx prisma generate
npx prisma migrate deploy || npx prisma db push

# 4. Rebuild Application (Required for Next.js)
echo -e "${YELLOW}🏗️  Building application...${NC}"
npm run build

# 5. Restart Service (Multi-Core Cluster via ecosystem.config.js)
echo -e "${YELLOW}🔄 Restarting service in Multi-Core Cluster mode...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 startOrReload ecosystem.config.js || pm2 restart billing || echo -e "${YELLOW}⚠️  PM2 service not found. Skipping restart.${NC}"
    pm2 save
else
    echo -e "${YELLOW}ℹ️  PM2 not found. If running manually, please restart the process.${NC}"
fi

echo -e "${GREEN}✅ Update Complete!${NC}"

