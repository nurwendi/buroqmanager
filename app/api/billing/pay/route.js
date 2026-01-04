import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import midtransClient from 'midtrans-client';

const prisma = new PrismaClient();

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return unauthorizedResponse();
        }

        const { invoiceNumber, amount } = await request.json();

        if (!invoiceNumber || !amount) {
            return NextResponse.json({ error: 'Missing invoiceNumber or amount' }, { status: 400 });
        }

        // 1. Find the invoice/customer to determine the Owner
        // Note: Payment model usually stores 'username' (PPPoE login) but assumes invoiceNumber is unique.
        // We need to find the OWNER of this invoice to get the correct keys.
        // Since we don't have a strict "Invoice" model linked in the Prisma schema provided (it uses Payment model for history),
        // we assume we are creating a NEW payment record for an *outstanding* bill.
        // However, if we are paying for a specific user, we can find that user's owner.

        // Scenario: Customer is paying.
        let ownerId = user.ownerId; // If customer, they have an ownerId.
        let payerUsername = user.username;

        // If Admin is creating a payment link? (Future feature)
        // For now, assume Customer context or Admin context paying for a specific user.
        if (user.role !== 'customer') {
            // If admin is doing it, ownerId is the admin's ID
            ownerId = user.id;
            // Start strictly: require payerUsername if admin
            // payerUsername = ... passed in body?
        }

        if (!ownerId) {
            return NextResponse.json({ error: 'No owner associated with this user to process payment.' }, { status: 400 });
        }

        // 2. Fetch Gateway Config
        const gatewayConfig = await prisma.paymentGatewayConfig.findUnique({
            where: { ownerId: ownerId },
        });

        if (!gatewayConfig || !gatewayConfig.serverKey) {
            return NextResponse.json({ error: 'Payment Gateway not configured for this provider.' }, { status: 400 });
        }

        // 3. Initialize Midtrans Snap
        const snap = new midtransClient.Snap({
            isProduction: !gatewayConfig.isSandbox,
            serverKey: gatewayConfig.serverKey,
            clientKey: gatewayConfig.clientKey
        });

        // 4. Create Transaction params
        // Use a temporary unique ID for the transaction, or create the Payment record first?
        // Safer to create Payment record first with status 'pending' to get an ID.

        // Check if a pending payment already exists for this invoice?
        // Assuming simple flow: New Payment Record everytime 'Pay' is clicked? 
        // Or update existing? Let's create new.

        const paymentRecord = await prisma.payment.create({
            data: {
                invoiceNumber: `${invoiceNumber}-${Date.now()}`, // Make unique for retries if same invoice number used
                username: payerUsername || 'guest',
                amount: parseFloat(amount),
                method: 'midtrans',
                status: 'pending',
                month: new Date().getMonth(), // Approximate
                year: new Date().getFullYear(),
                date: new Date(),
                ownerId: ownerId,
                gatewayStatus: 'pending',
                paymentProvider: gatewayConfig.provider
            }
        });

        const parameter = {
            transaction_details: {
                order_id: paymentRecord.id, // Use Payment ID (CUID) as Order ID for easy lookup
                gross_amount: parseFloat(amount)
            },
            customer_details: {
                first_name: user.fullName || payerUsername,
                email: user.email || undefined,
                phone: user.phone || undefined,
            },
            item_details: [{
                id: invoiceNumber,
                price: parseFloat(amount),
                quantity: 1,
                name: `Internet Bill ${invoiceNumber}`
            }],
            callbacks: {
                finish: "myapp://payment-finish" // Optional custom scheme for mobile
            }
        };

        const transaction = await snap.createTransaction(parameter);

        // 5. Update Payment record with token
        await prisma.payment.update({
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
