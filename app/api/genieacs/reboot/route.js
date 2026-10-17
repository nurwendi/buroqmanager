import { NextResponse } from 'next/server';
import { rebootDevice, getDevice, parseGenieACSDevice } from '@/lib/genieacs';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import db from '@/lib/db';

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return unauthorizedResponse();
        }

        const body = await request.json();
        const { deviceId } = body;

        if (!deviceId) {
            return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
        }

        // Verify ownership for non-superadmin users
        if (user.role !== 'superadmin') {
            const deviceRaw = await getDevice(deviceId);
            if (!deviceRaw) {
                return NextResponse.json({ error: 'Device not found' }, { status: 404 });
            }
            const parsedDevice = parseGenieACSDevice(deviceRaw);
            const deviceUser = (parsedDevice.pppoe_user || '').trim();

            if (user.role === 'customer') {
                const customer = await db.customer.findFirst({
                    where: {
                        OR: [
                            { customerId: user.username },
                            { username: user.username }
                        ]
                    },
                    select: { username: true }
                });
                const cleanRouterUser = deviceUser.split('@')[0].trim().toLowerCase();
                const cleanDbUser = (customer?.username || '').split('@')[0].trim().toLowerCase();
                if (!customer || !cleanRouterUser || cleanRouterUser !== cleanDbUser) {
                    return NextResponse.json({ error: 'Access Denied: You do not own this device.' }, { status: 403 });
                }
            } else {
                const ownerId = user.role === 'admin' ? user.id : user.ownerId;
                const customer = await db.customer.findFirst({
                    where: { username: deviceUser, ownerId },
                    select: { id: true }
                });
                if (!customer) {
                    return NextResponse.json({ error: 'Access Denied: Device does not belong to your tenant.' }, { status: 403 });
                }
            }
        }

        await rebootDevice(deviceId);
        return NextResponse.json({ success: true, message: 'Reboot task queued' });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
