const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const searchId = '10100010';
    console.log(`[Test] Searching for customerId: ${searchId}`);

    const customer = await prisma.customer.findFirst({
        where: { customerId: searchId }
    });

    if (!customer) {
        console.log('Customer not found');
        return;
    }

    const username = customer.username;
    console.log(`[Test] Found user: ${username}`);

    // Check Payments
    const payments = await prisma.payment.findMany({
        where: { username },
        orderBy: { date: 'desc' }
    });
    console.log(`[Test] Found ${payments.length} payments.`);
    if (payments.length > 0) console.log('Latest Payment:', payments[0]);

    // Check User Profile
    const userProfile = await prisma.user.findUnique({ where: { username } });
    console.log('[Test] User Profile:', userProfile ? userProfile.fullName : 'Not Found');

}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
