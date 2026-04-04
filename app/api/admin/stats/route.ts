import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';
import { getMikrotikClient } from '@/lib/mikrotik';

export async function GET(request: Request) {
    try {
        const currentUser = await getUserFromRequest(request);
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Determine target owner ID and scope
        const ownerId = currentUser.role === 'admin' ? (currentUser.ownerId || currentUser.id) : currentUser.ownerId;
        
        let whereClause: any = {};
        if (currentUser.role === 'superadmin') {
            whereClause = {};
        } else if (currentUser.role === 'admin') {
            whereClause = { ownerId: currentUser.ownerId || currentUser.id };
        } else if (currentUser.role === 'technician') {
            whereClause = { technicianId: currentUser.id, ownerId: currentUser.ownerId };
        } else if (['agent', 'staff', 'partner', 'editor'].includes(currentUser.role)) {
            whereClause = { agentId: currentUser.id, ownerId: currentUser.ownerId };
        } else {
            // viewer or unauthorized
            whereClause = { ownerId: currentUser.ownerId || 'impossible_id' };
        }

        if (!ownerId && currentUser.role !== 'superadmin') {
           return NextResponse.json({
               totalCustomers: 0,
               activeCustomers: 0,
               routersCount: 0,
               monthlyRevenue: 0,
               onlineRouters: 0,
               routers: []
           });
        }
        // 1. Get Customers counts
        const customersList = await db.customer.findMany({
            where: whereClause,
            select: { username: true }
        });
        const totalCustomers = customersList.length;
        const activeCustomers = totalCustomers; 
        const allowedUsernames = new Set(customersList.map(c => c.username.toLowerCase()));

        // 2. Get Monthly Revenue (Scoped to current month)
        // Use Intl.DateTimeFormat for robust timezone-aware date components
        const now = new Date();
        const dFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric', month: 'numeric' });
        const parts = dFmt.formatToParts(now);
        const currentMonth = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1; // 0-indexed
        const currentYear = parseInt(parts.find(p => p.type === 'year')?.value || '2026');

        let baseWhere: any = {};
        if (currentUser.role !== 'superadmin') {
            baseWhere.username = { in: Array.from(allowedUsernames) };
            baseWhere.ownerId = ownerId;
        }

        const paymentWhereClauseMonth: any = {
            ...baseWhere,
            month: currentMonth,
            year: currentYear,
            method: { not: 'EXPENSE' },
        };

        const payments = await db.payment.findMany({
            where: {
                ...paymentWhereClauseMonth,
                status: 'completed'
            },
            include: {
                commissions: true
            }
        });

        const grossRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
        const staffCommission = payments.reduce((sum, p) => {
            const paymentCommission = (p.commissions || []).reduce((cSum, c) => cSum + c.amount, 0);
            return sum + paymentCommission;
        }, 0);
        const netRevenue = grossRevenue - staffCommission;
        const monthlyRevenue = grossRevenue; // Backward compatibility

        // Calculate Unpaid (Piutang) - GLOBAL scope (all months)
        const totalUnpaid = await db.payment.aggregate({
            _sum: { amount: true },
            where: {
                ...baseWhere,
                status: 'pending',
                method: { not: 'EXPENSE' }
            }
        }).then(res => res._sum.amount || 0);

        // 3. Get Routers & Real-time PPPoE Active Count
        const config = await (await import('@/lib/config')).getConfig();
        const allConnections = config.connections || [];
        const targetConnections = currentUser.role === 'superadmin' 
           ? allConnections 
           : allConnections.filter((c: any) => c.ownerId === ownerId);

        let onlineRouters = 0;
        let pppoeActive = 0;
        
        const routers = await Promise.all(targetConnections.map(async (conn: any) => {
            try {
                const connClient = await getMikrotikClient(conn.id);
                
                // Fetch basic info and active sessions in parallel
                const [identityRes, resources, pppActive] = await Promise.all([
                    connClient.write('/system/identity/print'),
                    connClient.write('/system/resource/print'),
                    connClient.write('/ppp/active/print')
                ]);

                const identity = identityRes[0]?.name || 'Unknown';
                const res = resources[0] || {};
                
                onlineRouters++;

                // Count active sessions belonging to this user's scope
                if (Array.isArray(pppActive)) {
                    const routerActiveCount = pppActive.filter(a => a.name && allowedUsernames.has(a.name.toLowerCase())).length;
                    pppoeActive += routerActiveCount;
                }
                
                return {
                    id: conn.id,
                    name: conn.name,
                    host: conn.host,
                    identity,
                    status: 'online',
                    cpuLoad: parseInt(res['cpu-load'] || '0')
                };
            } catch (err) {
                return {
                    id: conn.id,
                    name: conn.name,
                    host: conn.host,
                    status: 'offline',
                    cpuLoad: 0
                };
            }
        }));

        // 4. Pending Approvals (Registrations & Payments)
        const pendingRegs = await db.registration.findMany({
            where: { ...whereClause, status: 'pending' },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        const pendingPaymentList = await db.payment.findMany({
            where: { ...baseWhere, status: 'pending' },
            orderBy: { date: 'desc' },
            take: 10
        });

        const pendingRegistrationsCount = await db.registration.count({
            where: { ...whereClause, status: 'pending' }
        });

        const pendingPaymentsCount = await db.payment.count({
            where: { ...baseWhere, status: 'pending' }
        });

        const pendingPayments = [
            ...pendingRegs.map(r => ({
                id: r.id,
                name: r.name || r.username,
                customerName: r.name || r.username,
                type: 'registration',
                subType: r.type,
                date: r.createdAt,
                status: r.status
            })),
            ...pendingPaymentList.map(p => ({
                id: p.id,
                name: p.username,
                customerName: p.username,
                type: 'payment',
                amount: p.amount,
                date: p.date,
                status: p.status
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

        return NextResponse.json({
            totalCustomers,
            activeCustomers,
            pppoeActive,
            pppoeOffline: Math.max(0, totalCustomers - pppoeActive),
            routersCount: targetConnections.length,
            onlineRouters,
            monthlyRevenue,
            grossRevenue,
            netRevenue,
            staffCommission,
            totalUnpaid,
            pendingCount: pendingRegistrationsCount + pendingPaymentsCount,
            pendingRegistrationsCount,
            pendingPaymentsCount,
            pendingPayments,
            routers: routers || []
        });

    } catch (error: any) {
        console.error('Error fetching admin stats:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
