const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Reading mikrotik_config from SystemSetting...');

    const setting = await prisma.systemSetting.findUnique({
        where: { key: 'mikrotik_config' }
    });

    if (setting) {
        console.log('Value found:');
        const config = JSON.parse(setting.value);
        console.log(JSON.stringify(config, null, 2));
    } else {
        console.log('No mikrotik_config found in database.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
