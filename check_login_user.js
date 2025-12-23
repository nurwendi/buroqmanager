const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const loginUsername = '10100010'; // The ID they presumably log in with
    console.log(`Checking db.user for username: ${loginUsername}`);

    const user = await prisma.user.findUnique({
        where: { username: loginUsername }
    });

    if (user) {
        console.log('Found User:', user);
    } else {
        console.log('User NOT FOUND in db.user');
    }

    // Also verify db.customer mapping again just to be safe
    const customer = await prisma.customer.findFirst({
        where: { customerId: loginUsername }
    });
    if (customer) {
        console.log('Mappings to db.customer -> username:', customer.username);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
