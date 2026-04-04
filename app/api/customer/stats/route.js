import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-auth';
import { getMikrotikClient } from '@/lib/mikrotik';
import { getMonthlyUsage } from '@/lib/usage-tracker';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const decoded = await getUserFromRequest(request);
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let username = decoded.username;
        let isUserAdmin = ['admin', 'superadmin', 'staff', 'agent', 'technician'].includes(decoded.role);

        // Determine Owner ID for router selection
        let targetOwnerId = decoded.ownerId;
        
        // 4. Get Customer Name & Avatar from Customer table
        let asCustomer = null;

        // Check for customerId lookup (Query Param has priority for admins)
        const { searchParams } = new URL(request.url);
        const searchId = searchParams.get('customerId');

        if (searchId) {
            console.log(`[CustomerStats] Searching for customerId: ${searchId}`);
            const customer = await db.customer.findFirst({
                where: { customerId: searchId }
            });
            if (customer) {
                if (decoded.role === 'admin' && customer.ownerId !== decoded.id) {
                     return NextResponse.json({ error: 'Forbidden: Not your customer' }, { status: 403 });
                }
                asCustomer = customer;
                username = customer.username;
                targetOwnerId = customer.ownerId;
            } else {
                return NextResponse.json({ error: 'Customer ID not found' }, { status: 404 });
            }
        } else {
            if (!isUserAdmin && decoded.role !== 'customer') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            const found = await db.customer.findFirst({
                where: { customerId: username }
            });

            if (found) {
                asCustomer = found;
                username = found.username;
                targetOwnerId = found.ownerId;
            } else if (decoded.role === 'customer') {
                // Critical Fix: If logged in as customer but record missing, return 404
                return NextResponse.json({ error: 'Customer record not found. Please contact support.' }, { status: 404 });
            }
        }

        console.log(`[CustomerStats] Fetching stats for user: ${username} (Owner: ${targetOwnerId})`);

        // Get correct Mikrotik Connections
        const { getConfig } = await import('@/lib/config');
        const config = await getConfig();
        
        // Find ALL connections belonging to this owner
        const ownerConnections = (config.connections || []).filter(c => c.ownerId === targetOwnerId || (decoded.role === 'superadmin' && !targetOwnerId));
        
        // If no specifically owned connections, fallback to active connection or all connections for superadmin
        const connectionsToScan = ownerConnections.length > 0 
            ? ownerConnections 
            : (config.activeConnectionId ? config.connections.filter(c => c.id === config.activeConnectionId) : config.connections);

        // 1. Get Session Status (Mikrotik) - Scan All Applicable Routers
        let session = {
            id: null,
            uptime: '-',
            active: false,
            routerId: null
        };

        for (const conn of connectionsToScan) {
            try {
                console.log(`[CustomerStats] Connecting to Mikrotik (ConnID: ${conn.id})...`);
                const client = await getMikrotikClient(conn.id);

                const activeConnections = await client.write('/ppp/active/print');
                const active = activeConnections.find(a => a.name && a.name.toLowerCase() === username.toLowerCase());

                if (active) {
                    session.id = active['.id'];
                    session.uptime = active.uptime;
                    session.active = true;
                    session.routerId = conn.id;
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
                    
                    // Found him! Stop scanning other routers.
                    break;
                }
            } catch (mikrotikError) {
                console.error(`Mikrotik connection failed for ${conn.id}:`, mikrotikError);
            }
        }

        // 2. Get Monthly Usage (Accumulated)
        const usageVals = await getMonthlyUsage(username);
        const usage = {
            download: usageVals.tx || 0,
            upload: usageVals.rx || 0
        };

        // 3. Get Billing Status (Real Data)
        const now = new Date();
        const dFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric', month: 'numeric' });
        const parts = dFmt.formatToParts(now);
        const currentMonthId = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
        const currentYearId = parseInt(parts.find(p => p.type === 'year')?.value || '2026');

        let billing = {
            status: 'paid',
            amount: 0,
            invoice: '-',
            month: currentMonthId,
            year: currentYearId
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
                // Use the month/year from the most recent unpaid invoice if available
                const latestUnpaid = unpaidInvoices[0];
                if (latestUnpaid.month !== null && latestUnpaid.month !== undefined) {
                    billing.month = latestUnpaid.month;
                }
                if (latestUnpaid.year !== null && latestUnpaid.year !== undefined) {
                    billing.year = latestUnpaid.year;
                }
            } else {
                if (payments.length > 0) {
                    const latest = payments[0];
                    billing.invoice = latest.invoiceNumber;
                    // Use month/year from latest payment
                    if (latest.month !== null && latest.month !== undefined) {
                        billing.month = latest.month;
                    }
                    if (latest.year !== null && latest.year !== undefined) {
                        billing.year = latest.year;
                    }
                }
            }
        } catch (e) {
            console.error('Error reading billing data', e);
        }

        // 4. Get Customer Details & Latest Notification
        let address = '-';
        let profileName = '-';
        let latestNotification = 'Belum ada notifikasi baru.';
        let name = username; // Default to username
        let avatar = '';
        let profilePrice = 0;

        try {
            const customer = await db.customer.findFirst({
                where: { username },
                include: { profile: { select: { name: true, price: true } } }
            });

            if (customer) {
                name = customer.name || username;
                avatar = customer.avatar || '';
                address = customer.address || '-';
                profileName = customer.profile?.name || '-';
                profilePrice = customer.profile?.price || 0;

                // Find latest notification for this customer
                const latestRecipient = await db.notificationRecipient.findFirst({
                    where: { userId: customer.id },
                    orderBy: { notification: { createdAt: 'desc' } },
                    include: { notification: { select: { message: true, createdAt: true } } }
                });

                if (latestRecipient && latestRecipient.notification) {
                    latestNotification = latestRecipient.notification.message;
                }
            }
        } catch (e) {
            console.error('Error reading customer details', e);
        }

        return NextResponse.json({
            name,
            avatar,
            usage,
            billing,
            session,
            address,
            profileName,
            profilePrice,
            latestNotification,
            customerId: asCustomer?.customerId || decoded.username,
            pppoeUsername: username
        });

    } catch (error) {
        console.error('Error getting customer stats', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


