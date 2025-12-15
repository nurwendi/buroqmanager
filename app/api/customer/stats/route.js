import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/security';
import { getMonthlyUsage } from '@/lib/usage-tracker';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = await verifyToken(token);
        if (!decoded || decoded.role !== 'customer') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const username = decoded.username;
        console.log(`[CustomerStats] Fetching stats for user: ${username}`);
        const client = await getMikrotikClient();

        // 1. Get Session Status (Mikrotik)
        let session = {
            id: null,
            uptime: '-',
            active: false
        };

        try {
            const activeConnections = await client.write('/ppp/active/print', [
                `?name=${username}`
            ]);
            console.log(`[CustomerStats] Active connections found: ${activeConnections.length}`, activeConnections);

            if (activeConnections.length > 0) {
                const active = activeConnections[0];
                session.id = active['.id'];
                session.uptime = active.uptime;
                session.active = true;
                session.ipAddress = active['address'];

                // Extract Rate Limit (e.g. "10M/10M")
                // Format: rx-rate/tx-rate [burst...]
                if (active['limit-bytes-in'] || active['rate-limit']) {
                    session.rateLimit = active['rate-limit'];
                }
            }
        } catch (e) {
            console.error('Mikrotik error:', e);
            // Non-fatal, session remains inactive
        }

        // 2. Get Monthly Usage (Accumulated)
        const usageVals = await getMonthlyUsage(username);
        const usage = {
            download: usageVals.rx || 0,
            upload: usageVals.tx || 0
        };

        // 3. Get Billing Status (Real Data)
        let billing = {
            status: 'paid',
            amount: 0,
            invoice: '-'
        };

        try {
            const payments = await db.payment.findMany({
                where: { username },
                orderBy: { date: 'desc' }
            });

            // Find ALL pending/unpaid invoices for this user
            const unpaidInvoices = payments.filter(p => p.status === 'pending' || p.status === 'unpaid');

            if (unpaidInvoices.length > 0) {
                const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
                billing.status = 'unpaid';
                billing.amount = totalUnpaid;
                // Show the latest invoice number or a generic text if multiple
                billing.invoice = unpaidInvoices.length === 1 ? unpaidInvoices[0].invoiceNumber : `${unpaidInvoices.length} Pending Invoices`;
            } else {
                if (payments.length > 0) {
                    const latest = payments[0];
                    billing.invoice = latest.invoiceNumber;
                }
            }
        } catch (e) {
            console.error('Error reading billing data', e);
        }

        // 4. Get Customer Name
        let name = username;
        try {
            const userProfile = await db.user.findUnique({ where: { username } });
            if (userProfile && userProfile.fullName) {
                name = userProfile.fullName;
            }
        } catch (e) {
            console.error('Error reading user profile', e);
        }

        return NextResponse.json({
            name,
            usage,
            billing,
            session
        });

    } catch (error) {
        console.error('Error getting customer stats', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
