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

        let username = decoded.username;

        // Determine Owner ID for router selection
        let targetOwnerId = decoded.ownerId;
        if (decoded.role === 'customer' && !decoded.ownerId) {
            // Fallback if token missing ownerId (older tokens)
            const u = await db.user.findUnique({ where: { username } });
            if (u) targetOwnerId = u.ownerId;
        }

        // Check for customerId lookup (Query Param has priority)
        const { searchParams } = new URL(request.url);
        const searchId = searchParams.get('customerId');

        if (searchId) {
            console.log(`[CustomerStats] Searching for customerId: ${searchId}`);
            const customer = await db.customer.findFirst({
                where: { customerId: searchId }
            });

            if (customer) {
                username = customer.username;
                targetOwnerId = customer.ownerId; // vital update
                console.log(`[CustomerStats] Found user ${username} for ID ${searchId}`);
            } else {
                return NextResponse.json({ error: 'Customer ID not found' }, { status: 404 });
            }
        } else {
            // Implicit Lookup: Check if logged-in 'username' is actually a 'customerId'
            // This handles the case where user logs in with ID "10100010"
            const asCustomer = await db.customer.findUnique({
                where: { customerId: username }
            });

            if (asCustomer) {
                console.log(`[CustomerStats] Logged in with CustomerID ${username}, resolving to ${asCustomer.username}`);
                username = asCustomer.username;
                targetOwnerId = asCustomer.ownerId; // vital update
            }
        }

        console.log(`[CustomerStats] Fetching stats for user: ${username} (Owner: ${targetOwnerId})`);

        // Get correct Mikrotik Connection
        const { getConfig, getUserConnectionId } = await import('@/lib/config');
        const config = await getConfig();
        // Emulate a user object for getUserConnectionId
        const connectionId = getUserConnectionId({ role: 'customer', ownerId: targetOwnerId }, config);

        // 1. Get Session Status (Mikrotik)
        let session = {
            id: null,
            uptime: '-',
            active: false
        };

        try {
            console.log(`[CustomerStats] Connecting to Mikrotik (ConnID: ${connectionId})...`);
            const client = await getMikrotikClient(connectionId);

            const activeConnections = await client.write('/ppp/active/print', [
                `?name=${username}`
            ]);
            console.log(`[CustomerStats] Active connections found: ${activeConnections.length}`, activeConnections);

            if (activeConnections.length > 0) {
                const active = activeConnections[0];
                session.id = active['.id'];
                session.uptime = active.uptime;
                session.active = true;
                // ... (rest of logic handles traffic)
                session.ipAddress = active['address'];

                try {
                    const traffic = await client.write('/interface/monitor-traffic', [
                        `=interface=<pppoe-${username}>`,
                        '=once='
                    ]);
                    if (traffic && traffic[0]) {
                        session.currentSpeed = {
                            tx: traffic[0]['tx-bits-per-second'] || '0',
                            rx: traffic[0]['rx-bits-per-second'] || '0'
                        };
                    }
                } catch (tErr) { console.warn('Traffic monitor failed', tErr); }
            }
        } catch (mikrotikError) {
            console.error('Mikrotik connection failed:', mikrotikError);
            // Non-fatal, session remains inactive/offline
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


