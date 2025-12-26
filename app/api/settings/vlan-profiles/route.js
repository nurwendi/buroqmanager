import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const setting = await db.systemSetting.findUnique({
            where: { key: 'olt_vlan_profiles' }
        });

        let profiles = [];
        if (setting && setting.value) {
            try {
                profiles = JSON.parse(setting.value);
            } catch (e) {
                console.error("Failed to parse VLAN Profile list", e);
            }
        }

        // Default if empty
        if (profiles.length === 0) {
            profiles = ["default", "netmedia143", "netmedia200"];
        }

        return NextResponse.json(profiles);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { profile } = body;

        if (!profile) return NextResponse.json({ error: "Profile name is required" }, { status: 400 });

        const setting = await db.systemSetting.findUnique({
            where: { key: 'olt_vlan_profiles' }
        });

        let profiles = [];
        if (setting && setting.value) {
            profiles = JSON.parse(setting.value);
        }

        if (!profiles.includes(profile)) {
            profiles.push(profile);
            profiles.sort();

            await db.systemSetting.upsert({
                where: { key: 'olt_vlan_profiles' },
                update: { value: JSON.stringify(profiles) },
                create: { key: 'olt_vlan_profiles', value: JSON.stringify(profiles) }
            });
        }

        return NextResponse.json({ success: true, profiles });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
