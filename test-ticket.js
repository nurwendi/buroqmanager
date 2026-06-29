const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ticket = await prisma.ticket.findFirst();
    if (!ticket) {
        console.log("No ticket found.");
        return;
    }
    console.log("Found ticket:", ticket.id);
    
    // Fetch messages
    const messages = await prisma.ticketMessage.findMany({
        where: { ticketId: ticket.id }
    });
    console.log("Messages count:", messages.length);
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
