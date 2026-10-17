import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/api-auth';


export async function GET(request) {
    try {
        const currentUser = await getUserFromRequest(request);
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('connectionId');
        const { getConfig } = await import('@/lib/config');
        const config = await getConfig();
        
        // Determine effective connection/owner
        let effectiveConnectionId = connectionId;
        let customerWhere = {};

        if (!effectiveConnectionId && currentUser.ownerId) {
            const ownerConn = config.connections?.find(c => c.ownerId === currentUser.ownerId);
            if (ownerConn) effectiveConnectionId = ownerConn.id;
        }

        if (!effectiveConnectionId && currentUser.role === 'superadmin' && config.connections?.length > 0) {
            effectiveConnectionId = config.connections[0].id; // Default to first if none selected
        }

        const role = String(currentUser.role || '').toLowerCase();
        
        // IMPORTANT: For admin role, Customer.ownerId = admin's own id (currentUser.id).
        // currentUser.ownerId points to the superadmin parent — NOT the admin themselves.
        // For staff/agent roles, ownerId correctly points to their admin owner.
        const effectiveOwnerId = role === 'admin'
            ? currentUser.id
            : (currentUser.ownerId || currentUser.id);

        // Apply filtering for Customers
        if (role === 'admin') {
            customerWhere = { ownerId: effectiveOwnerId };
        } else if (role === 'manager' && currentUser.ownerId) {
            customerWhere = { ownerId: currentUser.ownerId };
        } else if (role === 'technician') {
            customerWhere = { technicianId: currentUser.id, ownerId: currentUser.ownerId };
        } else if (['agent', 'partner', 'staff', 'editor'].includes(role)) {
            customerWhere = { agentId: currentUser.id, ownerId: currentUser.ownerId };
        } else if (role === 'superadmin') {
            const activeConnection = config.connections?.find(c => c.id === effectiveConnectionId);
            if (activeConnection && activeConnection.ownerId) {
                customerWhere = { ownerId: activeConnection.ownerId };
            } else {
                customerWhere = {};
            }
        } else {
            customerWhere = { ownerId: effectiveOwnerId || 'impossible_id' };
        }

        const isAgentRole = ['agent', 'partner', 'staff', 'editor'].includes(role);
        let paymentWhere = {};

        if (role !== 'superadmin') {
            if (isAgentRole) {
                const myCustomers = await db.customer.findMany({
                    where: customerWhere,
                    select: { username: true }
                });
                const allowedUsernames = myCustomers.map(c => c.username);
                paymentWhere = {
                    OR: [
                        { username: { in: allowedUsernames } },
                        { commissions: { some: { userId: currentUser.id } } }
                    ],
                    ownerId: currentUser.ownerId
                };
            } else if (role === 'admin' || role === 'manager') {
                paymentWhere = {
                    ownerId: role === 'manager' && currentUser.ownerId ? currentUser.ownerId : effectiveOwnerId
                };
            } else {
                const myCustomers = await db.customer.findMany({
                    where: customerWhere,
                    select: { username: true }
                });
                const allowedUsernames = myCustomers.map(c => c.username);
                paymentWhere = {
                    username: { in: allowedUsernames },
                    ownerId: effectiveOwnerId
                };
            }
        } else {
            const activeConnection = config.connections?.find(c => c.id === effectiveConnectionId);
            if (activeConnection && activeConnection.ownerId) {
                paymentWhere.ownerId = activeConnection.ownerId;
            }
        }

        // Use Asia/Jakarta timezone for date calculations
        const now = new Date();
        const dFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric', month: 'numeric', day: 'numeric' });
        const parts = dFmt.formatToParts(now);
        const currentMonth = parseInt(parts.find(p => p.type === 'month').value) - 1;
        const currentYear = parseInt(parts.find(p => p.type === 'year').value);
        const currentDay = parseInt(parts.find(p => p.type === 'day').value);

        // Today boundaries in Asia/Jakarta (+07:00)
        const todayStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}T00:00:00+07:00`;
        const todayStart = new Date(todayStartStr);
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        // 6-month chart target months
        const targetMonths = [];
        for (let i = 5; i >= 0; i--) {
            const targetDate = new Date(now);
            targetDate.setMonth(now.getMonth() - i);
            const tParts = dFmt.formatToParts(targetDate);
            const tMonth = parseInt(tParts.find(px => px.type === 'month').value) - 1;
            const tYear = parseInt(tParts.find(px => px.type === 'year').value);
            const monthName = targetDate.toLocaleString('id-ID', { month: 'short' });
            targetMonths.push({ month: tMonth, year: tYear, name: monthName });
        }

        const thisMonthWhere = {
            ...paymentWhere,
            status: 'completed',
            method: { not: 'EXPENSE' },
            month: currentMonth,
            year: currentYear
        };

        const [
            totalRevAgg,
            todaysRevAgg,
            thisMonthRevAgg,
            staffCommAgg,
            myCommAgg,
            pendingAgg,
            totalTxCount,
            recentPayments,
            totalCustomersCount,
            ...chartMonthAggs
        ] = await Promise.all([
            db.payment.aggregate({
                _sum: { amount: true },
                where: { ...paymentWhere, status: 'completed' }
            }),
            db.payment.aggregate({
                _sum: { amount: true },
                where: {
                    ...paymentWhere,
                    status: 'completed',
                    date: { gte: todayStart, lt: todayEnd }
                }
            }),
            db.payment.aggregate({
                _sum: { amount: true },
                where: thisMonthWhere
            }),
            db.commission.aggregate({
                _sum: { amount: true },
                where: { payment: thisMonthWhere }
            }),
            db.commission.aggregate({
                _sum: { amount: true },
                where: { userId: currentUser.id, payment: thisMonthWhere }
            }),
            db.payment.aggregate({
                _sum: { amount: true },
                _count: { _all: true },
                where: { ...paymentWhere, status: 'pending' }
            }),
            db.payment.count({ where: paymentWhere }),
            db.payment.findMany({
                where: { ...paymentWhere, status: 'completed' },
                orderBy: { date: 'desc' },
                take: 5,
                select: {
                    id: true,
                    invoiceNumber: true,
                    username: true,
                    amount: true,
                    date: true,
                    method: true,
                    notes: true
                }
            }),
            db.customer.count({ where: customerWhere }),
            ...targetMonths.map(tm =>
                db.payment.aggregate({
                    _sum: { amount: true },
                    where: {
                        ...paymentWhere,
                        status: 'completed',
                        month: tm.month,
                        year: tm.year
                    }
                })
            )
        ]);

        const totalRevenue = Number(totalRevAgg._sum.amount || 0);
        const todaysRevenue = Number(todaysRevAgg._sum.amount || 0);
        const grossRevenue = Number(thisMonthRevAgg._sum.amount || 0);
        const staffCommission = Number(staffCommAgg._sum.amount || 0);
        const myCommission = Number(myCommAgg._sum.amount || 0);
        const netRevenue = grossRevenue - staffCommission;
        const thisMonthRevenue = grossRevenue;
        const pendingCount = pendingAgg._count._all || 0;
        const totalUnpaid = Number(pendingAgg._sum.amount || 0);

        const monthlyRevenue = targetMonths.map((tm, idx) => ({
            name: tm.name,
            revenue: Number(chartMonthAggs[idx]?._sum?.amount || 0)
        }));

        // Fetch customer names for these 5 recent payments
        const recentUsernames = [...new Set(recentPayments.map(p => p.username))];
        const recentCustomers = recentUsernames.length > 0
            ? await db.customer.findMany({
                where: { username: { in: recentUsernames } },
                select: { username: true, name: true }
            })
            : [];
        const customerMap = recentCustomers.reduce((acc, curr) => {
            acc[curr.username] = curr.name;
            return acc;
        }, {});

        const recentTransactions = recentPayments.map(p => ({
            id: p.id,
            invoiceNumber: p.invoiceNumber,
            customerName: String(customerMap[p.username] || p.username || 'Unknown Customer'),
            amount: Number(p.amount),
            date: p.date,
            method: p.method || 'cash',
            notes: p.notes || ''
        }));

        const activeCustomers = 0; // Handled client-side via live Mikrotik query or ignored

        return NextResponse.json({
            totalRevenue,
            thisMonthRevenue,
            grossRevenue,
            netRevenue,
            staffCommission,
            myCommission,  // personal commission for current user (agent/staff view)
            todaysRevenue,
            pendingCount,
            totalUnpaid,
            totalTransactions: totalTxCount,
            monthlyRevenue,
            recentTransactions,
            pppoeActive: activeCustomers,
            pppoeOffline: totalCustomersCount - activeCustomers,
            totalCustomers: totalCustomersCount
        });
    } catch (error) {
        console.error('Stats Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
