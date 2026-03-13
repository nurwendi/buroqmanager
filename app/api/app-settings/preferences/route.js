import { NextResponse } from 'next/server';
import db from '@/lib/db';

const SETTING_KEY = 'app_preferences';

async function getPreferences() {
    try {
        const setting = await db.systemSetting.findUnique({
            where: { key: SETTING_KEY }
        });

        if (setting) {
            return JSON.parse(setting.value);
        }

        // Default settings
        return {
            display: {
                theme: 'system',
            },
            dashboard: {
                refreshInterval: 5000
            }
        };
    } catch (error) {
        return {
            display: { theme: 'system' },
            dashboard: { refreshInterval: 5000 }
        };
    }
}

async function savePreferences(preferences) {
    await db.systemSetting.upsert({
        where: { key: SETTING_KEY },
        update: { value: JSON.stringify(preferences) },
        create: { key: SETTING_KEY, value: JSON.stringify(preferences) }
    });
}

export async function GET() {
    const preferences = await getPreferences();
    return NextResponse.json(preferences);
}

export async function POST(request) {
    try {
        const newPreferences = await request.json();
        const currentPreferences = await getPreferences();

        // Deep merge or overwrite sections
        const updatedPreferences = {
            ...currentPreferences,
            ...newPreferences,
            display: { ...currentPreferences.display, ...newPreferences.display },
            dashboard: { ...currentPreferences.dashboard, ...newPreferences.dashboard },
            logs: { ...currentPreferences.logs, ...newPreferences.logs },
            tables: { ...currentPreferences.tables, ...newPreferences.tables }
        };

        await savePreferences(updatedPreferences);
        return NextResponse.json({ message: 'Preferences saved successfully', preferences: updatedPreferences });
    } catch (error) {
        console.error("Save prefs error:", error);
        return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
    }
}
