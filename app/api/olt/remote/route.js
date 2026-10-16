import { NextResponse } from 'next/server';
import { executeOltCommands, sanitizeOltInput } from '@/lib/olt-telnet';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || !['superadmin', 'admin', 'manager', 'technician', 'staff'].includes(user.role)) {
            return unauthorizedResponse();
        }

        const data = await request.json();
        const { olt = 'olt1', slot_port } = data;

        const cleanSlotPort = sanitizeOltInput(slot_port);
        if (!cleanSlotPort) {
            return NextResponse.json({ status: 'error', message: 'Slot/Port wajib diisi' }, { status: 400 });
        }

        const commands = [
            "configure terminal",
            `pon-onu-mng gpon-onu_${cleanSlotPort}`,
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
