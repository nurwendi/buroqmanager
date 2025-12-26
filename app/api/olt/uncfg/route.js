import { NextResponse } from 'next/server';
import { getUnconfiguredOnus } from '@/lib/olt/telnet-service';
import { parseUnconfiguredOnus } from '@/lib/olt/parser';

export async function GET() {
    try {
        const raw = await getUnconfiguredOnus();
        const data = parseUnconfiguredOnus(raw);
        return NextResponse.json(data);
    } catch (error) {
        console.error("Discovery API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
