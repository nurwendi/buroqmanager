import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import midtransClient from 'midtrans-client';

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return unauthorizedResponse();
        }

        const { invoiceNumber, amount } = await request.json();

        if (!invoiceNumber) {
            return NextResponse.json({ error: 'Missing invoiceNumber' }, { status: 400 });
        }

        // 1. Resolve Customer and Owner details
        let ownerId = user.ownerId;
        let payerUsername = user.pppoeUsername || user.username;

        let customer = null;
        if (user.role === 'customer') {
            customer = await db.customer.findFirst({
                where: {
                    OR: [
                        { customerId: user.username },
                        { username: user.username },
                        { id: user.id }
                    ]
                }
            });
            if (customer) {
                ownerId = customer.ownerId || ownerId;
                payerUsername = customer.username;
            }
        } else {
            ownerId = user.id;
        }

        if (!ownerId) {
            return NextResponse.json({ error: 'No owner associated with this user to process payment.' }, { status: 400 });
        }

        // 2. Lookup existing pending invoice to ensure correct amount
        let finalAmount = parseFloat(amount);
        let existingInvoice = await db.payment.findFirst({
            where: {
                invoiceNumber: invoiceNumber,
                ownerId: ownerId
            }
        });

        if (!existingInvoice && payerUsername) {
            existingInvoice = await db.payment.findFirst({
                where: {
                    username: payerUsername,
                    status: 'pending',
                    ownerId: ownerId
                },
                orderBy: { date: 'desc' }
            });
        }

        if (existingInvoice && existingInvoice.amount > 0) {
            finalAmount = existingInvoice.amount;
        }

        if (!finalAmount || finalAmount <= 0) {
            return NextResponse.json({ error: 'Invalid invoice amount' }, { status: 400 });
        }

        // 3. Fetch Gateway Config
        const gatewayConfig = await db.paymentGatewayConfig.findUnique({
            where: { ownerId: ownerId },
        });

        if (!gatewayConfig || !gatewayConfig.serverKey) {
            return NextResponse.json({ error: 'Payment Gateway not configured for this provider.' }, { status: 400 });
        }

        // 4. Initialize Midtrans Snap
        const snap = new midtransClient.Snap({
            isProduction: !gatewayConfig.isSandbox,
            serverKey: gatewayConfig.serverKey,
            clientKey: gatewayConfig.clientKey
        });

        // 5. Use existing invoice or create new payment record
        let paymentRecord = existingInvoice;
        if (paymentRecord) {
            paymentRecord = await db.payment.update({
                where: { id: paymentRecord.id },
                data: {
                    method: 'midtrans',
                    gatewayStatus: 'pending',
                    paymentProvider: gatewayConfig.provider
                }
            });
        } else {
            paymentRecord = await db.payment.create({
                data: {
                    invoiceNumber: `${invoiceNumber}-${Date.now()}`,
                    username: payerUsername || 'guest',
                    amount: finalAmount,
                    method: 'midtrans',
                    status: 'pending',
                    month: new Date().getMonth(),
                    year: new Date().getFullYear(),
                    date: new Date(),
                    ownerId: ownerId,
                    gatewayStatus: 'pending',
                    paymentProvider: gatewayConfig.provider
                }
            });
        }

        const parameter = {
            transaction_details: {
                order_id: `${paymentRecord.id}-${Date.now()}`,
                gross_amount: finalAmount
            },
            customer_details: {
                first_name: customer?.name || user.fullName || payerUsername,
                email: customer?.email || user.email || undefined,
                phone: customer?.phone || user.phone || undefined,
            },
            item_details: [{
                id: invoiceNumber,
                price: finalAmount,
                quantity: 1,
                name: `Internet Bill ${invoiceNumber}`
            }],
            callbacks: {
                finish: "myapp://payment-finish" // Optional custom scheme for mobile
            }
        };

        const transaction = await snap.createTransaction(parameter);

        // 5. Update Payment record with token
        await db.payment.update({
            where: { id: paymentRecord.id },
            data: {
                transactionId: transaction.token, // Store token temporarily or just rely on redirect_url
                paymentUrl: transaction.redirect_url
            }
        });

        return NextResponse.json({
            token: transaction.token,
            redirect_url: transaction.redirect_url,
            paymentId: paymentRecord.id
        });

    } catch (error) {
        console.error("Error creating transaction:", error);
        return NextResponse.json({ error: error.message || 'Transaction Error' }, { status: 500 });
    }
}
