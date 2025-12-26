import { NextResponse } from 'next/server';
import { registerOnu } from '@/lib/olt/telnet-service';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export async function POST(req) {
    try {
        const user = await getUserFromRequest(req);
        if (!user) return unauthorizedResponse();

        const ownerId = user.ownerId || user.id;
        const body = await req.json();

        let { oltId } = body;
        if (!oltId) {
            const firstOlt = await import('@/lib/db').then(mod => mod.default.oltConfig.findFirst({ where: { ownerId }, select: { id: true } }));
            if (firstOlt) oltId = firstOlt.id;
        }

        if (!oltId) return NextResponse.json({ error: "No OLT selected" }, { status: 400 });

        // Pass oltId (not ownerId) to the service
        const logs = await registerOnu({ ...body, oltId });

        return NextResponse.json({ success: true, logs });
    } catch (error) {
        console.error("Registration API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
