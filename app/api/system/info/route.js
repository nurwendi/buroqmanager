
import { NextResponse } from 'next/server';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const cpus = os.cpus();
        const memoryTotal = os.totalmem();
        const memoryFree = os.freemem();
        const platform = os.platform();
        const type = os.type();
        const release = os.release();
        const hostname = os.hostname();
        const uptime = os.uptime();

        const data = {
            hostname,
            platform,
            type,
            release,
            memory: {
                total: memoryTotal,
                free: memoryFree,
                used: memoryTotal - memoryFree
            },
            cpu: {
                model: cpus[0]?.model || 'Unknown',
                cores: cpus.length,
                speed: cpus[0]?.speed || 0 // usually in MHz
            },
            uptime
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error('System info error:', error);
        return NextResponse.json({ error: 'Failed to fetch system info' }, { status: 500 });
    }
}
