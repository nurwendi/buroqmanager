const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking Mikrotik Configuration...');
    const setting = await prisma.systemSetting.findUnique({
        where: { key: 'mikrotik_config' }
    });

    if (!setting) {
        console.log('❌ No mikrotik_config found in database.');
        console.log('   The database was reset. You need to configure a router first.');
    } else {
        const config = JSON.parse(setting.value);
        console.log(`✅ Found configuration.`);
        console.log(`   Active Connection ID: ${config.activeConnectionId}`);
        console.log(`   Routers: ${config.connections?.length || 0}`);
        config.connections?.forEach(c => {
            console.log(`   - ${c.name} (${c.host})`);
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
