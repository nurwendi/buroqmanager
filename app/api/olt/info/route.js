import { NextResponse } from 'next/server';
import { runOltCommand } from '@/lib/olt/telnet-service';
import { parseSystemGroup } from '@/lib/olt/parser';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return unauthorizedResponse();

        const ownerId = user.ownerId || user.id;

        // Get oltId from query params
        const { searchParams } = new URL(request.url);
        let oltId = searchParams.get('oltId');

        // Automatic Fallback: Get first OLT if not specified
        if (!oltId) {
            const firstOlt = await import('@/lib/db').then(mod => mod.default.oltConfig.findFirst({
                where: { ownerId },
                select: { id: true }
            }));
            if (firstOlt) oltId = firstOlt.id;
        }

        if (!oltId) {
            return NextResponse.json({ error: "No OLT configured" }, { status: 404 });
        }

        console.log(`[API ${oltId}] Fetching OLT System Group...`);
        const rawOutput = await runOltCommand("show system-group", oltId);
        console.log("[API] Raw OLT Output length:", rawOutput?.length);

        if (!rawOutput) {
            throw new Error("Empty response from OLT");
        }

        const data = parseSystemGroup(rawOutput);
        return NextResponse.json(data);
    } catch (error) {
        console.error("OLT Info API Error:", error);
        return NextResponse.json({
            error: error.message,
            stack: error.stack, // Helpful for debugging
            details: "Check server logs for more info"
        }, { status: 500 });
    }
}
