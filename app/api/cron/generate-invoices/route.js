import { NextResponse } from 'next/server';
import { generateInvoices } from '@/lib/billing';
import { getConfig } from '@/lib/config';
import db from '@/lib/db';
import { sendInvoiceEmail } from '@/lib/email';
import { sendNotification } from '@/lib/notifications-db';

// Force dynamic
export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month') ? parseInt(searchParams.get('month')) : undefined; // 0-11
        const year = searchParams.get('year') ? parseInt(searchParams.get('year')) : undefined;
        
        // Security Check: Optional secret key
        const secret = searchParams.get('key');
        if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized key' }, { status: 401 });
        }

        console.log('[Cron] Manual invoice generation triggered via API');

        const config = await getConfig();
        const connections = config.connections || [];
        const summary = [];

        for (const conn of connections) {
            const result = await generateInvoices(month, year, conn.id, conn.ownerId);
            
            if (result.success && result.newPayments?.length > 0) {
                // Post-generation actions (Email/Push)
                for (const payment of result.newPayments) {
                    const customer = await db.customer.findFirst({
                        where: { username: payment.username, ownerId: payment.ownerId }
                    });

                    if (customer) {
                        // Email
                        if (customer.email) {
                            try {
                                await sendInvoiceEmail(customer.email, {
                                    ...payment,
                                    customerName: customer.name || payment.username,
                                    month: result.month,
                                    year: result.year,
                                    invoiceId: payment.id
                                });
                            } catch (e) {
                                console.error(`[Cron] Email failed for ${customer.username}:`, e.message);
                            }
                        }

                        // Push
                        try {
                            await sendNotification({
                                title: 'Tagihan Baru Terbit',
                                message: `Tagihan Anda untuk periode ${result.month + 1}/${result.year} telah terbit sebesar Rp ${payment.amount.toLocaleString('id-ID')}.`,
                                type: 'info',
                                ownerId: payment.ownerId,
                                recipients: [{ customerId: customer.id }]
                            });
                        } catch (e) {
                            console.error(`[Cron] Notification failed for ${customer.username}:`, e.message);
                        }
                    }
                }
            }

            summary.push({
                connection: conn.name,
                generated: result.generated || 0,
                skipped: result.skipped || 0,
                error: result.error || null
            });
        }

        return NextResponse.json({
            success: true,
            summary: summary,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Invoice Cron Route Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
