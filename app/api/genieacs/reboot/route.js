
import { NextResponse } from 'next/server';
import { rebootDevice } from '@/lib/genieacs';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

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

        await rebootDevice(deviceId);
        return NextResponse.json({ success: true, message: 'Reboot task queued' });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
