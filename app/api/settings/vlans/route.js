import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const setting = await db.systemSetting.findUnique({
            where: { key: 'olt_vlan_list' }
        });

        let vlans = [];
        if (setting && setting.value) {
            try {
                vlans = JSON.parse(setting.value);
            } catch (e) {
                console.error("Failed to parse VLAN list", e);
            }
        }

        // Default if empty
        if (vlans.length === 0) {
            vlans = ["143", "200", "300"]; // Example defaults
        }

        return NextResponse.json(vlans);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { vlan } = body;

        if (!vlan) return NextResponse.json({ error: "VLAN is required" }, { status: 400 });

        const setting = await db.systemSetting.findUnique({
            where: { key: 'olt_vlan_list' }
        });

        let vlans = [];
        if (setting && setting.value) {
            vlans = JSON.parse(setting.value);
        }

        // Add if not exists
        const vlanStr = String(vlan);
        if (!vlans.includes(vlanStr)) {
            vlans.push(vlanStr);
            vlans.sort((a, b) => parseInt(a) - parseInt(b)); // Keep sorted

            await db.systemSetting.upsert({
                where: { key: 'olt_vlan_list' },
                update: { value: JSON.stringify(vlans) },
                create: { key: 'olt_vlan_list', value: JSON.stringify(vlans) }
            });
        }

        return NextResponse.json({ success: true, vlans });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
