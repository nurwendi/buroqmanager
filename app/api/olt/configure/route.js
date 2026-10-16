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
        const {
            olt = 'olt1',
            slot_port,
            onu_id,
            serial,
            name = '',
            pppoe_user = '',
            pppoe_pass = '',
            vlan = '',
            profile = '',
            vlan_profile = ''
        } = data;

        const cleanSlotPort = sanitizeOltInput(slot_port);
        const cleanOnuId = sanitizeOltInput(onu_id);
        const cleanSerial = sanitizeOltInput(serial);

        if (!cleanSlotPort || !cleanOnuId || !cleanSerial) {
            return NextResponse.json({ status: 'error', message: 'Missing required fields' }, { status: 400 });
        }

        const cleanName = sanitizeOltInput(name);
        const cleanPppoeUser = sanitizeOltInput(pppoe_user);
        const cleanPppoePass = sanitizeOltInput(pppoe_pass);
        const cleanVlan = sanitizeOltInput(vlan);
        const cleanProfile = sanitizeOltInput(profile);
        const cleanVlanProfile = sanitizeOltInput(vlan_profile);

        const commands = [
            `configure terminal`,
            `interface gpon-olt_${cleanSlotPort}`,
            `no onu ${cleanOnuId}`,
            `exit`,
            `interface gpon-olt_${cleanSlotPort}`,
            `onu ${cleanOnuId} type ALL-ONU sn ${cleanSerial}`,
            `exit`,
            `interface gpon-onu_${cleanSlotPort}:${cleanOnuId}`,
            `name ${cleanName}`,
            `tcont 1 profile ${cleanProfile}`,
            `gemport 1 name INET tcont 1`,
            `service-port 1 vport 1 user-vlan ${cleanVlan} vlan ${cleanVlan}`,
            `exit`,
            `pon-onu-mng gpon-onu_${cleanSlotPort}:${cleanOnuId}`,
            `service INET gemport 1 vlan ${cleanVlan}`,
            `wan-ip 1 mode pppoe username ${cleanPppoeUser} password ${cleanPppoePass} vlan-profile ${cleanVlanProfile} host 1`,
            `wan 1 service internet host 1`,
            `end`
        ];

        const result = await executeOltCommands(olt, commands);

        return NextResponse.json({
            status: 'success',
            message: 'ONU configured successfully',
            details: result.combinedOutput
        });

    } catch (error) {
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}
