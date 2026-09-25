import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';
import { getConfig } from '@/lib/config';
import { getMikrotikClient } from '@/lib/mikrotik';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || user.role !== 'superadmin') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Fetch all Owners (Admins)
        const owners = await db.user.findMany({
            where: { role: 'admin' },
            select: { id: true, username: true, fullName: true }
        });

        // 2. Fetch Customer Counts per Owner from DB
        const totalUsersPromise = db.customer.groupBy({
            by: ['ownerId'],
            _count: {
                id: true
            }
        });

        // 3. Fetch Active Users from All Routers
        const config = await getConfig();
        const activeSessionsMap = new Set(); // Set of usernames that are active

        const routerPromises = (config.connections || []).map(async (conn) => {
            try {
                const client = await getMikrotikClient(conn.id);
                // Just need names to count
                const active = await client.write('/ppp/active/print', ['.proplist=name']);
                active.forEach(u => activeSessionsMap.add(u.name));
            } catch (err) {
                console.error(`Failed to fetch active users from router ${conn.host}:`, err.message);
            }
        });

        await Promise.all([totalUsersPromise, ...routerPromises]);

        const totalUsersByOwner = (await totalUsersPromise).reduce((acc, curr) => {
            if (curr.ownerId) acc[curr.ownerId] = curr._count.id;
            return acc;
        }, {});

        // 4. Calculate active per owner efficiently in-memory instead of massive IN clause
        const activeUsernames = Array.from(activeSessionsMap);
        let activeOwnerMap = {};

        if (activeUsernames.length > 0) {
            // Fetch only username and ownerId for all customers
            const allCust = await db.customer.findMany({
                select: { username: true, ownerId: true }
            });
            
            // Map it in memory (O(N) is extremely fast in Node.js)
            allCust.forEach(c => {
                if (activeSessionsMap.has(c.username) && c.ownerId) {
                    activeOwnerMap[c.ownerId] = (activeOwnerMap[c.ownerId] || 0) + 1;
                }
            });
        }

        // 5. Assemble Response
        const stats = owners.map(owner => {
            const total = totalUsersByOwner[owner.id] || 0;
            const active = activeOwnerMap[owner.id] || 0;
            const offline = Math.max(0, total - active);

            return {
                id: owner.id,
                owner: owner.username, // Display Name
                fullName: owner.fullName,
                active,
                offline,
                total
            };
        });

        return NextResponse.json(stats);

    } catch (error) {
        console.error('Error fetching owner stats:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
