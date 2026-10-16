import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';
import { restoreUserConnection } from '@/lib/billing-actions';

export async function POST(request) {
    try {
        const data = await request.json();

        const {
            order_id,
            status_code,
            gross_amount,
            signature_key,
            transaction_status,
            fraud_status,
            payment_type
        } = data;

        if (!order_id) {
            return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
        }

        // 1. Find the Payment record to identify the owner/keys (supports order_id or order_id prefix before timestamp)
        const paymentLookupId = order_id.includes('-') ? order_id.split('-')[0] : order_id;
        let payment = await db.payment.findUnique({
            where: { id: paymentLookupId },
            include: {
                owner: {
                    include: {
                        gatewayConfig: true
                    }
                }
            }
        });

        if (!payment) {
            payment = await db.payment.findUnique({
                where: { id: order_id },
                include: {
                    owner: {
                        include: {
                            gatewayConfig: true
                        }
                    }
                }
            });
        }

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
        await db.payment.update({
            where: { id: payment.id },
            data: {
                gatewayStatus: transaction_status,
                status: newStatus === 'success' ? 'completed' : (newStatus === 'failed' ? 'failed' : 'pending'),
                paymentType: payment_type,
                date: newStatus === 'success' ? new Date() : payment.date
            }
        });

        // 5. Trigger Reactivation, Commission, and Notification if Success
        if (newStatus === 'success') {
            // Find real customer to get PPPoE username if stored as customerId
            let pppoeUsername = payment.username;
            const customer = await db.customer.findFirst({
                where: {
                    OR: [
                        { customerId: payment.username },
                        { username: payment.username }
                    ],
                    ...(payment.ownerId ? { ownerId: payment.ownerId } : {})
                },
                include: { agent: true, technician: true }
            });

            if (customer) {
                pppoeUsername = customer.username;

                // Calculate Agent & Technician Commissions if not already created
                try {
                    const existingCommissions = await db.commission.count({ where: { paymentId: payment.id } });
                    if (existingCommissions === 0) {
                        const commissionsToCreate = [];
                        if (customer.agent && customer.agent.agentRate > 0) {
                            commissionsToCreate.push({
                                paymentId: payment.id,
                                userId: customer.agent.id,
                                username: customer.agent.username,
                                role: 'agent',
                                rate: customer.agent.agentRate,
                                amount: (payment.amount * customer.agent.agentRate) / 100
                            });
                        }
                        if (customer.technician && customer.technician.technicianRate > 0) {
                            commissionsToCreate.push({
                                paymentId: payment.id,
                                userId: customer.technician.id,
                                username: customer.technician.username,
                                role: 'technician',
                                rate: customer.technician.technicianRate,
                                amount: (payment.amount * customer.technician.technicianRate) / 100
                            });
                        }
                        if (commissionsToCreate.length > 0) {
                            await db.commission.createMany({ data: commissionsToCreate });
                        }
                    }
                } catch (commErr) {
                    console.error('[Webhook] Commission creation error:', commErr.message);
                }
            }

            console.log(`Payment ${order_id} successful. Restoring connection for ${pppoeUsername}...`);
            // Execute restoration
            try {
                await restoreUserConnection(pppoeUsername, payment.ownerId);

                // Notify the user via Push Notification
                const { sendTargetedNotificationByUsername } = await import('@/lib/notifications-db');
                await sendTargetedNotificationByUsername({
                    username: pppoeUsername,
                    title: 'Pembayaran Berhasil',
                    message: `Terima kasih! Pembayaran tagihan ${payment.invoiceNumber.split('-')[0]} telah diterima. Koneksi Anda telah aktif kembali.`,
                    type: 'billing',
                    ownerId: payment.ownerId
                });
            } catch (notifyError) {
                console.error('[Webhook] Failed to restore connection or send notification:', notifyError.message);
            }
        }

        return NextResponse.json({ message: 'OK' });

    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
