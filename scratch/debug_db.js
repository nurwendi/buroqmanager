const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Basic .env parser
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="(.+?)"/);
const databaseUrl = dbUrlMatch ? dbUrlMatch[1] : null;

if (!databaseUrl) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;
console.log('Testing with:', databaseUrl.replace(/:.+@/, ':****@'));

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, role: true, ownerId: true }
        });
        console.log('Users found:', users.length);
        console.log(JSON.stringify(users.slice(0, 5), null, 2));
    } catch (e) {
        console.error('DB Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
