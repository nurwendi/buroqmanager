import { NextResponse } from 'next/server';
import { executeOltCommands } from '@/lib/olt-telnet';

export async function POST(request) {
    try {
        const data = await request.json();
        const oltKey = data.olt || 'olt1';

        const result = await executeOltCommands(oltKey, ['show pon onu uncfg']);
        
        if (!result.success) {
            return NextResponse.json({ status: 'error', message: 'Failed to connect' }, { status: 400 });
        }

        const output = result.combinedOutput;
        const pattern = /gpon-olt_(\d+\/\d+\/\d+)\s+\S+\s+([A-Z0-9]{12})/g;
        const detected = [];
        let match;

        while ((match = pattern.exec(output)) !== null) {
            detected.push({
                slot_port: match[1],
                serial: match[2]
            });
        }

        if (detected.length === 0) {
            return NextResponse.json({ status: 'error', message: 'Onu Belum Terkonfigurasi Tidak Ditemukan' }, { status: 404 });
        }

        return NextResponse.json({
            status: 'success',
            onus: detected
        });
    } catch (error) {
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}
