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

        // Determine target owner ID
        const ownerId = currentUser.role === 'admin' ? currentUser.id : currentUser.ownerId;

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

        const whereClause = currentUser.role === 'superadmin' ? {} : { ownerId };

        // 1. Get Customers counts
        const totalCustomers = await db.customer.count({
            where: whereClause
        });

        // For simplicity, active customers are those not suspended. 
        // In this system, active usually implies having an active PPPoE connection or status != 'suspend'.
        // Assuming status 'active'. If status field is not present, we can just use totalCustomers or check pppoe.
        // Let's count customers with status = 'active'
        const activeCustomers = await db.customer.count({
            where: {
                ...whereClause,
                status: 'active'
            }
        });

        // 2. Get Monthly Revenue (Gross from payments in the current month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const payments = await db.payment.findMany({
            where: {
                paymentDate: {
                    gte: startOfMonth
                },
                method: {
                    not: 'EXPENSE'
                },
                customer: currentUser.role === 'superadmin' ? undefined : { ownerId }
            },
            select: {
                amount: true
            }
        });

        const monthlyRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

        // 3. Get Routers
        const config = await (await import('@/lib/config')).getConfig();
        const allConnections = config.connections || [];
        const targetConnections = currentUser.role === 'superadmin' 
           ? allConnections 
           : allConnections.filter((c: any) => c.ownerId === ownerId);

        let onlineRouters = 0;
        
        const routers = await Promise.all(targetConnections.map(async (conn: any) => {
            try {
                const connClient = await getMikrotikClient(conn.id);
                // System Identity
                const identityRes = await connClient.write('/system/identity/print');
                const identity = identityRes[0]?.name || 'Unknown';

                // Resources
                const resources = await connClient.write('/system/resource/print');
                const res = resources[0] || {};
                
                onlineRouters++;
                
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

        // For the chart in the mobile app, we can use these fields
        const pppoeActive = routers.reduce((sum, r) => sum + (r.status === 'online' ? activeCustomers : 0), 0); 
        // Note: Simple heuristic for now since this endpoint doesn't fetch detailed PPP active for each owner individually yet
        // However, activeCustomers (status='active') is a good representation of 'Total Active'
        // For 'Online' vs 'Offline', let's use the actual active count from the provided stats if possible.

        return NextResponse.json({
            totalCustomers,
            activeCustomers,
            pppoeActive: activeCustomers, // Using active status as a proxy for 'Online'
            pppoeOffline: totalCustomers - activeCustomers,
            routersCount: targetConnections.length,
            onlineRouters,
            monthlyRevenue,
            routers
        });

    } catch (error: any) {
        console.error('Error fetching admin stats:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
