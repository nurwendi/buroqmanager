const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate(oldPrefix, newPrefix) {
    if (!oldPrefix || !newPrefix) {
        console.log("\n🚀 Buroq Customer ID Migration Tool");
        console.log("=====================================");
        console.log("Usage: node scripts/migrate-customer-ids.js <oldPrefix> <newPrefix>");
        console.log("Example: node scripts/migrate-customer-ids.js 999 99\n");
        process.exit(1);
    }

    console.log(`\n🔍 Searching for customers starting with prefix: '${oldPrefix}'...`);

    try {
        const customers = await prisma.customer.findMany({
            where: {
                customerId: { startsWith: oldPrefix }
            }
        });

        if (customers.length === 0) {
            console.log(`❌ No customers found with prefix '${oldPrefix}'.`);
            return;
        }

        console.log(`✅ Found ${customers.length} customers to update.`);
        console.log(`🔄 Migrating to new prefix: '${newPrefix}'...\n`);

        let updatedCount = 0;
        for (const customer of customers) {
            // Keep the numeric sequence at the end
            const sequence = customer.customerId.substring(oldPrefix.length);
            const newId = `${newPrefix}${sequence}`;
            
            process.stdout.write(`   Updating ${customer.username}: ${customer.customerId} -> ${newId} ... `);
            
            await prisma.customer.update({
                where: { id: customer.id },
                data: { customerId: newId }
            });
            
            process.stdout.write("DONE\n");
            updatedCount++;
        }

        console.log(`\n✨ Successfully migrated ${updatedCount} customers.`);
        console.log("   New IDs are now in effect.\n");

    } catch (error) {
        console.error("\n💥 Error during migration:", error.message);
    }
}

// Run the migration
const args = process.argv.slice(2);
migrate(args[0], args[1])
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
