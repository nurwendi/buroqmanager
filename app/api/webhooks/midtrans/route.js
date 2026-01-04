import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export async function POST(request) {
    try {
        const notification = await request.json();

        const {
            order_id,
            status_code,
            gross_amount,
            signature_key,
            transaction_status,
            fraud_status,
            payment_type
        } = notification;

        if (!order_id) {
            return NextResponse.json({ message: 'Invalid notification' }, { status: 400 });
        }

        // 1. Find the Payment record to identify the owner/keys
        const payment = await prisma.payment.findUnique({
            where: { id: order_id },
            include: {
                owner: {
                    include: {
                        gatewayConfig: true
                    }
                }
            }
        });

        if (!payment) {
            console.error(`Payment not found for order_id: ${order_id}`);
            return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
        }

        const config = payment.owner?.gatewayConfig;
        if (!config || !config.serverKey) {
            console.error(`Gateway config missing for order_id: ${order_id}`);
            return NextResponse.json({ message: 'Configuration error' }, { status: 500 });
        }

        // 2. Verify Signature
        // SHA512(order_id+status_code+gross_amount+ServerKey)
        const payload = `${order_id}${status_code}${gross_amount}${config.serverKey}`;
        const calculatedSignature = crypto.createHash('sha512').update(payload).digest('hex');

        if (calculatedSignature !== signature_key) {
            console.error(`Invalid signature for order_id: ${order_id}`);
            return NextResponse.json({ message: 'Invalid signature check' }, { status: 403 });
        }

        // 3. Determine Status
        let newStatus = 'pending';
        if (transaction_status === 'capture') {
            if (fraud_status === 'challenge') {
                newStatus = 'challenge';
            } else if (fraud_status === 'accept') {
                newStatus = 'success';
            }
        } else if (transaction_status === 'settlement') {
            newStatus = 'success';
        } else if (transaction_status === 'cancel' || transaction_status === 'deny' || transaction_status === 'expire') {
            newStatus = 'failed';
        } else if (transaction_status === 'pending') {
            newStatus = 'pending';
        }

        // 4. Update Database
        await prisma.payment.update({
            where: { id: order_id },
            data: {
                gatewayStatus: transaction_status,
                status: newStatus === 'success' ? 'completed' : 'pending', // Map to internal 'status'
                paymentType: payment_type
            }
        });

        // 5. Trigger Reactivation if Success (Future Step: Integrate with Radius/Mikrotik)
        if (newStatus === 'success') {
            // TODO: Call activation logic
            console.log(`Payment ${order_id} successful. Triggering activation for ${payment.username}...`);
        }

        return NextResponse.json({ message: 'OK' });

    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
