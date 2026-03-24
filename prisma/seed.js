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
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            passwordHash: adminPassword,
            role: 'admin',
            fullName: 'Administrator',
            isAgent: false,
            isTechnician: false
        },
    });

    console.log(`✅ Admin user created: ${admin.username}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
