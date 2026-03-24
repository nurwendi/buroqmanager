const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    const hashedPassword = await bcrypt.hash('superadminpassword', 10);

    // Create Superadmin
    const superadmin = await prisma.user.upsert({
        where: { username: 'superadmin' },
        update: {},
        create: {
            username: 'superadmin',
            passwordHash: hashedPassword,
            role: 'superadmin',
            fullName: 'Super Administrator',
            isAgent: false,
            isTechnician: false
        },
    });

    console.log(`✅ Superadmin user created: ${superadmin.username}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
