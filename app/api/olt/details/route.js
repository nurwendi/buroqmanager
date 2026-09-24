import { NextResponse } from 'next/server';
import { executeOltCommands } from '@/lib/olt-telnet';

export async function POST(request) {
    try {
        const data = await request.json();
        const { olt = 'olt1', slot_port, serial } = data;

        if (!slot_port || !serial) {
            return NextResponse.json({ status: 'error', message: 'slot_port dan serial wajib diisi' }, { status: 400 });
        }

        const result = await executeOltCommands(olt, [`show gpon onu state gpon-olt_${slot_port}`]);
        const output = result.combinedOutput;

        const pattern = new RegExp(`${slot_port}:(\\d+)\\s+enable`, 'g');
        const ids = [];
        let match;
        while ((match = pattern.exec(output)) !== null) {
            ids.push(parseInt(match[1], 10));
        }

        let onu_id = 1;
        if (ids.length > 0) {
            onu_id = Math.max(...ids) + 1;
        }

        return NextResponse.json({
            status: 'success',
            slot_port,
            serial,
            onu_id
        });
    } catch (error) {
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}
