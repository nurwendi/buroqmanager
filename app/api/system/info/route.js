
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
        const arch = os.arch();
        const loadavg = os.loadavg(); // Array [1, 5, 15] min
        
        // Coba baca disk usage jika di Linux (opsional)
        let disk = null;
        try {
            const { execSync } = require('child_process');
            if (platform === 'linux') {
                const df = execSync("df -h / | tail -1 | awk '{print $2, $3, $4, $5}'").toString().trim().split(' ');
                if (df.length >= 4) {
                    disk = {
                        total: df[0],
                        used: df[1],
                        free: df[2],
                        percent: df[3]
                    };
                }
            }
        } catch (e) {
            // Ignore disk fetch error
        }

        const data = {
            hostname,
            platform,
            type,
            release,
            arch,
            nodeVersion: process.version,
            loadavg,
            disk,
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
            uptime,
            processUptime: process.uptime()
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error('System info error:', error);
        return NextResponse.json({ error: 'Failed to fetch system info' }, { status: 500 });
    }
}
