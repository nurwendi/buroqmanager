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
        const isUserAdmin = ['admin', 'superadmin', 'staff', 'agent', 'technician'].includes(decoded.role);
        let targetOwnerId = decoded.ownerId;
        let asCustomer = null;

        const { searchParams } = new URL(request.url);
        const searchId = searchParams.get('customerId');

        if (searchId) {
            const customer = await db.customer.findFirst({
                where: { customerId: searchId },
                include: { profile: { select: { name: true, price: true } } }
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
                where: {
                    OR: [
                        { customerId: username },
                        { username: username }
                    ],
                    ...(targetOwnerId ? { ownerId: targetOwnerId } : {})
                },
                include: { profile: { select: { name: true, price: true } } }
            });

            if (found) {
                asCustomer = found;
                username = found.username;
                targetOwnerId = found.ownerId;
            } else if (decoded.role === 'customer') {
                return NextResponse.json({ error: 'Customer record not found. Please contact support.' }, { status: 404 });
            }
        }

        // Get correct Mikrotik Connections
        const { getConfig } = await import('@/lib/config');
        const config = await getConfig();

        const ownerConnections = (config.connections || []).filter(
            c => c.ownerId === targetOwnerId || (decoded.role === 'superadmin' && !targetOwnerId)
        );

        const connectionsToScan = ownerConnections.length > 0
            ? ownerConnections
            : (config.activeConnectionId
                ? (config.connections || []).filter(c => c.id === config.activeConnectionId)
                : (config.connections || []));

        // 1. Get Session Status (Mikrotik) using targeted ?name= filter instead of full table dump
        let session = {
            id: null,
            uptime: '-',
            active: false,
            routerId: null
        };

        for (const conn of connectionsToScan) {
            try {
                const client = await getMikrotikClient(conn.id);

                // Fast targeted query by exact username first
                let activeConnections = await client.write('/ppp/active/print', [
                    `?name=${username}`
                ]);

                let active = activeConnections?.[0];

                // Fallback to cached active list if case differs
                if (!active && globalThis._routerCache) {
                    const cached = globalThis._routerCache.get(conn.id);
                    if (Array.isArray(cached?.active)) {
                        active = cached.active.find(a => a.name && a.name.toLowerCase() === username.toLowerCase());
                    }
                }

                if (active) {
                    session.id = active['.id'];
                    session.uptime = active.uptime;
                    session.active = true;
                    session.routerId = conn.id;
                    session.ipAddress = active['address'];

                    try {
                        const traffic = await client.write('/interface/monitor-traffic', [
                            `=interface=<pppoe-${active.name || username}>`,
                            '=once='
                        ]);
                        if (traffic && traffic[0]) {
                            session.currentSpeed = {
                                tx: traffic[0]['tx-bits-per-second'] || '0',
                                rx: traffic[0]['rx-bits-per-second'] || '0'
                            };
                        }
                    } catch (tErr) {
                        console.warn('Traffic monitor failed', tErr.message);
                    }

                    break;
                }
            } catch (mikrotikError) {
                console.error(`Mikrotik connection failed for ${conn.id}:`, mikrotikError.message);
            }
        }

        // 2. Fetch Monthly Usage, Billing Payments, and Latest Notification in parallel
        const paymentWhere = {
            username,
            ...(targetOwnerId ? { ownerId: targetOwnerId } : {})
        };

        const [usageVals, payments, latestRecipient] = await Promise.all([
            getMonthlyUsage(username).catch(() => ({ tx: 0, rx: 0 })),
            db.payment.findMany({
                where: paymentWhere,
                orderBy: { date: 'desc' },
                take: 24
            }).catch(() => []),
            asCustomer
                ? db.notificationRecipient.findFirst({
                    where: {
                        OR: [
                            { customerId: asCustomer.id },
                            { userId: asCustomer.id }
                        ]
                    },
                    orderBy: { notification: { createdAt: 'desc' } },
                    include: { notification: { select: { message: true, createdAt: true } } }
                }).catch(() => null)
                : Promise.resolve(null)
        ]);

        const usage = {
            download: usageVals.tx || 0,
            upload: usageVals.rx || 0
        };

        // 3. Process Billing Status
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

        const unpaidInvoices = payments.filter(p => p.status === 'pending' || p.status === 'unpaid');

        if (unpaidInvoices.length > 0) {
            const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
            billing.status = 'unpaid';
            billing.amount = totalUnpaid;
            billing.invoice = unpaidInvoices.length === 1 ? unpaidInvoices[0].invoiceNumber : `${unpaidInvoices.length} Pending Invoices`;
            billing.firstPendingInvoiceNumber = unpaidInvoices[0]?.invoiceNumber || null;
            const latestUnpaid = unpaidInvoices[0];
            if (latestUnpaid.month !== null && latestUnpaid.month !== undefined) {
                billing.month = latestUnpaid.month;
            }
            if (latestUnpaid.year !== null && latestUnpaid.year !== undefined) {
                billing.year = latestUnpaid.year;
            }
        } else if (payments.length > 0) {
            const latest = payments[0];
            billing.invoice = latest.invoiceNumber;
            billing.firstPendingInvoiceNumber = null;
            if (latest.month !== null && latest.month !== undefined) {
                billing.month = latest.month;
            }
            if (latest.year !== null && latest.year !== undefined) {
                billing.year = latest.year;
            }
        }

        // 4. Assemble Customer Details from already-fetched asCustomer
        const name = asCustomer?.name || username;
        const avatar = asCustomer?.avatar || '';
        const address = asCustomer?.address || '-';
        const profileName = asCustomer?.profile?.name || '-';
        const profilePrice = asCustomer?.profile?.price || 0;
        const latestNotification = latestRecipient?.notification?.message || 'Belum ada notifikasi baru.';

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


