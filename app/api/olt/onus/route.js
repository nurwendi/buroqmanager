import { NextResponse } from 'next/server';
import { getAllOnuDetails, deleteOnu } from '@/lib/olt/telnet-service';
import { parseOnuDetails } from '@/lib/olt/parser';

export async function GET() {
    try {
        console.log("[API] List ONUs: Fetching running-config...");
        const rawConfig = await getAllOnuDetails();

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
        const body = await request.json();
        const { slotPort, onuId } = body;

        if (!slotPort || !onuId) {
            return NextResponse.json({ error: 'Missing slotPort or onuId' }, { status: 400 });
        }

        console.log(`[API] Deleting ONU ${slotPort}:${onuId}`);
        const result = await deleteOnu(slotPort, onuId);

        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error("ONU Delete API Error:", error);
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}

