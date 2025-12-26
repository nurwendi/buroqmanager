import { NextResponse } from 'next/server';
import { getAllOnuDetails, deleteOnu } from '@/lib/olt/telnet-service';
import { parseOnuDetails } from '@/lib/olt/parser';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

function getEffectiveOwnerId(user) {
    return user.ownerId || user.id;
}

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return unauthorizedResponse();

        const ownerId = getEffectiveOwnerId(user);

        const { searchParams } = new URL(request.url);
        let oltId = searchParams.get('oltId');

        // Fallback
        if (!oltId) {
            const firstOlt = await import('@/lib/db').then(mod => mod.default.oltConfig.findFirst({
                where: { ownerId },
                select: { id: true }
            }));
            oltId = firstOlt?.id;
        }

        if (!oltId) return NextResponse.json([]);

        console.log(`[API] List ONUs: Fetching running-config for OLT ${oltId}...`);

        const rawConfig = await getAllOnuDetails(oltId);

        if (!rawConfig) {
            console.warn("[API] List ONUs: Empty config returned");
            return NextResponse.json([]);
        }

        console.log("[API] Config Length:", rawConfig.length);
        const onus = parseOnuDetails(rawConfig);
        console.log("[API] Parsed ONUs:", onus.length);

        return NextResponse.json(onus);
    } catch (error) {
        console.error("ONU List API Error:", error);
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return unauthorizedResponse();

        const ownerId = getEffectiveOwnerId(user);
        const body = await request.json();
        const { slotPort, onuId, oltId: reqOltId } = body;

        let oltId = reqOltId;
        if (!oltId) {
            const firstOlt = await import('@/lib/db').then(mod => mod.default.oltConfig.findFirst({
                where: { ownerId },
                select: { id: true }
            }));
            oltId = firstOlt?.id;
        }

        if (!slotPort || !onuId) {
            return NextResponse.json({ error: 'Missing slotPort or onuId' }, { status: 400 });
        }

        if (!oltId) return NextResponse.json({ error: 'No OLT found' }, { status: 404 });

        console.log(`[API ${oltId}] Deleting ONU ${slotPort}:${onuId}`);
        const result = await deleteOnu(slotPort, onuId, oltId);

        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error("ONU Delete API Error:", error);
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}

