
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const customers = await prisma.customer.count();
  
  console.log(`Total Users: ${users}`);
  console.log(`Total Customers: ${customers}`);
  
  const customerSummary = await prisma.customer.groupBy({
    by: ['ownerId', 'agentId', 'technicianId'],
    _count: {
      id: true
    }
  });
  
  console.log('Customer Assignment Summary:');
  console.log(JSON.stringify(customerSummary, null, 2));
  
  const superadmins = await prisma.user.findMany({ where: { role: 'superadmin' }, select: { id: true, username: true } });
  const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true, username: true } });
  
  console.log('Superadmins:', superadmins);
  console.log('Admins:', admins);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
