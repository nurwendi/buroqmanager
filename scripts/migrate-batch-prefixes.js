const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MAPPING = {
    "101": "11",
    "102": "12",
    "103": "13",
    "104": "14",
    "105": "15"
};

async function migrateBatch() {
    console.log("\n🚀 Buroq Batch Prefix Migration (101-105 -> 11-15)");
    console.log("==================================================\n");

    for (const [oldPrefix, newPrefix] of Object.entries(MAPPING)) {
        console.log(`📡 Processing Prefix Group: [${oldPrefix}] -> [${newPrefix}]`);

        // 1. Update Users (Owners)
        const updatedUsers = await prisma.user.updateMany({
            where: { agentNumber: oldPrefix },
            data: { agentNumber: newPrefix }
        });
        if (updatedUsers.count > 0) {
            console.log(`   ✅ Updated ${updatedUsers.count} Owner(s).`);
        }

        // 2. Update Customers
        const customers = await prisma.customer.findMany({
            where: { customerId: { startsWith: oldPrefix } }
        });

        if (customers.length > 0) {
            console.log(`   ✅ Found ${customers.length} Customers. Updating...`);
            for (const customer of customers) {
                const sequence = customer.customerId.substring(oldPrefix.length);
                const newId = `${newPrefix}${sequence}`;
                
                await prisma.customer.update({
                    where: { id: customer.id },
                    data: { customerId: newId }
                });
            }
            console.log(`   ✨ All ${customers.length} customers updated for this group.`);
        } else {
            console.log(`   ℹ️ No customers found for prefix '${oldPrefix}'.`);
        }
        console.log("--------------------------------------------------\n");
    }

    console.log("✨ Batch migration complete.\n");
}

migrateBatch()
    .catch(e => console.error("💥 Error:", e.message))
    .finally(() => prisma.$disconnect());
