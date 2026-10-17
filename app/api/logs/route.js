import { NextResponse } from 'next/server';
import { getLogs } from '@/lib/logs-db';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return unauthorizedResponse();
        }

        // Determine effective OwnerId for filtering
        let ownerId = null;
        if (user.role === 'admin') ownerId = user.id;
        else if (user.role !== 'superadmin') ownerId = user.ownerId;

        // Customer fast path: query customer's own logs directly from DB
        if (user.role === 'customer') {
            const customer = await db.customer.findFirst({
                where: {
                    OR: [
                        { customerId: user.username },
                        { username: user.username }
                    ]
                },
                select: { username: true, ownerId: true }
            });
            const pppoeUser = customer?.username || user.username;
            const custOwnerId = customer?.ownerId || ownerId;

            const userLogs = await db.log.findMany({
                where: {
                    ...(custOwnerId ? { ownerId: custOwnerId } : {}),
                    OR: [
                        { username: pppoeUser },
                        { username: null },
                        { message: { startsWith: `${pppoeUser} :` } }
                    ]
                },
                orderBy: { createdAt: 'desc' },
                take: 50
            });

            return NextResponse.json(userLogs.map(log => ({
                id: log.id,
                timestamp: log.createdAt.toISOString(),
                message: log.message,
                username: log.username,
                status: log.status,
                ownerId: log.ownerId
            })));
        }

        const { getConfig, getUserConnectionId } = await import('@/lib/config');
        const config = await getConfig();
        const connectionId = getUserConnectionId(user, config);

        let logs = await getLogs(ownerId);

        // Self-healing: If logs are empty, try to sync immediately
        if (logs.length === 0) {
            console.log(`Logs empty for owner ${ownerId}, forcing sync...`);
            const { syncLogs } = await import('@/lib/logs-db');
            await syncLogs(ownerId, connectionId);
            logs = await getLogs(ownerId);
        }

        // Admins/Partners/Others see all tenant logs
        return NextResponse.json(logs);
    } catch (error) {
        console.error('Error fetching logs:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || user.role === 'customer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { message, username, status } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Determine Owner Context
        const ownerId = user.role === 'admin' ? user.id : user.ownerId;

        const { addLog } = await import('@/lib/logs-db');
        await addLog(message, {
            username: username || null,
            ownerId: ownerId,
            status: status || 'info'
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Log Entry Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
