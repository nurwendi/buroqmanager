const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting database reset (preserving superadmin)...');

    // Use a transaction to ensure all or nothing
    await prisma.$transaction(async (tx) => {
        // 1. Delete dependent tables first (Child records)
        // Commissions depend on Payment and User
        const deletedCommissions = await tx.commission.deleteMany({});
        console.log(`Deleted ${deletedCommissions.count} Commissions`);

        // Payments depend on User (owner) - but not Customer (username string only)
        const deletedPayments = await tx.payment.deleteMany({});
        console.log(`Deleted ${deletedPayments.count} Payments`);

        // Notifications
        const deletedNotifications = await tx.notification.deleteMany({});
        console.log(`Deleted ${deletedNotifications.count} Notifications`);

        // Registrations
        const deletedRegistrations = await tx.registration.deleteMany({});
        console.log(`Deleted ${deletedRegistrations.count} Registrations`);

        // 2. Delete Customers (depend on User as owner/agent/tech)
        const deletedCustomers = await tx.customer.deleteMany({});
        console.log(`Deleted ${deletedCustomers.count} Customers`);

        // 3. Delete System Metrics and Settings
        const deletedMetrics = await tx.systemMetric.deleteMany({});
        console.log(`Deleted ${deletedMetrics.count} SystemMetrics`);

        const deletedSettings = await tx.systemSetting.deleteMany({});
        console.log(`Deleted ${deletedSettings.count} SystemSettings`);

        // 4. Delete Users EXCEPT superadmin
        // We strictly identify superadmin by username 'superadmin' as verified
        const deletedUsers = await tx.user.deleteMany({
            where: {
                username: {
                    not: 'superadmin'
                }
            }
        });
        console.log(`Deleted ${deletedUsers.count} Users (kept superadmin)`);
    });

    console.log('Database reset complete.');
}

main()
    .catch((e) => {
        console.error('Error during reset:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
