
import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/config';
import db from '@/lib/db';

const SETTINGS_KEY = 'billing_config';

async function getBillingSettings() {
    try {
        const setting = await db.systemSetting.findUnique({
            where: { key: SETTINGS_KEY }
        });

        if (setting) {
            return JSON.parse(setting.value);
        }

        // Default settings
        return {
            companyName: 'Mikrotik Manager',
            companyAddress: 'Jalan Raya Internet No. 1',
            companyContact: '', // Default was phone, now empty as it's used for email
            invoiceFooter: 'Terima kasih atas kepercayaan Anda.',
            logoUrl: '',
            autoDropDate: 10, // Day of month to auto-drop unpaid users
            isolir: {
                poolName: 'DROPPOOL',
                poolRange: '10.100.1.2-10.100.254',
                gatewayIp: '10.100.1.1',
                billingIp: '192.168.1.100',
                appPort: '3000'
            }
        };
    } catch (error) {
        return {
            companyName: 'Mikrotik Manager',
            companyAddress: '',
            companyContact: '',
            invoiceFooter: '',
            logoUrl: '',
            autoDropDate: 10
        };
    }
}

export async function GET() {
    const settings = await getBillingSettings();
    const config = await getConfig();

    // Mask password
    const emailConfig = config.email ? { ...config.email, password: config.email.password ? '******' : '' } : {};

    return NextResponse.json({
        ...settings,
        email: emailConfig
    });
}

export async function POST(request) {
    try {
        const body = await request.json();

        // Separate email config from billing settings
        const { email, ...billingSettings } = body;

        // 1. Save Billing Settings
        await db.systemSetting.upsert({
            where: { key: SETTINGS_KEY },
            update: { value: JSON.stringify(billingSettings) },
            create: { key: SETTINGS_KEY, value: JSON.stringify(billingSettings) }
        });

        // 2. Save Email Settings if present
        if (email) {
            const oldConfig = await getConfig();
            let newEmailConfig = email;

            // Handle Password Masking
            if (newEmailConfig.password === '******') {
                newEmailConfig.password = oldConfig.email?.password || '';
            }

            const newConfig = {
                ...oldConfig,
                email: newEmailConfig
            };
            await saveConfig(newConfig);
        }

        return NextResponse.json({ message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Save billing settings error:', error);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
