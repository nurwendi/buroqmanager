import { NextResponse } from 'next/server';
import { runOltCommand } from '@/lib/olt/telnet-service';
import { parseOnuState } from '@/lib/olt/parser';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return unauthorizedResponse();

        const ownerId = user.ownerId || user.id;

        const { searchParams } = new URL(request.url);
        let oltId = searchParams.get('oltId');

        if (!oltId) {
            const firstOlt = await import('@/lib/db').then(mod => mod.default.oltConfig.findFirst({ where: { ownerId }, select: { id: true } }));
            if (firstOlt) oltId = firstOlt.id;
        }

        if (!oltId) return NextResponse.json({});

        const rawOutput = await runOltCommand("show gpon onu state", oltId);
        const data = parseOnuState(rawOutput);
        return NextResponse.json(data);
    } catch (error) {
        console.error("OLT Stats API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
