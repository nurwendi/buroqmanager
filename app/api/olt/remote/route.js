import { NextResponse } from 'next/server';
import { executeOltCommands } from '@/lib/olt-telnet';

export async function POST(request) {
    try {
        const data = await request.json();
        const { olt = 'olt1', slot_port } = data;

        if (!slot_port) {
            return NextResponse.json({ status: 'error', message: 'Slot/Port wajib diisi' }, { status: 400 });
        }

        const commands = [
            "configure terminal",
            `pon-onu-mng gpon-onu_${slot_port}`,
            "security-mgmt 212 state enable mode forward protocol web",
            "exit",
            "exit"
        ];

        const result = await executeOltCommands(olt, commands);

        return NextResponse.json({
            status: 'success',
            message: 'Remote ONU berhasil diaktifkan!',
            details: result.combinedOutput
        });
    } catch (error) {
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}
