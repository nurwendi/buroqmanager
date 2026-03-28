const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allSettings = await prisma.systemSetting.findMany();
  console.log('All Settings:', allSettings);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
