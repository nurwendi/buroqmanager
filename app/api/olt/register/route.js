import { NextResponse } from 'next/server';
import { registerOnu } from '@/lib/olt/telnet-service';

export async function POST(req) {
    try {
        const body = await req.json();
        // Validation could be added here

        const logs = await registerOnu(body);

        return NextResponse.json({ success: true, logs });
    } catch (error) {
        console.error("Registration API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
