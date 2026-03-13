const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CUSTOMER_FILE = path.join(process.cwd(), 'customer-data.json');
const PAYMENTS_FILE = path.join(process.cwd(), 'billing-payments.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

async function migrate() {
    console.log('Starting migration...');

    // 1. Migrate Users
    if (fs.existsSync(USERS_FILE)) {
        console.log('Migrating Users...');
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        for (const user of users) {
            try {
                await prisma.user.upsert({
                    where: { username: user.username },
                    update: {},
                    create: {
                        id: user.id || undefined,
                        username: user.username,
                        passwordHash: user.passwordHash,
                        role: user.role,
                        isTechnician: user.isTechnician || false,
                        isAgent: user.role === 'agent',
                        agentRate: Number(user.agentRate) || 0,
                        technicianRate: Number(user.technicianRate) || 0,
                        prefix: user.prefix || '',
                        fullName: user.fullName || '',
                        phone: user.phone || '',
                        address: user.address || '',
                        agentNumber: user.agentNumber || '',
                        createdAt: user.createdAt ? new Date(user.createdAt) : undefined
                    }
                });
            } catch (e) {
                console.error(`Failed to migrate user ${user.username}:`, e);
            }
        }
    }

    // 2. Migrate Customers
    if (fs.existsSync(CUSTOMER_FILE)) {
        console.log('Migrating Customers...');
        const customers = JSON.parse(fs.readFileSync(CUSTOMER_FILE, 'utf8'));
        for (const [username, data] of Object.entries(customers)) {
            try {
                // Check if agent/tech exists
                let agentId = data.agentId;
                let technicianId = data.technicianId;

                if (agentId) {
                    const agent = await prisma.user.findUnique({ where: { id: agentId } });
                    if (!agent) agentId = null;
                }
                if (technicianId) {
                    const tech = await prisma.user.findUnique({ where: { id: technicianId } });
                    if (!tech) technicianId = null;
                }

                await prisma.customer.upsert({
                    where: { username },
                    update: {},
                    create: {
                        username: username,
                        name: data.name || '',
                        address: data.address || '',
                        phone: data.phone || '',
                        email: data.email || '',
                        customerNumber: data.customerNumber,
                        agentId: agentId,
                        technicianId: technicianId,
                        updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
                    }
                });
            } catch (e) {
                console.error(`Failed to migrate customer ${username}:`, e);
            }
        }
    }

    // 3. Migrate Payments
    if (fs.existsSync(PAYMENTS_FILE)) {
        console.log('Migrating Payments...');
        const payments = JSON.parse(fs.readFileSync(PAYMENTS_FILE, 'utf8'));
        for (const p of payments) {
            try {
                const date = new Date(p.date || new Date());
                const month = p.month !== undefined ? parseInt(p.month) : date.getMonth();
                const year = p.year !== undefined ? parseInt(p.year) : date.getFullYear();

                const payment = await prisma.payment.upsert({
                    where: { invoiceNumber: p.invoiceNumber },
                    update: {},
                    create: {
                        id: p.id || undefined,
                        invoiceNumber: p.invoiceNumber,
                        username: p.username,
                        amount: Number(p.amount) || 0,
                        method: p.method || 'cash',
                        status: p.status || 'pending',
                        date: date,
                        month: month,
                        year: year,
                        notes: p.notes || ''
                    }
                });

                // Commissions
                if (p.commissions && Array.isArray(p.commissions)) {
                    for (const c of p.commissions) {
                        // verify user exists
                        const userExists = await prisma.user.findUnique({ where: { id: c.userId } });
                        if (userExists) {
                            await prisma.commission.create({
                                data: {
                                    paymentId: payment.id,
                                    userId: c.userId,
                                    username: c.username,
                                    role: c.role,
                                    rate: Number(c.rate),
                                    amount: Number(c.amount)
                                }
                            });
                        }
                    }
                }
            } catch (e) {
                console.error(`Failed to migrate payment ${p.invoiceNumber}:`, e);
            }
        }
    }

    // 4. Migrate Logs
    if (fs.existsSync(LOGS_FILE)) {
        console.log('Migrating Logs...');
        const logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));

        for (const n of logs) {
            try {
                await prisma.log.create({
                    data: {
                        mikrotikId: n['.id'],
                        time: n.time,
                        message: n.message,
                        username: n.username,
                        status: n.status
                    }
                });
            } catch (e) {
                // ignore dupes or errors
            }
        }
    }

    console.log('Migration completed!');
}

migrate()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
