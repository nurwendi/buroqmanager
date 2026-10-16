import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { getUserFromRequest } from '@/lib/api-auth';
import { getConfig, getUserConnectionId } from '@/lib/config';

export async function DELETE(request, { params }) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
        }

        const config = await getConfig();
        let connectionId = getUserConnectionId(user, config);
        let targetId = id;

        if (id && id.includes('_')) {
            const parts = id.split('_');
            connectionId = parts[0];
            targetId = parts.slice(1).join('_');
        }

        const client = await getMikrotikClient(connectionId);

        // Remove the active connection
        await client.write(['/ppp/active/remove', `=.id=${targetId}`]);
        globalThis._routerCache?.clear();

        return NextResponse.json({ success: true, message: 'Connection disconnected' });
    } catch (error) {
        console.error('Error disconnecting user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
