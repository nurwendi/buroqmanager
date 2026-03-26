import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/security';

async function getCurrentUser(request) {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    return await verifyToken(token);
}

export async function GET(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let customerWhere = {};
        
        // Determine effective connection/owner
        let effectiveConnectionId = connectionId;

        if (!effectiveConnectionId && currentUser.ownerId) {
            const ownerConn = config.connections?.find(c => c.ownerId === currentUser.ownerId);
            if (ownerConn) effectiveConnectionId = ownerConn.id;
        }

        if (!effectiveConnectionId && currentUser.role === 'superadmin' && config.connections?.length > 0) {
            effectiveConnectionId = config.connections[0].id; // Default to first if none selected
        }

        // Apply filtering for Customers
        if (currentUser.role === 'admin') {
            customerWhere = { ownerId: currentUser.id };
        } else if (currentUser.role === 'manager' && currentUser.ownerId) {
            customerWhere = { ownerId: currentUser.ownerId };
        } else if (currentUser.role === 'technician') {
            customerWhere = { technicianId: currentUser.id, ownerId: currentUser.ownerId };
        } else if (['agent', 'partner', 'staff', 'editor'].includes(currentUser.role)) {
            customerWhere = { agentId: currentUser.id, ownerId: currentUser.ownerId };
        } else if (currentUser.role === 'superadmin') {
            const activeConnection = config.connections?.find(c => c.id === effectiveConnectionId);
            if (activeConnection && activeConnection.ownerId) {
                customerWhere = { ownerId: activeConnection.ownerId };
            } else {
                customerWhere = {};
            }
        } else {
            customerWhere = { ownerId: currentUser.ownerId || 'impossible_id' };
        }

        const myCustomers = await db.customer.findMany({
            where: customerWhere,
            select: { username: true }
        });
        const allowedUsernames = myCustomers.map(c => c.username);

        let paymentWhere = {};
        if (currentUser.role !== 'superadmin') {
            paymentWhere = {
                username: { in: allowedUsernames },
                ownerId: currentUser.role === 'admin' ? currentUser.id : currentUser.ownerId
            };
        } else {
            const activeConnection = config.connections?.find(c => c.id === effectiveConnectionId);
            if (activeConnection && activeConnection.ownerId) {
                paymentWhere.ownerId = activeConnection.ownerId;
            }
        }

        const payments = await db.payment.findMany({ where: paymentWhere });

        const totalRevenue = payments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        // Use Asia/Jakarta timezone for date calculations
        const now = new Date();
        const jakartaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const today = jakartaNow.toISOString().split('T')[0];
        const currentMonth = jakartaNow.toISOString().slice(0, 7); // YYYY-MM

        const todaysRevenue = payments
            .filter(p => {
                if (p.status !== 'completed') return false;
                const paymentDate = new Date(p.date);
                const jakartaPaymentDate = new Date(paymentDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                const paymentDay = jakartaPaymentDate.toISOString().split('T')[0];
                return paymentDay === today;
            })
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const thisMonthRevenue = payments
            .filter(p => {
                if (p.status !== 'completed') return false;
                const paymentDate = new Date(p.date);
                const jakartaPaymentDate = new Date(paymentDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                const paymentMonth = jakartaPaymentDate.toISOString().slice(0, 7);
                return paymentMonth === currentMonth;
            })
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const pendingCount = payments.filter(p => p.status === 'pending').length;

        const totalUnpaid = payments
            .filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        // --- NEW: Calculate 6-month historical revenue for chart ---
        const monthlyRevenue = [];
        for (let i = 5; i >= 0; i--) {
            const targetDate = new Date(jakartaNow);
            targetDate.setMonth(jakartaNow.getMonth() - i);
            const targetMonthStr = targetDate.toISOString().slice(0, 7); // YYYY-MM
            
            const monthTotal = payments
                .filter(p => {
                    if (p.status !== 'completed') return false;
                    const paymentDate = new Date(p.date);
                    const pJakarta = new Date(paymentDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                    return pJakarta.toISOString().slice(0, 7) === targetMonthStr;
                })
                .reduce((sum, p) => sum + Number(p.amount), 0);

            // Format month name (e.g. "Jan", "Feb")
            const monthName = targetDate.toLocaleString('id-ID', { month: 'short' });
            monthlyRevenue.push({ name: monthName, revenue: monthTotal });
        }

        // --- NEW: Top 5 Recent Transactions ---
        // Sort descending by date and grab first 5 completed
        const recentPayments = payments
            .filter(p => p.status === 'completed')
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        // Fetch customer names for these 5 recent payments
        const recentUsernames = [...new Set(recentPayments.map(p => p.username))];
        const recentCustomers = await db.customer.findMany({
            where: { username: { in: recentUsernames } },
            select: { username: true, name: true }
        });
        const customerMap = recentCustomers.reduce((acc, curr) => {
            acc[curr.username] = curr.name;
            return acc;
        }, {});

        const recentTransactions = recentPayments.map(p => ({
            id: p.id,
            customerName: String(customerMap[p.username] || p.username || 'Unknown Customer'),
            amount: Number(p.amount),
            date: p.date,
            method: p.method || 'cash'
        }));

        const [activeCustomers, totalCustomersCount] = await Promise.all([
            db.customer.count({ where: customerWhere }),
            db.customer.count({ where: customerWhere })
        ]);

        return NextResponse.json({
            totalRevenue,
            thisMonthRevenue,
            todaysRevenue,
            pendingCount,
            totalUnpaid,
            totalTransactions: payments.length,
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
