import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const setting = await db.systemSetting.findUnique({
            where: { key: 'olt_config' }
        });

        if (!setting) {
            return NextResponse.json({});
        }

        const config = JSON.parse(setting.value);
        // Mask password for security
        return NextResponse.json({
            ...config,
            password: config.password ? '********' : ''
        });
    } catch (error) {
        console.error("Get OLT Settings Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { host, port, username, password } = body;

        // Fetch existing to handle partial updates or password retention if empty
        const existing = await db.systemSetting.findUnique({
            where: { key: 'olt_config' }
        });

        let newConfig = { host, port, username };

        if (password && password !== '********') {
            newConfig.password = password;
        } else if (existing) {
            const oldConfig = JSON.parse(existing.value);
            newConfig.password = oldConfig.password;
        }

        await db.systemSetting.upsert({
            where: { key: 'olt_config' },
            update: { value: JSON.stringify(newConfig) },
            create: { key: 'olt_config', value: JSON.stringify(newConfig) }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Save OLT Settings Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
