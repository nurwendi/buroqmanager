export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/security';
import db from '@/lib/db';
import { getMikrotikClient } from '@/lib/mikrotik';

async function getCurrentUser(request: Request) {
    let token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
    if (!token) {
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }
    if (!token) return null;
    return await verifyToken(token);
}

export async function GET(request: Request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Determine target owner ID and scope
        const ownerId = currentUser.role === 'admin' ? currentUser.id : currentUser.ownerId;
        
        let whereClause: any = {};
        if (currentUser.role === 'superadmin') {
            whereClause = {};
        } else if (currentUser.role === 'admin') {
            whereClause = { ownerId: currentUser.id };
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
        const activeCustomers = totalCustomers; // Status field not implemented, assuming all are active
        const allowedUsernames = new Set(customersList.map(c => c.username));

        // 2. Get Monthly Revenue
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        let paymentWhereClause: any = {
            date: { gte: startOfMonth },
            method: { not: 'EXPENSE' },
        };

        if (currentUser.role !== 'superadmin') {
            paymentWhereClause.username = { in: Array.from(allowedUsernames) };
            paymentWhereClause.ownerId = ownerId;
        }

        const payments = await db.payment.findMany({
            where: {
                ...paymentWhereClause,
                status: 'completed'
            },
            include: {
                commissions: true
            }
        });

        const grossRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
        const staffCommission = payments.reduce((sum, p) => {
            const paymentCommission = p.commissions.reduce((cSum, c) => cSum + c.amount, 0);
            return sum + paymentCommission;
        }, 0);
        const netRevenue = grossRevenue - staffCommission;
        const monthlyRevenue = grossRevenue; // Backward compatibility

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
                    const routerActiveCount = pppActive.filter(a => allowedUsernames.has(a.name)).length;
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
            where: { ...paymentWhereClause, status: 'pending' },
            orderBy: { date: 'desc' },
            take: 10
        });

        const pendingRegistrationsCount = await db.registration.count({
            where: { ...whereClause, status: 'pending' }
        });

        const pendingPaymentsCount = await db.payment.count({
            where: { ...paymentWhereClause, status: 'pending' }
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
