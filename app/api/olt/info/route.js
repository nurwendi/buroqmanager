import { NextResponse } from 'next/server';
import { runOltCommand } from '@/lib/olt/telnet-service';
import { parseSystemGroup } from '@/lib/olt/parser';

export async function GET() {
    try {
        console.log("[API] Fetching OLT System Group...");
        const rawOutput = await runOltCommand("show system-group");
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
