import { NextResponse } from 'next/server';
import { runOltCommand } from '@/lib/olt/telnet-service';
import { parseOnuState } from '@/lib/olt/parser';

export async function GET() {
    try {
        const rawOutput = await runOltCommand("show gpon onu state");
        const data = parseOnuState(rawOutput);
        return NextResponse.json(data);
    } catch (error) {
        console.error("OLT Stats API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
