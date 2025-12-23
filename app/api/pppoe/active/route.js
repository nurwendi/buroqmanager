import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { getUserFromRequest } from '@/lib/api-auth';
import { getConfig, getUserConnectionId } from '@/lib/config';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const config = await getConfig();

        // 1. Resolve Connection ID
        let connectionId = getUserConnectionId(user, config);

        // Fallback: If no connection ID for staff/user, try owner's connection
        if (!connectionId && user.ownerId) {
            const ownerConn = config.connections?.find(c => c.ownerId === user.ownerId);
            if (ownerConn) connectionId = ownerConn.id;
        }

        if (!connectionId && user.role !== 'superadmin') {
            return NextResponse.json([]); // No router assigned
        }

        const client = await getMikrotikClient(connectionId);

        // 2. Fetch Active Connections & Interfaces from MikroTik
        const [activeConnections, interfaces] = await Promise.all([
            client.write('/ppp/active/print'),
            client.write('/interface/print')
        ]);

        // 3. Determine Ownership Context and Allowed Customers
        let allowedUsernames = null; // null means all allowed (superadmin)

        if (user.role !== 'superadmin' && user.role !== 'admin') {
            const db = (await import('@/lib/db')).default;
            let filterWhere = {};

            if (user.role === 'admin' || user.role === 'manager') {
                filterWhere = { ownerId: user.id };
                if (user.role === 'manager' && user.ownerId) {
                    filterWhere = { ownerId: user.ownerId };
                }
            } else if (['agent', 'partner', 'technician', 'staff'].includes(user.role)) {
                filterWhere = {
                    OR: [
                        { agentId: user.id },
                        { technicianId: user.id }
                    ]
                };
                if (user.ownerId) {
                    filterWhere = {
                        AND: [
                            { ownerId: user.ownerId },
                            filterWhere
                        ]
                    };
                }
            } else {
                filterWhere = { ownerId: 'impossible_id' };
            }

            // Fetch allowed usernames
            if (Object.keys(filterWhere).length > 0 || (filterWhere.AND && filterWhere.AND.length > 0)) {
                const myCustomers = await db.customer.findMany({
                    where: filterWhere,
                    select: { username: true }
                });
                allowedUsernames = new Set(myCustomers.map(c => c.username));
            } else {
                allowedUsernames = new Set(); // Empty set = allow nothing
            }
        }

        // 4. Map Stats and Filter
        const interfaceMap = new Map();
        interfaces.forEach(i => {
            if (i.name) interfaceMap.set(i.name, i);
        });

        const connectionsWithStats = activeConnections.reduce((acc, conn) => {
            // Filter: Only include if in allowed list (or if superadmin)
            if (allowedUsernames !== null && !allowedUsernames.has(conn.name)) {
                return acc;
            }

            // Find corresponding interface
            const interfaceName = `<pppoe-${conn.name}>`;
            const userInterface = interfaceMap.get(interfaceName) || interfaceMap.get(conn.name);

            const enrichedConn = userInterface ? {
                ...conn,
                'rx-byte': userInterface['rx-byte'],
                'tx-byte': userInterface['tx-byte']
            } : conn;

            acc.push(enrichedConn);
            return acc;
        }, []);

        return NextResponse.json(connectionsWithStats);
    } catch (error) {
        console.error('Error fetching active connections:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


