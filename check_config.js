
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.systemSetting.findUnique({ where: { key: 'mikrotik_config' } });
  if (settings) {
    const config = JSON.parse(settings.value);
    console.log('Mikrotik Config:');
    console.log(JSON.stringify(config, null, 2));
  } else {
    console.log('No mikrotik_config found in Database.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
