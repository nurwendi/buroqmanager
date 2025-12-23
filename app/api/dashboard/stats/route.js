import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { verifyToken } from '@/lib/security';
import db from '@/lib/db';
import os from 'os';

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

        const config = await (await import('@/lib/config')).getConfig();
        const { getUserConnectionId } = await import('@/lib/config');
        const connectionId = getUserConnectionId(currentUser, config);

        // Fallback: If no connection ID for staff/user, try owner's connection
        let effectiveConnectionId = connectionId;
        if (!effectiveConnectionId && currentUser.ownerId) {
            const ownerConn = config.connections?.find(c => c.ownerId === currentUser.ownerId);
            if (ownerConn) effectiveConnectionId = ownerConn.id;
        }

        // SUPERADMIN FALLBACK: Default to first connection if none selected
        if (!effectiveConnectionId && currentUser.role === 'superadmin' && config.connections?.length > 0) {
            effectiveConnectionId = config.connections[0].id;
        }

        // Calculate Server CPU Load (Delta over 200ms)
        const startCpus = os.cpus();
        await new Promise(resolve => setTimeout(resolve, 200));
        const endCpus = os.cpus();

        let totalIdle = 0, totalTick = 0;
        for (let i = 0; i < startCpus.length; i++) {
            const cpu1 = startCpus[i];
            const cpu2 = endCpus[i];

            const idle = cpu2.times.idle - cpu1.times.idle;
            let tick = 0;
            for (let type in cpu1.times) {
                tick += cpu2.times[type] - cpu1.times[type];
            }
            totalIdle += idle;
            totalTick += tick;
        }
        const serverCpuLoad = totalTick > 0 ? Math.round(((totalTick - totalIdle) / totalTick) * 100) : 0;
        const serverMemoryTotal = os.totalmem();
        const serverMemoryFree = os.freemem();
        const serverMemoryUsed = serverMemoryTotal - serverMemoryFree;

        if (!effectiveConnectionId) {
            return NextResponse.json({
                cpu: 0,
                memory: 0,
                uptime: 'N/A',
                temperature: 0,
                activePppoe: 0,
                activeHotspot: 0,
                system: { boardName: 'No Router', version: '-' },
                serverCpuLoad,
                serverMemoryUsed,
                serverMemoryTotal,
                interfaces: []
            });
        }

        const client = await getMikrotikClient(effectiveConnectionId);

        // 1. Fetch PPPoE active connections from MikroTik
        const activeConnections = await client.write('/ppp/active/print');

        // 2. Fetch Customers from DB to determine "ALL Users" and ownership
        // 2. Fetch Customers from DB to determine "ALL Users" and ownership
        let dbCustomers = [];

        // Strict Scoped Filtering
        if (currentUser.role === 'superadmin') {
            // If Superadmin is viewing a specific connection, scope to that connection's owner
            // to ensure "Total Users" matches the router's context.
            const activeConnection = config.connections?.find(c => c.id === effectiveConnectionId);
            if (activeConnection && activeConnection.ownerId) {
                dbCustomers = await db.customer.findMany({
                    where: { ownerId: activeConnection.ownerId },
                    select: { username: true }
                });
            } else {
                // Fallback to Global if no specific owner found for connection
                dbCustomers = await db.customer.findMany({ select: { username: true } });
            }
        } else {
            let filterWhere = {};

            if (currentUser.role === 'admin' || currentUser.role === 'manager') {
                filterWhere = { ownerId: currentUser.id };
                if (currentUser.role === 'manager' && currentUser.ownerId) {
                    filterWhere = { ownerId: currentUser.ownerId };
                }
            } else if (['agent', 'partner', 'technician', 'staff'].includes(currentUser.role)) {
                filterWhere = {
                    OR: [
                        { agentId: currentUser.id },
                        { technicianId: currentUser.id }
                    ]
                };
                if (currentUser.ownerId) {
                    filterWhere = {
                        AND: [
                            { ownerId: currentUser.ownerId },
                            filterWhere
                        ]
                    };
                }
            } else {
                filterWhere = { ownerId: 'impossible_id' };
            }

            if (Object.keys(filterWhere).length > 0 || (filterWhere.AND && filterWhere.AND.length > 0)) {
                dbCustomers = await db.customer.findMany({
                    where: filterWhere,
                    select: { username: true }
                });
            }
        }

        const myCustomerUsernames = new Set(dbCustomers.map(c => c.username));
        const myTotalUsers = dbCustomers.length;

        // 3. Filter active connections to only include MY customers
        const myActiveCount = activeConnections.filter(conn => myCustomerUsernames.has(conn.name)).length;

        // 4. Calculate Offline (My Total - My Active)
        const pppoeOffline = Math.max(0, myTotalUsers - myActiveCount);


        // Fetch system resources (Global stats, usually OK for all admins to see purely HW stats?
        // Or should we hide CPU/Temp for tenants?
        // Typically tenants don't need to see Router health unless they own the router.
        // But if they share the router, maybe basic status is fine.
        // User requested "database user sendiri-sendiri", implies data isolation.
        // HW stats are shared. Let's keep them visible or maybe hide if strict.
        // Let's keep visible for now.
        const resources = await client.write('/system/resource/print');
        const resource = resources[0] || {};

        // Fetch CPU temperature and Voltage
        let temperature = null;
        let voltage = null;
        try {
            const health = await client.write('/system/health/print');
            const tempItem = health.find(h =>
                h.name === 'temperature' ||
                h.name === 'cpu-temperature' ||
                h.name === 'board-temperature'
            );
            const voltageItem = health.find(h =>
                h.name === 'voltage' ||
                h.name === 'monitor-voltage'
            );
            if (tempItem) temperature = parseInt(tempItem.value);
            if (voltageItem) voltage = parseFloat(voltageItem.value);
        } catch (e) {
            // Health not available
        }

        // Fetch System Users Count (Admins) for Superadmin
        let adminCount = 0;
        let totalCustomers = 0;

        if (currentUser.role === 'superadmin') {
            const adminCountPromise = db.user.count({
                where: { role: 'admin' }
            });
            const totalCustomersPromise = db.customer.count();

            const [ac, tc] = await Promise.all([adminCountPromise, totalCustomersPromise]);
            adminCount = ac;
            totalCustomers = tc;
        }

        // Fetch interface statistics
        const interfaces = await client.write('/interface/print', ['=stats']);
        const interfaceStats = interfaces
            .filter(iface => {
                const name = iface.name || '';
                return !name.startsWith('pppoe-out') && !name.startsWith('<pppoe-');
            })
            .map(iface => ({
                name: iface.name,
                type: iface.type,
                running: iface.running === 'true',
                txRate: parseInt(iface['tx-bits-per-second'] || 0),
                rxRate: parseInt(iface['rx-bits-per-second'] || 0),
                txBytes: parseInt(iface['tx-byte'] || 0),
                rxBytes: parseInt(iface['rx-byte'] || 0)
            }));




        return NextResponse.json({
            pppoeActive: myActiveCount,
            pppoeOffline: pppoeOffline,
            cpuLoad: parseInt(resource['cpu-load'] || 0), // Router CPU
            memoryUsed: parseInt(resource['total-memory'] || 0) - parseInt(resource['free-memory'] || 0), // Router Mem
            memoryTotal: parseInt(resource['total-memory'] || 0),
            serverCpuLoad,
            serverMemoryUsed,
            serverMemoryTotal,
            temperature,
            voltage,
            interfaces: interfaceStats,
            adminCount,
            totalCustomers
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return NextResponse.json({
            error: error.message,
            pppoeActive: 0,
            pppoeOffline: 0,
            cpuLoad: 0,
            memoryUsed: 0,
            memoryTotal: 0,
            temperature: null,
            interfaces: []
        }, { status: 500 });
    }
}


