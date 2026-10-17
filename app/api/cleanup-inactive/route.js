
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
            return unauthorizedResponse();
        }

        const now = new Date();
        const cutoffDate = new Date(now.setMonth(now.getMonth() - 3));

        const ownerFilter = user.role === 'admin' ? { ownerId: user.id } : {};

        // 1. Get all customers Older than cutoffDate directly from DB
        const customers = await db.customer.findMany({
            where: {
                ...ownerFilter,
                createdAt: { lte: cutoffDate }
            },
            select: { id: true, username: true, name: true, createdAt: true }
        });

        if (customers.length === 0) {
            return NextResponse.json([]);
        }

        // 2. Get list of "Active" usernames (Seen in last 3 months or currently online)
        const activeSessions = await db.radAcct.findMany({
            where: {
                OR: [
                    { acctstoptime: { gt: cutoffDate } },
                    { acctstoptime: null }
                ]
            },
            select: { username: true },
            distinct: ['username']
        });

        const activeUsernames = new Set(activeSessions.map(s => s.username));

        // Filter candidate inactive customers
        const candidateCustomers = customers.filter(c => !activeUsernames.has(c.username));
        if (candidateCustomers.length === 0) {
            return NextResponse.json([]);
        }

        // 3. Batch-fetch last seen acctstoptime for all candidates in a single groupBy query
        const candidateUsernames = candidateCustomers.map(c => c.username);
        const lastSeenGroups = await db.radAcct.groupBy({
            by: ['username'],
            where: { username: { in: candidateUsernames } },
            _max: { acctstoptime: true }
        });
        const lastSeenMap = new Map(
            lastSeenGroups.map(g => [g.username, g._max?.acctstoptime || null])
        );

        const inactiveUsers = candidateCustomers.map(customer => {
            const hasSessionRecord = lastSeenMap.has(customer.username);
            const lastStopTime = lastSeenMap.get(customer.username);
            return {
                ...customer,
                lastSeen: lastStopTime ? lastStopTime : 'Never',
                status: hasSessionRecord ? 'Inactive' : 'Never Connected'
            };
        });

        return NextResponse.json(inactiveUsers);
    } catch (error) {
        console.error("Cleanup scan error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
            return unauthorizedResponse();
        }

        const body = await request.json();
        const { usernames } = body;

        if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
            return NextResponse.json({ error: 'Usernames array required' }, { status: 400 });
        }

        const ownerFilter = user.role === 'admin' ? { ownerId: user.id } : {};

        // Verify ownership if admin
        let allowedUsernames = usernames;
        if (user.role === 'admin') {
            const ownedCusts = await db.customer.findMany({
                where: { username: { in: usernames }, ownerId: user.id },
                select: { username: true }
            });
            allowedUsernames = ownedCusts.map(c => c.username);
        }

        if (allowedUsernames.length === 0) {
            return NextResponse.json({ success: true, deleted: [], errors: [] });
        }

        // Execute batch deletion across Radius & Customer tables in a single transaction
        await db.$transaction([
            db.radCheck.deleteMany({ where: { username: { in: allowedUsernames } } }),
            db.radReply.deleteMany({ where: { username: { in: allowedUsernames } } }),
            db.radUserGroup.deleteMany({ where: { username: { in: allowedUsernames } } }),
            db.customer.deleteMany({
                where: {
                    username: { in: allowedUsernames },
                    ...ownerFilter
                }
            })
        ]);

        return NextResponse.json({ success: true, deleted: allowedUsernames, errors: [] });
    } catch (error) {
        console.error("Cleanup delete error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
