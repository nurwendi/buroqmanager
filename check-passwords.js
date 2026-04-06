const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function check() {
  try {
    const users = await prisma.user.findMany();
    for (const user of users) {
      const isSuperadminMatch = await bcrypt.compare('superadmin', user.passwordHash);
      const isSuperadminPasswordMatch = await bcrypt.compare('superadminpassword', user.passwordHash);
      console.log(`User: ${user.username}, Role: ${user.role}`);
      console.log(`  Password 'superadmin' match: ${isSuperadminMatch}`);
      console.log(`  Password 'superadminpassword' match: ${isSuperadminPasswordMatch}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
check();
