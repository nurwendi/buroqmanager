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
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ownerId = currentUser.role === 'admin' ? currentUser.id : null;
        const customersWhere = {};
        if (ownerId) customersWhere.ownerId = ownerId;

        const customers = await db.customer.findMany({
            where: customersWhere,
            select: { username: true, customerId: true, name: true }
        });

        const customerMap = customers.reduce((acc, c) => {
            acc[c.username] = c;
            return acc;
        }, {});

        // 1. Fetch all payments for the period
        const where = { month, year };
        if (ownerId) where.ownerId = ownerId;

        const payments = await db.payment.findMany({
            where,
            include: {
                commissions: true,
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

            if (p.status === 'completed') {
                totalRevenue += amount;

                // Method breakdown
                const method = p.method || 'cash';
                methodBreakdown[method] = (methodBreakdown[method] || 0) + amount;

                // Commissions
                for (const c of p.commissions) {
                    totalCommissions += c.amount;

                    if (!staffBreakdown[c.userId]) {
                        staffBreakdown[c.userId] = {
                            id: c.userId,
                            name: c.username,
                            commission: 0,
                            revenue: 0,
                            count: 0
                        };
                    }
                    staffBreakdown[c.userId].commission += c.amount;
                    staffBreakdown[c.userId].revenue += amount;
                    staffBreakdown[c.userId].count += 1;
                }
            } else if (p.status === 'pending') {
                totalUnpaid += amount;
            }
        }

        // Determine top customers (optional, based on recent payments)
        const topCustomers = Object.entries(
            payments
                .filter(p => p.status === 'completed')
                .reduce((acc, p) => {
                    acc[p.username] = (acc[p.username] || 0) + p.amount;
                    return acc;
                }, {})
        )
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([username, total]) => ({ username, total }));

        const ownerName = payments.find(p => p.owner)?.owner?.fullName ||
            payments.find(p => p.owner)?.owner?.username ||
            (currentUser.role === 'admin' ? currentUser.fullName || currentUser.username : 'Global');

        return NextResponse.json({
            ownerName,
            summary: {
                totalRevenue,
                totalUnpaid,
                totalCommissions,
                netIncome: totalRevenue - totalCommissions
            },
            methodBreakdown,
            staffBreakdown: Object.values(staffBreakdown),
            topCustomers,
            allPayments: payments.map(p => {
                const customer = customerMap[p.username] || {};
                return {
                    id: p.id,
                    username: p.username,
                    customerNumber: customer.customerId || '-',
                    customerName: customer.name || p.username,
                    amount: p.amount,
                    method: p.method,
                    status: p.status,
                    date: p.date,
                    description: p.description,
                    agentName: p.commissions[0]?.username || '-'
                };
            })
        });

    } catch (error) {
        console.error('Financial Report API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
