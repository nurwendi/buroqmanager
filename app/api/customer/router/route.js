import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const token = cookies().get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = await verifyToken(token);
        if (!decoded || decoded.role !== 'customer') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const username = decoded.username;
        const body = await request.json();
        const { action } = body;

        if (action === 'restart') {
            const client = await getMikrotikClient();

            // Find active connection ID for this user
            // We use the PPPoE username which matches the login username
            const activeConnections = await client.write('/ppp/active/print', [
                `?name=${username}`
            ]);

            if (activeConnections.length > 0) {
                const id = activeConnections[0]['.id'];

                // Disconnect
                await client.write('/ppp/active/remove', [
                    `=.id=${id}`
                ]);

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


