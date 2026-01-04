import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

const prisma = new PrismaClient();

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return unauthorizedResponse();
        }

        // Only admins/owners should access this
        // If we want to be strict: if (user.role === 'customer') return unauthorizedResponse();

        const ownerId = user.id; // Configuration is attached to the logged-in admin

        const config = await prisma.paymentGatewayConfig.findUnique({
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
        if (!user) {
            return unauthorizedResponse();
        }

        const { merchantId, clientKey, serverKey, isSandbox, provider } = await request.json();
        const ownerId = user.id;

        // Upsert the configuration
        const config = await prisma.paymentGatewayConfig.upsert({
            where: { ownerId: ownerId },
            update: {
                merchantId,
                clientKey,
                serverKey,
                isSandbox,
                provider: provider || 'midtrans',
            },
            create: {
                ownerId,
                merchantId,
                clientKey,
                serverKey,
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
