import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { getUserFromRequest } from '@/lib/api-auth';
import { getConfig, getUserConnectionId } from '@/lib/config';

async function getClientForUser(request) {
    const user = await getUserFromRequest(request);
    if (!user) {
        throw new Error('Unauthorized');
    }
    const config = await getConfig();
    let connectionId = getUserConnectionId(user, config);

    // Fallback: If no connection ID for staff/user, try owner's connection
    if (!connectionId && user.ownerId) {
        const ownerConn = config.connections?.find(c => c.ownerId === user.ownerId);
        if (ownerConn) connectionId = ownerConn.id;
    }

    // If no connection found for this user (and not superadmin), DO NOT fallback to global.
    // Return null to signal "no client available".
    if (!connectionId && user.role !== 'superadmin') {
        return null;
    }

    return getMikrotikClient(connectionId);
}

export async function GET(request) {
    try {
        const client = await getClientForUser(request);
        if (!client) return NextResponse.json([]); // Return empty if no router

        const profiles = await client.write('/ppp/profile/print');

        // Parse price from comment
        const profilesWithPrice = profiles.map(p => {
            let price = '';
            if (p.comment && p.comment.includes('price:')) {
                const match = p.comment.match(/price:(\d+)/);
                if (match) price = match[1];
            }
            return { ...p, price };
        });

        return NextResponse.json(profilesWithPrice);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const client = await getClientForUser(request);

        if (!client) {
            return NextResponse.json({ error: "No router configured. Please add a router first." }, { status: 400 });
        }

        const { name, localAddress, remoteAddress, rateLimit, price } = body;

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const addParams = [`=name=${name}`];
        if (localAddress) addParams.push(`=local-address=${localAddress}`);
        if (remoteAddress) addParams.push(`=remote-address=${remoteAddress}`);
        if (rateLimit) addParams.push(`=rate-limit=${rateLimit}`);
        if (price) addParams.push(`=comment=price:${price}`);

        const result = await client.write('/ppp/profile/add', addParams);

        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


