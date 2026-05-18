import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { getUserFromRequest } from '@/lib/api-auth';
import { getConfig, getUserConnectionId } from '@/lib/config';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const config = await getConfig();

        // 1. Resolve Connections to Scan
        let targetOwnerId = user.ownerId;
        if (user.role === 'admin') targetOwnerId = user.id;

        const targetConnections = (config.connections || []).filter(c => c.ownerId === targetOwnerId);
        
        let connectionsToScan = [];
        if (user.role === 'superadmin') {
            connectionsToScan = config.connections || [];
        } else if (targetConnections.length > 0) {
            connectionsToScan = targetConnections;
        } else if (config.activeConnectionId) {
            const central = config.connections.find(c => c.id === config.activeConnectionId);
            if (central) connectionsToScan = [central];
        } else if (config.connections?.length > 0) {
            connectionsToScan = [config.connections[0]];
        }

        if (connectionsToScan.length === 0 && user.role !== 'superadmin') {
            return NextResponse.json([]); // No router assigned and no fallback
        }

        // 2. Determine Authorized Usernames
        let allowedUsernames = null; 
        if (user.role !== 'superadmin') {
            const db = (await import('@/lib/db')).default;
            let filterWhere = {};

            if (user.role === 'admin' || user.role === 'manager') {
                filterWhere = { ownerId: targetOwnerId };
            } else if (['agent', 'partner', 'technician', 'staff', 'editor'].includes(user.role)) {
                if (user.role === 'technician') {
                    filterWhere = { technicianId: user.id, ownerId: user.ownerId };
                } else {
                    filterWhere = { agentId: user.id, ownerId: user.ownerId };
                }
            } else {
                filterWhere = { ownerId: 'impossible_id' };
            }

            const myCustomers = await db.customer.findMany({
                where: filterWhere,
                select: { username: true }
            });
            allowedUsernames = new Set(myCustomers.map(c => c.username.toLowerCase()));
        }

        // 3. Scan All Routers in Parallel
        const results = await Promise.all(connectionsToScan.map(async (conn) => {
            try {
                // Wrap Mikrotik connection and read in a 4-second timeout
                const scanPromise = (async () => {
                    const client = await getMikrotikClient(conn.id);
                    return Promise.all([
                        client.write('/ppp/active/print'),
                        client.write('/interface/print')
                    ]);
                })();
                
                // If it takes more than 4s, throw timeout error to catch block
                const mikrotikResult = await Promise.race([
                    scanPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Mikrotik Connection Timeout')), 4000))
                ]);
                
                const [activeConnections, interfaces] = mikrotikResult;

                const interfaceMap = new Map();
                interfaces.forEach(i => { if (i.name) interfaceMap.set(i.name, i); });

                return activeConnections.reduce((acc, pppConn) => {
                    if (allowedUsernames !== null && pppConn.name && !allowedUsernames.has(pppConn.name.toLowerCase())) {
                        return acc;
                    }

                    const interfaceName = `<pppoe-${pppConn.name}>`;
                    const userInterface = interfaceMap.get(interfaceName) || interfaceMap.get(pppConn.name);

                    acc.push({
                        ...pppConn,
                        routerId: conn.id,
                        routerName: conn.name,
                        'rx-byte': userInterface?.['rx-byte'],
                        'tx-byte': userInterface?.['tx-byte']
                    });
                    return acc;
                }, []);
            } catch (err) {
                console.error(`Router ${conn.id} scan failed:`, err);
                return [];
            }
        }));

        const allActiveConnections = results.flat();
        return NextResponse.json(allActiveConnections);
    } catch (error) {
        console.error('Error fetching active connections:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


