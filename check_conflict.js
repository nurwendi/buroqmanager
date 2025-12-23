const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const username = 'tes123';
    console.log(`Checking for existing records for: ${username}`);

    const user = await prisma.user.findUnique({ where: { username } });
    if (user) {
        console.log('User FOUND:', user.id, user.username, user.role);
    } else {
        console.log('User NOT found.');
    }

    // Customer table
    // Need ownerId to find accurately if utilizing composite unique, but let's finding many
    const customers = await prisma.customer.findMany({ where: { username } });
    if (customers.length > 0) {
        console.log(`Found ${customers.length} Customer records:`);
        customers.forEach(c => console.log(` - ID: ${c.id}, Owner: ${c.customerNumber || c.ownerId}`));
    } else {
        console.log('Customer NOT found.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
