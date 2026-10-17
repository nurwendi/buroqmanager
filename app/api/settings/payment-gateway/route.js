import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
            return unauthorizedResponse();
        }

        const ownerId = user.id; // Configuration is attached to the logged-in admin

        const config = await db.paymentGatewayConfig.findUnique({
            where: { ownerId: ownerId },
        });

        if (!config) {
            return NextResponse.json({ config: null });
        }

        // Mask keys for security
        const maskedConfig = {
            ...config,
            clientKey: config.clientKey ? '***************' + config.clientKey.slice(-4) : '',
            serverKey: config.serverKey ? '***************' + config.serverKey.slice(-4) : '',
        };

        return NextResponse.json({ config: maskedConfig });
    } catch (error) {
        console.error("Error fetching gateway config:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
            return unauthorizedResponse();
        }

        const { merchantId, clientKey, serverKey, isSandbox, provider } = await request.json();
        const ownerId = user.id;

        const existing = await db.paymentGatewayConfig.findUnique({
            where: { ownerId }
        });

        const resolvedClientKey = clientKey && clientKey.includes('***') && existing
            ? existing.clientKey
            : clientKey;
        const resolvedServerKey = serverKey && serverKey.includes('***') && existing
            ? existing.serverKey
            : serverKey;

        // Upsert the configuration
        await db.paymentGatewayConfig.upsert({
            where: { ownerId: ownerId },
            update: {
                merchantId,
                clientKey: resolvedClientKey,
                serverKey: resolvedServerKey,
                isSandbox,
                provider: provider || 'midtrans',
            },
            create: {
                ownerId,
                merchantId,
                clientKey: resolvedClientKey || '',
                serverKey: resolvedServerKey || '',
                isSandbox,
                provider: provider || 'midtrans',
            },
        });

        return NextResponse.json({ success: true, message: 'Payment gateway configuration saved.' });
    } catch (error) {
        console.error("Error saving gateway config:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
