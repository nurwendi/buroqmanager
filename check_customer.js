const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const customerId = '10100010';
    console.log(`Checking for customerId: ${customerId}`);

    const customer = await prisma.customer.findFirst({
        where: { customerId: customerId }
    });

    if (customer) {
        console.log('Found Customer:', customer);
    } else {
        console.log('Customer NOT FOUND');
        // List some customers to see what IDs look like
        const all = await prisma.customer.findMany({ take: 5 });
        console.log('Sample Customers:', all);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
