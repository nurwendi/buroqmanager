import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/api-auth';
import { sendPaymentReceiptEmail } from '@/lib/email';

// Helper to calculate commissions
async function calculateCommissions(amount, username, ownerId = null) {
    const commissionsData = [];

    // Use findFirst because username is not unique globally anymore
    const where = { username };
    if (ownerId) {
        where.ownerId = ownerId;
    }

    const customer = await db.customer.findFirst({ where });

    if (customer) {
        if (customer.agentId) {
            const agent = await db.user.findUnique({ where: { id: customer.agentId } });
            // Allow if isAgent is true OR role is 'staff' (so staff acting as agent get commission)
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
        }

        if (customer.technicianId) {
            const technician = await db.user.findUnique({ where: { id: customer.technicianId } });
            // Allow if isTechnician is true OR role is 'staff'
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
    const user = await getUserFromRequest(request);

    let where = {};

    // Filter based on role
    if (user && user.role !== 'superadmin') {
        const ownerId = user.role === 'admin' ? user.id : user.ownerId;
        if (ownerId) where.ownerId = ownerId;

        // Further Staff Restrictions (Agent/Tech view ONLY their customers??)
        // Original code Logic:
        // if user.role != 'admin' -> it did logic to find allowedUsernames.
        // We should KEEP that logic for Agent/Staff, but ALSO limit by ownerId.
    }

    if (user && user.role !== 'admin' && user.role !== 'superadmin') {
        const allowedUsernames = [];

        // Fetch user's assigned customers
        if (user.role === 'agent' || user.role === 'staff' || user.role === 'editor') {
            const agentCusts = await db.customer.findMany({
                where: { agentId: user.id },
                select: { username: true }
            });
            allowedUsernames.push(...agentCusts.map(c => c.username));
        }

        if (user.role === 'technician') {
            const techCusts = await db.customer.findMany({
                where: { technicianId: user.id },
                select: { username: true }
            });
            allowedUsernames.push(...techCusts.map(c => c.username));
        }

        if (allowedUsernames.length > 0) {
            where.username = { in: allowedUsernames };
        } else if (!user.ownerId) {
            // If legacy staff has no owner?? nothing.
            return NextResponse.json([]);
        }
    }

    // ... filtering by username param ...

    // POST Logic for Owner Assignment
    // Inside POST function...
    // const customer = await db.customer.findMany({ where: { username: body.username } }); // Changed to findMany likely if ambiguous? No logic here is comments.

    // ...
    // data: {
    //    ownerId: customer?.ownerId,
    //    ...
    // }

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

    const payments = await db.payment.findMany({
        where,
        include: { commissions: true },
        orderBy: { date: 'desc' }
    });

    return NextResponse.json(payments);
}

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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



            const custNumber = customer?.customerId || '0000';

            // Sequence
            const count = await db.payment.count();
            const seq = String(count + 1).padStart(4, '0');
            invoiceNumber = `INV/${yy}/${mm}/${custNumber}/${seq}`;
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

        // Inject Notification
        try {
            const { addNotification } = await import('@/lib/notifications-db');
            const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });
            const notifMessage = `"System" : Payment of ${currencyFormatter.format(Number(paymentResult.amount))} for Invoice ${paymentResult.invoiceNumber} received.`;
            // Owner aware notification? Notification DB likely needs ownerId too, but keeping it simple for now
            await addNotification(notifMessage, { username: paymentResult.username });
        } catch (notifError) {
            console.error('Failed to add payment notification:', notifError);
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
        const body = await request.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
        }

        const result = await db.payment.deleteMany({
            where: { id: { in: ids } }
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
        const body = await request.json();
        const { ids, status } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
        }

        if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        let updatedCount = 0;

        if (status === 'completed') {
            // Bulk Mark Paid - Needs commission calculation
            // Fetch all payments first
            const payments = await db.payment.findMany({
                where: { id: { in: ids } }
            });

            for (const payment of payments) {
                // Determine if we should process it
                // We process if it's not completed OR if we want to ensure commissions are present?
                // Standard behavior: Only update pending to completed.
                // Re-calculating completed ones might be risky if already paid out.
                if (payment.status !== 'completed') {
                    // Use payment.ownerId if available to scope commission calc
                    const commissionsData = await calculateCommissions(payment.amount, payment.username, payment.ownerId);

                    await db.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: status,
                            date: new Date(), // Update payment date to now
                            commissions: {
                                deleteMany: {},
                                create: commissionsData
                            }
                        }
                    });
                    updatedCount++;
                }
            }
        } else {
            // Normal update (e.g. to 'pending' or 'cancelled')
            const result = await db.payment.updateMany({
                where: { id: { in: ids } },
                data: { status: status }
            });
            updatedCount = result.count;
        }

        return NextResponse.json({
            success: true,
            message: `Successfully processed payments`
        });

    } catch (error) {
        console.error('Update Error:', error);
        return NextResponse.json({ error: 'Failed to update payments' }, { status: 500 });
    }
}
