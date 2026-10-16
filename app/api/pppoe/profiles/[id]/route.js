import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { getUserFromRequest } from '@/lib/api-auth';
import { getConfig, getUserConnectionId } from '@/lib/config';

export async function PUT(request, { params }) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const config = await getConfig();
        const connectionId = getUserConnectionId(user, config);
        const client = await getMikrotikClient(connectionId);
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });
        }

        const body = await request.json();
        const { localAddress, remoteAddress, rateLimit, price } = body;

        // Only block the two default Mikrotik profiles
        if (id === '*0' || id === '*FFFFFFFE') {
            return NextResponse.json({
                error: "Cannot modify built-in default profiles (default, default-encryption)."
            }, { status: 400 });
        }

        const updateParams = [`=.id=${id}`];
        if (localAddress !== undefined && localAddress !== '') updateParams.push(`=local-address=${localAddress}`);
        if (remoteAddress !== undefined && remoteAddress !== '') updateParams.push(`=remote-address=${remoteAddress}`);
        if (rateLimit !== undefined && rateLimit !== '') updateParams.push(`=rate-limit=${rateLimit}`);
        if (price !== undefined) updateParams.push(`=comment=price:${price}`);

        await client.write('/ppp/profile/set', updateParams);
        globalThis._routerCache?.clear();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const config = await getConfig();
        const connectionId = getUserConnectionId(user, config);
        const client = await getMikrotikClient(connectionId);
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });
        }

        // Only block the two default Mikrotik profiles
        if (id === '*0' || id === '*FFFFFFFE') {
            return NextResponse.json({
                error: "Cannot delete built-in default profiles (default, default-encryption)."
            }, { status: 400 });
        }

        await client.write(['/ppp/profile/remove', `=.id=${id}`]);
        globalThis._routerCache?.clear();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Profile delete error:', error);
        return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }
}
