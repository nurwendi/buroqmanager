const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  try {
    const users = await prisma.user.findMany({ select: { username: true, role: true } });
    const customers = await prisma.customer.findMany({ select: { customerId: true, username: true }, take: 5 });
    console.log('Users:', users);
    console.log('Customers (first 5):', customers);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
check();
