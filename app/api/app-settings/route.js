import { NextResponse } from 'next/server';
import db from '@/lib/db';

const SETTINGS_KEY = 'app_settings';

export async function GET() {
    try {
        const setting = await db.systemSetting.findUnique({
            where: { key: SETTINGS_KEY }
        });

        if (setting) {
            return NextResponse.json(JSON.parse(setting.value));
        }

        // Default
        return NextResponse.json({ appName: 'Buroq Billing', logoUrl: '' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to read settings' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { appName, logoUrl } = body;

        // Fetch existing settings to preserve other fields like faviconUrl
        const existingRecord = await db.systemSetting.findUnique({
            where: { key: SETTINGS_KEY }
        });

        let currentSettings = {};
        if (existingRecord) {
            currentSettings = JSON.parse(existingRecord.value);
        }

        const settings = {
            ...currentSettings,
            appName: appName || currentSettings.appName || 'Buroq Billing',
            logoUrl: logoUrl || currentSettings.logoUrl || ''
        };

        await db.systemSetting.upsert({
            where: { key: SETTINGS_KEY },
            update: { value: JSON.stringify(settings) },
            create: { key: SETTINGS_KEY, value: JSON.stringify(settings) }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
