import { NextResponse } from 'next/server';
import { generateInvoices } from '@/lib/billing';
import { getConfig } from '@/lib/config';
import db from '@/lib/db';
import { sendInvoiceEmail } from '@/lib/email';
import { sendNotification } from '@/lib/notifications-db';
import { getUserFromRequest } from '@/lib/api-auth';

// Force dynamic
export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month') ? parseInt(searchParams.get('month')) : undefined; // 0-11
        const year = searchParams.get('year') ? parseInt(searchParams.get('year')) : undefined;
        
        // Security Check: Require valid CRON_SECRET or authenticated superadmin/admin session
        const secret = searchParams.get('key') || request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '');
        const hasValidSecret = Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
        const user = hasValidSecret ? null : await getUserFromRequest(request);

        if (!hasValidSecret && (!user || (user.role !== 'superadmin' && user.role !== 'admin'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Cron] Manual invoice generation triggered via API');

        const config = await getConfig();
        const allConnections = config.connections || [];
        const connections = user && user.role === 'admin'
            ? allConnections.filter(c => c.ownerId === user.id)
            : allConnections;
        const summary = [];

        for (const conn of connections) {
            const result = await generateInvoices(month, year, conn.id, conn.ownerId);
            
            if (result.success && result.newPayments?.length > 0) {
                const usernames = [...new Set(result.newPayments.map(p => p.username))];
                const customers = await db.customer.findMany({
                    where: {
                        username: { in: usernames },
                        ...(conn.ownerId ? { ownerId: conn.ownerId } : {})
                    },
                    select: { id: true, username: true, name: true, email: true, ownerId: true }
                });
                const customerMap = new Map(
                    customers.map(c => [`${c.ownerId || ''}:${c.username}`, c])
                );

                const pushRecipients = [];

                // Post-generation actions (Email/Push)
                for (const payment of result.newPayments) {
                    const customer = customerMap.get(`${payment.ownerId || ''}:${payment.username}`)
                        || customers.find(c => c.username === payment.username);

                    if (customer) {
                        // Email
                        if (customer.email) {
                            try {
                                await sendInvoiceEmail(customer.email, {
                                    ...payment,
                                    customerName: customer.name || payment.username,
                                    month: result.month,
                                    year: result.year,
                                    invoiceId: payment.id || payment.invoiceNumber
                                });
                            } catch (e) {
                                console.error(`[Cron] Email failed for ${customer.username}:`, e.message);
                            }
                        }

                        pushRecipients.push({ customerId: customer.id });
                    }
                }

                if (pushRecipients.length > 0) {
                    try {
                        await sendNotification({
                            title: 'Tagihan Baru Terbit',
                            message: `Tagihan internet Anda untuk periode ${result.month + 1}/${result.year} telah terbit. Silakan cek detail tagihan di aplikasi.`,
                            type: 'info',
                            ownerId: conn.ownerId || null,
                            recipients: pushRecipients
                        });
                    } catch (e) {
                        console.error(`[Cron] Batch notification failed for router ${conn.name}:`, e.message);
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
