import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { verifyToken } from '@/lib/security';
import db from '@/lib/db';
import os from 'os';
import fs from 'fs';

function getSwapInfo() {
    if (os.platform() !== 'linux') return { total: 0, free: 0, used: 0 };
    try {
        const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
        const swapTotalMatch = meminfo.match(/^SwapTotal:\s+(\d+)\s+kB/m);
        const swapFreeMatch = meminfo.match(/^SwapFree:\s+(\d+)\s+kB/m);
        
        const total = swapTotalMatch ? parseInt(swapTotalMatch[1]) * 1024 : 0;
        const free = swapFreeMatch ? parseInt(swapFreeMatch[1]) * 1024 : 0;
        
        return {
            total,
            free,
            used: total - free
        };
    } catch (e) {
        return { total: 0, free: 0, used: 0 };
    }
}

async function getCurrentUser(request) {
    let token = request.cookies.get('auth_token')?.value;
    if (!token) {
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }
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

        const serverCpus = [];
        let totalIdle = 0, totalTick = 0;
        for (let i = 0; i < startCpus.length; i++) {
            const cpu1 = startCpus[i];
            const cpu2 = endCpus[i];

            const idle = cpu2.times.idle - cpu1.times.idle;
            let tick = 0;
            for (let type in cpu1.times) {
                tick += cpu2.times[type] - cpu1.times[type];
            }
            const load = tick > 0 ? Math.round(((tick - idle) / tick) * 100) : 0;
            serverCpus.push({
                model: cpu1.model,
                speed: cpu1.speed,
                load
            });
            totalIdle += idle;
            totalTick += tick;
        }
        const serverCpuLoad = totalTick > 0 ? Math.round(((totalTick - totalIdle) / totalTick) * 100) : 0;
        const serverMemoryTotal = os.totalmem();
        const serverMemoryFree = os.freemem();
        const serverMemoryUsed = serverMemoryTotal - serverMemoryFree;
        const serverSwap = getSwapInfo();

        const allConnections = config.connections || [];
        let targetConnections = [];

        if (currentUser.role === 'superadmin') {
            targetConnections = allConnections;
        } else {
            const ownerId = currentUser.role === 'admin' ? currentUser.id : currentUser.ownerId;
            targetConnections = allConnections.filter(c => c.ownerId === ownerId);
        }

        // Fetch each router's status in parallel
        const routerStats = await Promise.all(targetConnections.map(async (conn) => {
            try {
                const connClient = await getMikrotikClient(conn.id);
                // System Identity
                const identityRes = await connClient.write('/system/identity/print');
                const identity = identityRes[0]?.name || 'Unknown';

                // Health/Resources
                const resources = await connClient.write('/system/resource/print');
                const res = resources[0] || {};

                return {
                    id: conn.id,
                    name: conn.name,
                    host: conn.host,
                    ownerId: conn.ownerId,
                    identity,
                    status: 'online',
                    cpuLoad: parseInt(res['cpu-load'] || 0),
                    memoryUsed: parseInt(res['total-memory'] || 0) - parseInt(res['free-memory'] || 0),
                    memoryTotal: parseInt(res['total-memory'] || 0)
                };
            } catch (err) {
                return {
                    id: conn.id,
                    name: conn.name,
                    host: conn.host,
                    ownerId: conn.ownerId,
                    status: 'offline'
                };
            }
        }));

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
                serverCpus,
                serverMemoryUsed,
                serverMemoryTotal,
                serverSwap,
                interfaces: [],
                routers: routerStats
            });
        }

        const client = await getMikrotikClient(effectiveConnectionId);

        // ... existing logic for the active router (activePppoe, pppoeOffline, etc.) ...
        const activeConnections = await client.write('/ppp/active/print');

        // ... skipping unchanged logic for brevity and using multi_replace if needed, 
        // but for now I'll just finish the return object ...
        // Wait, I need to keep the existing logic. I'll use multi_replace to be safe.
        // Actually, I'll just complete the replacement here and ensure I don't lose the filtering logic.
        
        let myTotalUsers = 0;
        let myActiveCount = 0;
        let pppoeOffline = 0;

        if (currentUser.role === 'superadmin') {
            const allSecrets = await client.write('/ppp/secret/print');
            myTotalUsers = allSecrets.length;
            const activeMap = new Set(activeConnections.map(a => a.name));
            myActiveCount = allSecrets.filter(s => activeMap.has(s.name)).length;
        } else {
            const allSecrets = await client.write('/ppp/secret/print');
            let filterWhere = {};
            if (currentUser.role === 'admin' || currentUser.role === 'manager') {
                filterWhere = { ownerId: currentUser.id };
                if (currentUser.role === 'manager' && currentUser.ownerId) {
                    filterWhere = { ownerId: currentUser.ownerId };
                }
            } else if (['agent', 'partner', 'technician', 'staff', 'editor'].includes(currentUser.role)) {
                filterWhere = {
                    OR: [ { agentId: currentUser.id }, { technicianId: currentUser.id } ]
                };
                if (currentUser.ownerId) {
                    filterWhere = { AND: [{ ownerId: currentUser.ownerId }, filterWhere] };
                }
            } else {
                filterWhere = { ownerId: 'impossible_id' };
            }

            let allowedUsernames = new Set();
            if (Object.keys(filterWhere).length > 0 || (filterWhere.AND && filterWhere.AND.length > 0)) {
                const dbCustomers = await db.customer.findMany({
                    where: filterWhere,
                    select: { username: true }
                });
                dbCustomers.forEach(c => allowedUsernames.add(c.username));
            }
            const mySecrets = allSecrets.filter(s => allowedUsernames.has(s.name));
            myTotalUsers = mySecrets.length;
            const activeMap = new Set(activeConnections.map(a => a.name));
            myActiveCount = mySecrets.filter(s => activeMap.has(s.name)).length;
        }

        pppoeOffline = Math.max(0, myTotalUsers - myActiveCount);

        const resources = await client.write('/system/resource/print');
        const resource = resources[0] || {};

        let temperature = null;
        let voltage = null;
        try {
            const health = await client.write('/system/health/print');
            const tempItem = health.find(h => h.name === 'temperature' || h.name === 'cpu-temperature' || h.name === 'board-temperature');
            const voltageItem = health.find(h => h.name === 'voltage' || h.name === 'monitor-voltage');
            if (tempItem) temperature = parseInt(tempItem.value);
            if (voltageItem) voltage = parseFloat(voltageItem.value);
        } catch (e) {}

        let adminCount = 0;
        let totalCustomers = 0;
        let systemUserCount = 0;

        if (currentUser.role === 'superadmin') {
            const [ac, tc, sc] = await Promise.all([
                db.user.count({ where: { role: 'admin' } }),
                db.customer.count(),
                db.user.count({ where: { role: { notIn: ['superadmin', 'admin', 'customer'] } } })
            ]);
            adminCount = ac;
            totalCustomers = tc;
            systemUserCount = sc;
        } else {
            const ownerId = (currentUser.role === 'manager' || ['agent', 'partner', 'technician', 'staff', 'editor'].includes(currentUser.role)) ? currentUser.ownerId : currentUser.id;
            if (ownerId) {
                [systemUserCount, totalCustomers] = await Promise.all([
                    db.user.count({ where: { ownerId: ownerId } }),
                    db.customer.count({ where: { ownerId: ownerId } })
                ]);
            }
        }

        const ifaces = await client.write('/interface/print', ['=stats']);
        const interfaceStats = ifaces
            .filter(iface => {
                const name = iface.name || '';
                return !name.startsWith('pppoe-out') && !name.startsWith('<pppoe-');
            })
            .map(iface => ({
                name: iface.name,
                type: iface.type,
                running: iface.running === 'true',
                txRate: parseInt(iface['tx-bits-per-second'] || 0),
                rxRate: parseInt(iface['rx-bits-per-second'] || 0)
            }));

        return NextResponse.json({
            pppoeActive: myActiveCount,
            pppoeOffline: pppoeOffline,
            cpuLoad: parseInt(resource['cpu-load'] || 0),
            memoryUsed: parseInt(resource['total-memory'] || 0) - parseInt(resource['free-memory'] || 0),
            memoryTotal: parseInt(resource['total-memory'] || 0),
            serverCpuLoad,
            serverCpus,
            serverMemoryUsed,
            serverMemoryTotal,
            serverSwap,
            temperature,
            voltage,
            interfaces: interfaceStats,
            adminCount,
            totalCustomers,
            systemUserCount,
            routers: routerStats
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
            interfaces: [],
            systemUserCount: 0,
            routers: []
        }, { status: 500 });
    }
}


