import { NextResponse } from 'next/server';
import { getLogs } from '@/lib/logs-db';
import { getUserFromRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);

        // Determine effective OwnerId for filtering
        let ownerId = null;
        let connectionId = null;
        if (user) {
            if (user.role === 'admin') ownerId = user.id;
            else if (user.role !== 'superadmin') ownerId = user.ownerId; // Staff

            // Get Connection ID
            const config = await (await import('@/lib/config')).getConfig();
            const { getUserConnectionId } = await import('@/lib/config');
            connectionId = getUserConnectionId(user, config);
        }

        let logs = await getLogs(ownerId);

        // Self-healing: If logs are empty, try to sync immediately
        if (logs.length === 0) {
            console.log(`Logs empty for owner ${ownerId}, forcing sync...`);
            const { syncLogs } = await import('@/lib/logs-db');
            await syncLogs(ownerId, connectionId);
            logs = await getLogs(ownerId);
        }

        if (user) {
            // If user is a customer, filter logs to only show their own
            if (user.role === 'customer') {
                const userLogs = logs.filter(log =>
                    log.username === user.username ||
                    log.username === null || // Broadcast/System message
                    (log.message && log.message.startsWith(user.username + ' :'))
                );
                return NextResponse.json(userLogs);
            }
        }

        // Admins/Partners/Others see all
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
        const ownerId = decoded.role === 'admin' ? decoded.id : decoded.ownerId;

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
