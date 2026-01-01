
import { NextResponse } from 'next/server';
import { rebootDevice } from '@/lib/genieacs';

export async function POST(request, { params }) {
    try {
        // Next.js App Router params are promise-based in newer versions, 
        // but typically passed as context. Wait, this is dynamic route file naming issue.
        // We need to create the file at [id]/reboot/route.js to get params.id
        // But here I'm writing to a fixed path? 
        // Wait, I should write this to `app/api/genieacs/device/[id]/reboot/route.js`
        // ERROR: The user requested generic path in plan, but for capturing ID we need dynamic route.
        // I will write this file assuming it is placed in [id]/reboot/

        // Actually, to implement `POST /api/genieacs/reboot` with body { deviceId } is easier for flat structure.
        // Let's stick to flat route with body for simplicity unless strict REST is needed.

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
