import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import db from '@/lib/db';

const MAX_HISTORY_DAYS = 3;
const SAMPLE_INTERVAL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
    try {
        const client = await getMikrotikClient();

        // Fetch system resources
        const resources = await client.write('/system/resource/print');
        const resource = resources[0] || {};
        const cpuLoad = parseInt(resource['cpu-load'] || 0);

        // Get latest metric to check interval
        const lastMetric = await db.systemMetric.findFirst({
            where: { type: 'cpu' },
            orderBy: { timestamp: 'desc' }
        });

        const shouldAddNew = !lastMetric || (Date.now() - lastMetric.timestamp.getTime()) >= SAMPLE_INTERVAL;

        if (shouldAddNew) {
            await db.systemMetric.create({
                data: {
                    type: 'cpu',
                    value: cpuLoad,
                    timestamp: new Date()
                }
            });

            // Prune old data
            const cutoff = new Date(Date.now() - (MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000));
            await db.systemMetric.deleteMany({
                where: {
                    type: 'cpu',
                    timestamp: { lt: cutoff }
                }
            });
        }

        // Return history
        const history = await db.systemMetric.findMany({
            where: { type: 'cpu' },
            orderBy: { timestamp: 'asc' }
        });

        return NextResponse.json({
            current: cpuLoad,
            history: history.map(h => ({
                time: new Date(h.timestamp).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                cpuLoad: h.value,
                timestamp: h.timestamp.getTime(),
                date: new Date(h.timestamp).toLocaleString()
            }))
        });

    } catch (error) {
        console.error('CPU API error:', error);
        return NextResponse.json({
            error: error.message,
            current: 0,
            history: []
        }, { status: 500 });
    }
}


