import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import { getConfig, getUserConnectionId } from '@/lib/config';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || user.role === 'customer') {
            return unauthorizedResponse();
        }

        const config = await getConfig();
        const connectionId = getUserConnectionId(user, config);
        if (!connectionId && user.role !== 'superadmin') {
            return NextResponse.json([]);
        }

        const client = await getMikrotikClient(connectionId);
        const interfaces = await client.write('/interface/print', [
            '.proplist=name,type,running,disabled'
        ]);

        // Return only necessary fields
        const simplifiedInterfaces = interfaces.map(iface => ({
            name: iface.name,
            type: iface.type,
            running: iface.running === 'true',
            disabled: iface.disabled === 'true'
        }));

        return NextResponse.json(simplifiedInterfaces);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


