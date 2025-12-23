const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking pending registrations...');

    const pending = await prisma.registration.findMany({
        where: { status: 'pending' }
    });

    if (pending.length === 0) {
        console.log('No pending registrations found.');
    } else {
        console.log(`Found ${pending.length} pending registrations:`);
        pending.forEach(r => {
            console.log('---');
            console.log(`ID: ${r.id}`);
            console.log(`Username: ${r.username}`);
            console.log(`Type: ${r.type}`);
            console.log(`OwnerId: ${r.ownerId}`);
            console.log(`RouterIds: ${r.routerIds}`);
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
