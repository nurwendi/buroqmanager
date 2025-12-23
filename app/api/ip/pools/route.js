import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { getUserFromRequest } from '@/lib/api-auth';
import { getConfig, getUserConnectionId } from '@/lib/config';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const config = await getConfig();
        const connectionId = getUserConnectionId(user, config);

        if (!connectionId && user.role !== 'superadmin') {
            return NextResponse.json([]);
        }

        const client = await getMikrotikClient(connectionId);
        const pools = await client.write('/ip/pool/print');
        return NextResponse.json(pools);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


