const { PrismaClient } = require('@prisma/client');
const { RouterOSAPI } = require('node-routeros');

const prisma = new PrismaClient();

async function sync() {
    console.log('Starting manual sync from Mikrotik...');
    try {
        // Get Admin/Owner
        const owner = await prisma.user.findFirst({ where: { role: 'superadmin' } }) ||
                      await prisma.user.findFirst({ where: { role: 'admin' } });
        
        if (!owner) {
            console.error('No owner found in DB');
            return;
        }

        const agentNumber = (owner.agentNumber && owner.agentNumber.trim() !== '') ? owner.agentNumber : '99';

        // Connect to Mikrotik
        const client = new RouterOSAPI({
            host: process.env.MIKROTIK_HOST || '192.168.88.1',
            user: process.env.MIKROTIK_USER || 'admin',
            password: process.env.MIKROTIK_PASSWORD || 'password',
            port: parseInt(process.env.MIKROTIK_PORT || '8728'),
            timeout: 10
        });

        await client.connect();
        const users = await client.write('/ppp/secret/print');
        await client.close();

        console.log(`Found ${users.length} users in Mikrotik.`);

        let currentSequence = 0;
        const lastCustomer = await prisma.customer.findFirst({
            where: { customerId: { startsWith: agentNumber } },
            orderBy: { customerId: 'desc' }
        });

        if (lastCustomer) {
            const seqPart = lastCustomer.customerId.substring(agentNumber.length);
            const seq = parseInt(seqPart);
            if (!isNaN(seq)) currentSequence = seq;
        }

        let imported = 0;
        for (const u of users) {
            const existing = await prisma.customer.findFirst({
                where: { username: u.name, ownerId: owner.id }
            });

            if (!existing) {
                currentSequence++;
                const customerId = `${agentNumber}${currentSequence.toString().padStart(5, '0')}`;
                
                await prisma.customer.create({
                    data: {
                        username: u.name,
                        customerId: customerId,
                        name: u.name,
                        ownerId: owner.id,
                        address: u.comment || '-',
                        phone: '-',
                        email: '-'
                    }
                });
                imported++;
            }
        }

        console.log(`Sync complete. Imported ${imported} new customers.`);
    } catch (e) {
        console.error('Sync failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

sync();
