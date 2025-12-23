const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const superadmins = await prisma.user.findMany({
        where: {
            OR: [
                { role: 'superadmin' },
                { username: 'superadmin' }
            ]
        }
    });

    console.log('Found Superadmins:', JSON.stringify(superadmins, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
