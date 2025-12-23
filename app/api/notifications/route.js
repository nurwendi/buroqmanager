import { NextResponse } from 'next/server';
import { getNotifications } from '@/lib/notifications-db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        let decoded = null;
        if (token) decoded = await verifyToken(token);

        // Determine effective OwnerId for filtering
        let ownerId = null;
        let connectionId = null;
        if (decoded) {
            if (decoded.role === 'admin') ownerId = decoded.id;
            else if (decoded.role !== 'superadmin') ownerId = decoded.ownerId; // Staff

            // Get Connection ID
            const config = await (await import('@/lib/config')).getConfig();
            const { getUserConnectionId } = await import('@/lib/config');
            connectionId = getUserConnectionId(decoded, config);
        }

        let logs = await getNotifications(ownerId);

        // Self-healing: If logs are empty, try to sync immediately
        if (logs.length === 0) {
            console.log(`Notifications empty for owner ${ownerId}, forcing sync...`);
            const { syncNotifications } = await import('@/lib/notifications-db');
            await syncNotifications(ownerId, connectionId);
            logs = await getNotifications(ownerId);
        }

        if (token) {
            const decoded = await verifyToken(token);
            // If user is a customer, filter logs to only show their own
            if (decoded && decoded.role === 'customer') {
                const userLogs = logs.filter(log =>
                    log.username === decoded.username ||
                    (log.message && log.message.startsWith(decoded.username + ' :'))
                );
                return NextResponse.json(userLogs);
            }
        }

        // Admins/Partners/Others see all
        return NextResponse.json(logs);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
