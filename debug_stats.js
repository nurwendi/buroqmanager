const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// Mock usage tracker
const fs = require('fs');
const path = require('path');
const USAGE_FILE = path.join(process.cwd(), 'data', 'user-usage.json');

function getMonthlyUsage(username) {
    try {
        if (fs.existsSync(USAGE_FILE)) {
            const data = fs.readFileSync(USAGE_FILE, 'utf8');
            const json = JSON.parse(data);
            const userData = json[username];
            if (!userData) return { rx: 0, tx: 0 };
            return { rx: userData.accumulated_rx + userData.last_session_rx, tx: userData.accumulated_tx + userData.last_session_tx };
        }
    } catch (error) {
        console.error('Error reading usage file:', error);
    }
    return { rx: 0, tx: 0 };
}

async function main() {
    let username = '10100010'; // Simulating decoded.username
    console.log(`Starting debug for username: ${username}`);

    // 1. Implicit Lookup
    const asCustomer = await prisma.customer.findUnique({
        where: { customerId: username }
    });

    if (asCustomer) {
        console.log(`[Success] Resolved to: ${asCustomer.username}`);
        username = asCustomer.username;
    } else {
        console.log('[Fail] Could not resolve customerId');
    }

    // 2. User Profile
    try {
        const userProfile = await prisma.user.findUnique({ where: { username } });
        console.log(`[UserProfile] Name: ${userProfile ? userProfile.fullName : 'Not Found separate user profile'}`);
    } catch (e) {
        console.error('[UserProfile] Error:', e);
    }

    // 3. Usage
    try {
        const usage = getMonthlyUsage(username);
        console.log('[Usage]', usage);
    } catch (e) {
        console.error('[Usage] Error:', e);
    }

    // 4. Payments
    try {
        const payments = await prisma.payment.findMany({
            where: { username },
            orderBy: { date: 'desc' }
        });
        console.log(`[Payments] Found: ${payments.length}`);
    } catch (e) {
        console.error('[Payments] Error:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
