import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import db from '@/lib/db';

const MAX_HISTORY_DAYS = 3;
const SAMPLE_INTERVAL = 5 * 60 * 1000;

export async function GET() {
    try {
        const client = await getMikrotikClient();
        let temperature = null;
        let sensorName = null;

        try {
            const health = await client.write('/system/health/print');
            const tempItem = health.find(h =>
                h.name === 'temperature' ||
                h.name === 'cpu-temperature' ||
                h.name === 'board-temperature' ||
                h.name === 'board-temperature1'
            );

            if (tempItem) {
                temperature = parseInt(tempItem.value);
                sensorName = tempItem.name;
            }
        } catch (e) {
            // No sensor
        }

        if (temperature !== null) {
            const lastMetric = await db.systemMetric.findFirst({
                where: { type: 'temperature' },
                orderBy: { timestamp: 'desc' }
            });

            const shouldAddNew = !lastMetric || (Date.now() - lastMetric.timestamp.getTime()) >= SAMPLE_INTERVAL;

            if (shouldAddNew) {
                await db.systemMetric.create({
                    data: {
                        type: 'temperature',
                        value: temperature,
                        metadata: sensorName,
                        timestamp: new Date()
                    }
                });

                const cutoff = new Date(Date.now() - (MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000));
                await db.systemMetric.deleteMany({
                    where: {
                        type: 'temperature',
                        timestamp: { lt: cutoff }
                    }
                });
            }

            const history = await db.systemMetric.findMany({
                where: { type: 'temperature' },
                orderBy: { timestamp: 'asc' }
            });

            return NextResponse.json({
                current: temperature,
                sensorName,
                history: history.map(h => ({
                    time: new Date(h.timestamp).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    temperature: h.value,
                    timestamp: h.timestamp.getTime(),
                    date: new Date(h.timestamp).toLocaleString()
                }))
            });
        }

        return NextResponse.json({
            current: null,
            sensorName: null,
            history: [],
            message: 'Temperature sensor not available on this device'
        });

    } catch (error) {
        console.error('Temperature API error:', error);
        return NextResponse.json({
            error: error.message,
            current: null,
            history: []
        }, { status: 500 });
    }
}


