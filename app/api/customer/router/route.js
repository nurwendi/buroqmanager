import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { getUserFromRequest } from '@/lib/api-auth';
import { getConfig, getUserConnectionId } from '@/lib/config';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (user.role !== 'customer') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const customer = await db.customer.findFirst({
            where: {
                OR: [
                    ...(user.id ? [{ id: user.id }] : []),
                    { customerId: user.username },
                    { username: user.username }
                ]
            }
        });

        const pppoeUsername = customer?.username || user.pppoeUsername || user.username;
        const ownerId = customer?.ownerId || user.ownerId;

        const body = await request.json();
        const { action } = body;

        if (action === 'restart') {
            const config = await getConfig();
            const connectionId = getUserConnectionId({ role: 'agent', ownerId }, config);
            const client = await getMikrotikClient(connectionId);

            // Find active connection ID for this user using their PPPoE username
            const activeConnections = await client.write('/ppp/active/print', [
                `?name=${pppoeUsername}`
            ]);

            if (activeConnections.length > 0) {
                const id = activeConnections[0]['.id'];

                // Disconnect
                await client.write('/ppp/active/remove', [
                    `=.id=${id}`
                ]);

                globalThis._routerCache?.clear();

                return NextResponse.json({ success: true, message: 'Connection restarted' });
            } else {
                return NextResponse.json({ success: false, message: 'No active connection found' });
            }
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Error managing customer router:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


