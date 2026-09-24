import { NextResponse } from 'next/server';
import { executeOltCommands } from '@/lib/olt-telnet';

export async function POST(request) {
    try {
        const data = await request.json();
        const { olt = 'olt1', slot_port, onu_id, serial, name, pppoe_user, pppoe_pass, vlan, profile, vlan_profile } = data;

        if (!slot_port || !onu_id || !serial) {
            return NextResponse.json({ status: 'error', message: 'Missing required fields' }, { status: 400 });
        }

        const commands = [
            `configure terminal`,
            `interface gpon-olt_${slot_port}`,
            `no onu ${onu_id}`,
            `exit`,
            `interface gpon-olt_${slot_port}`,
            `onu ${onu_id} type ALL-ONU sn ${serial}`,
            `exit`,
            `interface gpon-onu_${slot_port}:${onu_id}`,
            `name ${name}`,
            `tcont 1 profile ${profile}`,
            `gemport 1 name INET tcont 1`,
            `service-port 1 vport 1 user-vlan ${vlan} vlan ${vlan}`,
            `exit`,
            `pon-onu-mng gpon-onu_${slot_port}:${onu_id}`,
            `service INET gemport 1 vlan ${vlan}`,
            `wan-ip 1 mode pppoe username ${pppoe_user} password ${pppoe_pass} vlan-profile ${vlan_profile} host 1`,
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
