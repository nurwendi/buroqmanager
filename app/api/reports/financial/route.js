import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get('month'));
        const year = parseInt(searchParams.get('year'));

        if (isNaN(month) || isNaN(year)) {
            return NextResponse.json({ error: 'Month and Year are required' }, { status: 400 });
        }

        const currentUser = await getUserFromRequest(request);
        const isAgent = currentUser?.role === 'staff' || currentUser?.role === 'agent' || currentUser?.isAgent;
        const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

        if (!currentUser || (!isAgent && !isAdmin)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ownerId = isAdmin ? (currentUser.role === 'admin' ? currentUser.id : null) : null;
        const agentId = isAgent ? currentUser.id : null;

        const customersWhere = {};
        if (ownerId) customersWhere.ownerId = ownerId;
        if (agentId) customersWhere.agentId = agentId;

        const customers = await db.customer.findMany({
            where: customersWhere,
            select: { username: true, customerId: true, name: true, agentId: true }
        });

        const customerMap = customers.reduce((acc, c) => {
            acc[c.username] = c;
            return acc;
        }, {});

        // 1. Fetch all payments for the period
        const where = { month, year };
        if (ownerId) where.ownerId = ownerId;
        
        // If agent, we primarily care about payments where they are the agent
        // or payments linked to their customers.
        if (agentId) {
            where.OR = [
                { commissions: { some: { userId: agentId } } },
                { username: { in: customers.map(c => c.username) } }
            ];
        }

        const payments = await db.payment.findMany({
            where,
            include: {
                commissions: {
                    include: {
                        user: {
                            select: { fullName: true }
                        }
                    }
                },
                owner: {
                    select: { username: true, fullName: true }
                }
            }
        });

        // 2. Aggregate Data
        let totalRevenue = 0;
        let totalUnpaid = 0;
        let totalCommissions = 0;
        const methodBreakdown = {};
        const staffBreakdown = {};

        for (const p of payments) {
            const amount = parseFloat(p.amount);
            const isCompleted = p.status === 'completed';

            // Don't include EXPENSE in financial revenue logic
            if (p.method === 'EXPENSE' || p.method === 'expense') continue;

            if (isCompleted) {
                totalRevenue += amount;
                const method = p.method || 'cash';
                methodBreakdown[method] = (methodBreakdown[method] || 0) + amount;

                // Track users counted for this payment to avoid double revenue/count
                const usersCounted = new Set();

                // Commissions
                for (const c of p.commissions) {
                    // If viewing as agent, we only sum OUR commissions for the "Total Expenses" field?
                    // Actually, for an agent report, totalRevenue is the gross from their customers,
                    // and totalCommissions should be what THEY earned.
                    if (agentId && c.userId !== agentId) continue;
                    
                    const commAmount = Number(c.amount);
                    totalCommissions += commAmount;

                    if (!staffBreakdown[c.userId]) {
                        staffBreakdown[c.userId] = {
                            id: c.userId,
                            name: c.user?.fullName || c.username,
                            commission: 0,
                            revenue: 0,
                            count: 0
                        };
                    }
                    staffBreakdown[c.userId].commission += commAmount;

                    if (!usersCounted.has(c.userId)) {
                        staffBreakdown[c.userId].revenue += amount;
                        staffBreakdown[c.userId].count += 1;
                        usersCounted.add(c.userId);
                    }
                }
            } else if (p.status === 'pending') {
                totalUnpaid += amount;
            }
        }

        const ownerName = isAgent ? (currentUser.fullName || currentUser.username) :
            (payments.find(p => p.owner)?.owner?.fullName ||
             payments.find(p => p.owner)?.owner?.username ||
             (currentUser.role === 'admin' ? currentUser.fullName || currentUser.username : 'Global'));

        return NextResponse.json({
            ownerName,
            isAgentView: !!isAgent,
            summary: {
                totalRevenue,
                totalUnpaid,
                totalCommissions,
                netIncome: isAgent ? totalCommissions : (totalRevenue - totalCommissions)
            },
            methodBreakdown,
            staffBreakdown: isAgent ? [] : Object.values(staffBreakdown),
            allPayments: payments.map(p => {
                const customer = customerMap[p.username] || {};
                return {
                    id: p.id,
                    invoiceNumber: p.invoiceNumber,
                    username: p.username,
                    customerNumber: customer.customerId || '-',
                    customerName: customer.name || p.username,
                    amount: p.amount,
                    method: p.method,
                    status: p.status,
                    date: p.date,
                    description: p.description,
                    agentName: p.commissions.find(c => c.role === 'agent')?.user?.fullName || p.commissions.find(c => c.role === 'agent')?.username || '-'
                };
            })
        });

    } catch (error) {
        console.error('Financial Report API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
