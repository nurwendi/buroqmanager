const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const username = 'tes123';
    console.log(`Deleting zombie user: ${username}`);

    try {
        await prisma.user.delete({ where: { username } });
        console.log('User deleted successfully.');
    } catch (e) {
        console.error('Delete failed:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
