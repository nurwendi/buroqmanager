import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import { sendPaymentReceiptEmail } from '@/lib/email';

// Helper to calculate commissions in a single query
async function calculateCommissions(amount, username, ownerId = null) {
    const commissionsData = [];

    const where = { username };
    if (ownerId) {
        where.ownerId = ownerId;
    }

    const customer = await db.customer.findFirst({
        where,
        include: {
            agent: { select: { id: true, username: true, role: true, isAgent: true, agentRate: true } },
            technician: { select: { id: true, username: true, role: true, isTechnician: true, technicianRate: true } }
        }
    });

    if (customer) {
        const agent = customer.agent;
        const technician = customer.technician;

        // If the same staff member is assigned as both Sales (agent) and Technician (unified staff)
        if (agent && technician && agent.id === technician.id) {
            const unifiedRate = agent.agentRate > 0 ? agent.agentRate : (technician.technicianRate || 0);
            if ((agent.isAgent || agent.isTechnician || agent.role === 'staff') && unifiedRate > 0) {
                const commissionAmount = (amount * unifiedRate) / 100;
                commissionsData.push({
                    userId: agent.id,
                    username: agent.username,
                    role: 'agent',
                    rate: unifiedRate,
                    amount: commissionAmount
                });
            }
        } else {
            if (agent && (agent.isAgent || agent.role === 'staff') && agent.agentRate > 0) {
                const commissionAmount = (amount * agent.agentRate) / 100;
                commissionsData.push({
                    userId: agent.id,
                    username: agent.username,
                    role: 'agent',
                    rate: agent.agentRate,
                    amount: commissionAmount
                });
            }

            if (technician && (technician.isTechnician || technician.role === 'staff') && technician.technicianRate > 0) {
                const commissionAmount = (amount * technician.technicianRate) / 100;
                commissionsData.push({
                    userId: technician.id,
                    username: technician.username,
                    role: 'technician',
                    rate: technician.technicianRate,
                    amount: commissionAmount
                });
            }
        }
    }

    return commissionsData;
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const status = searchParams.get('status');
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');
    const limitParam = searchParams.get('limit');
    const user = await getUserFromRequest(request);

    if (!user) {
        return unauthorizedResponse();
    }

    let where = {};
    if (status) where.status = status;
    if (monthParam !== null && monthParam !== '' && !isNaN(parseInt(monthParam))) {
        where.month = parseInt(monthParam);
    }
    if (yearParam !== null && yearParam !== '' && !isNaN(parseInt(yearParam))) {
        where.year = parseInt(yearParam);
    }

    // Filter based on role
    if (user.role === 'customer') {
        const pppoeUser = user.pppoeUsername || user.username;
        where.username = pppoeUser;
        if (user.ownerId) where.ownerId = user.ownerId;
    } else if (user.role !== 'superadmin') {
        const ownerId = user.role === 'admin' ? user.id : user.ownerId;
        if (ownerId) where.ownerId = ownerId;

        const allowedUsernames = [];

        // Fetch user's assigned customers (either as agent or technician)
        if (['agent', 'technician', 'staff', 'editor'].includes(user.role)) {
            const staffCusts = await db.customer.findMany({
                where: {
                    OR: [
                        { agentId: user.id },
                        { technicianId: user.id }
                    ]
                },
                select: { username: true }
            });
            allowedUsernames.push(...staffCusts.map(c => c.username));
        }

        if (['agent', 'technician', 'staff'].includes(user.role)) {
            if (allowedUsernames.length > 0) {
                where.username = { in: allowedUsernames };
            } else {
                return NextResponse.json([]);
            }
        }
    }

    if (username) {
        // combine with existing filtered list if any
        if (where.username && where.username.in) {
            if (where.username.in.includes(username)) {
                where.username = username;
            } else {
                return NextResponse.json([]);
            }
        } else {
            where.username = username;
        }
    }

    const queryOptions = {
        where,
        include: { 
            commissions: {
                include: {
                    user: {
                        select: { fullName: true }
                    }
                }
            }
        },
        orderBy: { date: 'desc' }
    };

    if (limitParam && !isNaN(parseInt(limitParam))) {
        queryOptions.take = parseInt(limitParam);
    }

    const payments = await db.payment.findMany(queryOptions);

    const userNames = [...new Set(payments.map(p => p.username))];
    const customers = userNames.length > 0
        ? await db.customer.findMany({
            where: {
                username: { in: userNames },
                ...(where.ownerId ? { ownerId: where.ownerId } : {})
            },
            select: {
                username: true,
                name: true,
                customerId: true,
                phone: true,
                agent: { select: { username: true, fullName: true } },
                technician: { select: { username: true, fullName: true } }
            }
        })
        : [];
    
    const customerObjMap = new Map();
    customers.forEach(c => {
        customerObjMap.set(c.username, c);
    });

    const enrichedPayments = payments.map(p => {
        const agentComm = p.commissions.find(c => c.role === 'agent');
        const techComm = p.commissions.find(c => c.role === 'technician');
        const customer = customerObjMap.get(p.username);
        return {
            ...p,
            customerName: customer?.name || p.username,
            customerId: customer?.customerId || '-',
            customerPhone: customer?.phone || '',
            agentName: customer?.agent?.username || agentComm?.username || '-',
            agentFullName: agentComm?.user?.fullName || customer?.agent?.fullName || agentComm?.username || '-',
            technicianName: customer?.technician?.username || techComm?.username || '-'
        };
    });

    return NextResponse.json(enrichedPayments);
}

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || user.role === 'customer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();

        // Basic validation
        if (!body.username || !body.amount) {
            return NextResponse.json({ error: 'Username and amount are required' }, { status: 400 });
        }

        // Determine Owner Context
        const ownerId = user.role === 'admin' ? user.id : user.ownerId;

        // Calculate commissions
        const amount = Number(body.amount);
        const commissionsData = await calculateCommissions(amount, body.username, ownerId);

        // Generate Invoice Number if not present
        let invoiceNumber = body.invoiceNumber;
        const custWhere = { username: body.username };
        if (ownerId) custWhere.ownerId = ownerId;

        const customer = await db.customer.findFirst({ where: custWhere });

        if (!invoiceNumber) {
            const now = new Date();
            const yy = String(now.getFullYear()).slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, '0');



            // Sequence
            const currentYear = new Date().getFullYear();
            const count = await db.payment.count({
                where: { year: currentYear }
            });
            const seq = String(count + 1).padStart(6, '0');
            
            // Fix: Guarantee Customer ID or fallback to 'CUST'
            const custId = (customer?.customerId || 'CUST').replace(/\s+/g, '-');
            const invoiceNumberStr = `INV/${yy}/${mm}/${custId}/${seq}`;
            invoiceNumber = invoiceNumberStr;
        }

        // Strategy: Find pending invoice
        const targetMonth = body.month !== undefined ? parseInt(body.month) : null;
        const targetYear = body.year !== undefined ? parseInt(body.year) : null;

        let existingPayment = null;

        // Base payment where
        const paymentWhere = {
            username: body.username
        };
        if (ownerId) paymentWhere.ownerId = ownerId;

        if (targetMonth !== null && targetYear !== null) {
            existingPayment = await db.payment.findFirst({
                where: {
                    ...paymentWhere,
                    month: targetMonth,
                    year: targetYear
                }
            });
        }

        // If not found and no month/year, find recent pending
        if (!existingPayment && targetMonth === null) {
            // Find most recent pending
            existingPayment = await db.payment.findFirst({
                where: {
                    ...paymentWhere,
                    status: { not: 'completed' }
                },
                orderBy: { date: 'desc' }
            });
        }

        let paymentResult;

        if (existingPayment) {
            // Update
            paymentResult = await db.payment.update({
                where: { id: existingPayment.id },
                data: {
                    date: new Date(),
                    status: 'completed',
                    amount: amount,
                    method: body.method || existingPayment.method || 'cash',
                    notes: body.notes || existingPayment.notes,
                    commissions: {
                        deleteMany: {}, // replace commissions
                        create: commissionsData
                    }
                },
                include: { commissions: true }
            });
        } else {
            // Create
            paymentResult = await db.payment.create({
                data: {
                    invoiceNumber,
                    username: body.username,
                    amount: amount,
                    method: body.method || 'cash',
                    status: 'completed',
                    date: new Date(),
                    month: targetMonth !== null ? targetMonth : new Date().getMonth(),
                    year: targetYear !== null ? targetYear : new Date().getFullYear(),
                    notes: body.notes || '',
                    ownerId: customer?.ownerId || ownerId, // Set Owner
                    commissions: {
                        create: commissionsData
                    }
                },
                include: { commissions: true }
            });
        }

        // Send Notification
        try {
            const { sendNotification } = await import('@/lib/notifications-db');
            const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });
            const amountStr = currencyFormatter.format(Number(paymentResult.amount));
            
            await sendNotification({
                title: 'Pembayaran Berhasil',
                message: `Pembayaran sebesar ${amountStr} untuk Invoice ${paymentResult.invoiceNumber} telah diterima. Terima kasih!`,
                type: 'success',
                ownerId: paymentResult.ownerId,
                recipients: [{ customerId: customer?.id }]
            });
        } catch (notifError) {
            console.error('Failed to send payment notification:', notifError);
        }

        // Send Email

        if (customer && customer.email) {
            try {
                await sendPaymentReceiptEmail(customer.email, {
                    invoiceNumber: paymentResult.invoiceNumber,
                    customerName: customer.name,
                    amount: paymentResult.amount,
                    date: paymentResult.date
                });
            } catch (e) {
                console.error('Failed to send receipt email:', e);
            }
        }

        return NextResponse.json({ success: true, payment: paymentResult });
    } catch (error) {
        console.error('Payment Error:', error);
        return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
            return unauthorizedResponse();
        }

        const body = await request.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
        }

        const where = { id: { in: ids } };
        if (user.role !== 'superadmin') {
            where.ownerId = user.id;
        }

        const result = await db.payment.deleteMany({
            where
        });

        if (result.count === 0) {
            return NextResponse.json({ message: 'No payments found to delete' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: `Successfully deleted ${result.count} payments`
        });

    } catch (error) {
        console.error('Delete Error:', error);
        return NextResponse.json({ error: 'Failed to delete payments' }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager')) {
            return unauthorizedResponse();
        }

        const body = await request.json();
        const { ids, status } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
        }

        if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        const ownerFilter = user.role !== 'superadmin'
            ? { ownerId: user.role === 'admin' ? user.id : user.ownerId }
            : {};

        let updatedCount = 0;

        if (status === 'completed') {
            // Bulk Mark Paid - Batch fetch pending payments
            const payments = await db.payment.findMany({
                where: {
                    id: { in: ids },
                    status: { not: 'completed' },
                    ...ownerFilter
                },
                select: { id: true, amount: true, username: true, ownerId: true }
            });

            if (payments.length > 0) {
                const paymentIds = payments.map(p => p.id);
                const usernames = [...new Set(payments.map(p => p.username))];

                // Batch-fetch customers with their agent & technician rates in 1 query
                const customers = await db.customer.findMany({
                    where: {
                        username: { in: usernames },
                        ...ownerFilter
                    },
                    include: {
                        agent: { select: { id: true, username: true, role: true, isAgent: true, agentRate: true } },
                        technician: { select: { id: true, username: true, role: true, isTechnician: true, technicianRate: true } }
                    }
                });

                const customerMap = new Map(
                    customers.map(c => [`${c.ownerId || ''}:${c.username}`, c])
                );

                const allCommissionsToCreate = [];

                for (const payment of payments) {
                    const customer = customerMap.get(`${payment.ownerId || ''}:${payment.username}`)
                        || customers.find(c => c.username === payment.username);

                    if (customer) {
                        const agent = customer.agent;
                        if (agent && (agent.isAgent || agent.role === 'staff') && agent.agentRate > 0) {
                            allCommissionsToCreate.push({
                                paymentId: payment.id,
                                userId: agent.id,
                                username: agent.username,
                                role: 'agent',
                                rate: agent.agentRate,
                                amount: (payment.amount * agent.agentRate) / 100
                            });
                        }

                        const technician = customer.technician;
                        if (technician && (technician.isTechnician || technician.role === 'staff') && technician.technicianRate > 0) {
                            allCommissionsToCreate.push({
                                paymentId: payment.id,
                                userId: technician.id,
                                username: technician.username,
                                role: 'technician',
                                rate: technician.technicianRate,
                                amount: (payment.amount * technician.technicianRate) / 100
                            });
                        }
                    }
                }

                await db.$transaction([
                    db.payment.updateMany({
                        where: { id: { in: paymentIds } },
                        data: { status: 'completed', date: new Date() }
                    }),
                    db.commission.deleteMany({
                        where: { paymentId: { in: paymentIds } }
                    }),
                    ...(allCommissionsToCreate.length > 0
                        ? [db.commission.createMany({ data: allCommissionsToCreate })]
                        : [])
                ]);

                updatedCount = payments.length;
            }
        } else {
            // Normal update (e.g. to 'pending' or 'cancelled')
            const result = await db.payment.updateMany({
                where: { id: { in: ids }, ...ownerFilter },
                data: { status: status }
            });
            updatedCount = result.count;
        }

        return NextResponse.json({
            success: true,
            updatedCount,
            message: `Successfully processed ${updatedCount} payments`
        });

    } catch (error) {
        console.error('Update Error:', error);
        return NextResponse.json({ error: 'Failed to update payments' }, { status: 500 });
    }
}
