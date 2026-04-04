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

        const payments = await db.payment.findMany({ 
            where: paymentWhere,
            include: { commissions: true }
        });

        const totalRevenue = payments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        // Use Asia/Jakarta timezone for date calculations
        const now = new Date();
        const dFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric', month: 'numeric', day: 'numeric' });
        const parts = dFmt.formatToParts(now);
        const currentMonth = parseInt(parts.find(p => p.type === 'month').value) - 1;
        const currentYear = parseInt(parts.find(p => p.type === 'year').value);
        const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${parts.find(p => p.type === 'day').value.padStart(2, '0')}`;

        const todaysRevenue = payments
            .filter(p => {
                if (p.status !== 'completed') return false;
                const pDate = new Date(p.date);
                const pParts = dFmt.formatToParts(pDate);
                const pDayStr = `${pParts.find(px => px.type === 'year').value}-${String(parseInt(pParts.find(px => px.type === 'month').value)).padStart(2, '0')}-${pParts.find(px => px.type === 'day').value.padStart(2, '0')}`;
                return pDayStr === todayStr;
            })
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const thisMonthPayments = payments.filter(p => {
            return p.status === 'completed' && 
                   p.method !== 'EXPENSE' &&
                   p.month === currentMonth && 
                   p.year === currentYear;
        });

        const grossRevenue = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        
        // Calculate commission specifically for the logged in staff/agent if applicable
        const staffCommission = thisMonthPayments.reduce((sum, p) => {
            const myComm = (p.commissions || []).find(c => c.userId === currentUser.id);
            return sum + (myComm ? myComm.amount : 0);
        }, 0);

        const netRevenue = grossRevenue - staffCommission;
        const thisMonthRevenue = grossRevenue; // Backward compatibility

        const pendingCount = payments.filter(p => p.status === 'pending').length;

        const totalUnpaid = payments
            .filter(p => p.status === 'pending')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        // --- NEW: Calculate 6-month historical revenue for chart ---
        const monthlyRevenue = [];
        for (let i = 5; i >= 0; i--) {
            const targetDate = new Date(now);
            targetDate.setMonth(now.getMonth() - i);
            const tParts = dFmt.formatToParts(targetDate);
            const tMonth = parseInt(tParts.find(px => px.type === 'month').value) - 1;
            const tYear = parseInt(tParts.find(px => px.type === 'year').value);
            
            const monthTotal = payments
                .filter(p => {
                    return p.status === 'completed' && p.month === tMonth && p.year === tYear;
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

        const activeCustomers = 0; // Handled client-side via live Mikrotik query or ignored
        const totalCustomersCount = await db.customer.count({ where: customerWhere });

        return NextResponse.json({
            totalRevenue,
            thisMonthRevenue,
            grossRevenue,
            netRevenue,
            staffCommission,
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
