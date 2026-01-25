import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getMikrotikClient } from '@/lib/mikrotik';
import { getConfig } from '@/lib/config';

// Force dynamic since this relies on Date
export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const manual = searchParams.get('manual') === 'true';
        const forceDate = searchParams.get('forceDate'); // Optional: 1-31 to simulate a specific date

        const today = new Date();
        const currentDay = today.getDate();
        const targetDay = forceDate ? parseInt(forceDate) : currentDay;

        // Month formatting for payment check (0-11)
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // 1. Find Admins who have Auto-Isolation ENABLED and match Today's Date
        // If manual run, we might want to run for ALL enabled admins regardless of date?
        // Or strictly follow date logic. Let's strictly follow date logic unless 'manual' implies "Run regardless of date".
        // Let's stick to: If manual=true, we still only run for admins whose date matches, UNLESS we want to test?
        // Actually, if a user clicks "Run Now" in settings, they expect THEIR check to run.
        // So we need specific user handling if passing userId?
        // For general CRON:

        const whereClause = {
            isAutoIsolationEnabled: true,
            autoIsolationDate: targetDay
        };

        // If specific user requests a manual run via UI (we'll assume query param userId?)
        const userId = searchParams.get('userId');
        if (userId) {
            delete whereClause.autoIsolationDate; // Remove date constraint for manual run
            whereClause.id = userId;
        }

        const admins = await db.user.findMany({
            where: whereClause
        });

        if (admins.length === 0) {
            return NextResponse.json({ message: 'No admins scheduled for auto-isolation today', date: targetDay });
        }

        const report = [];

        // 2. Iterate Admins
        for (const admin of admins) {
            try {
                // Get Admin's Mikrotik Connection
                // We need to fetch config to find their connection ID
                const config = await getConfig();
                let connectionId = null;

                // Logic to find connection ID for this admin
                if (admin.role === 'admin') {
                    const myConn = config.connections?.find(c => c.ownerId === admin.id);
                    connectionId = myConn ? myConn.id : null;
                } else if (admin.role === 'superadmin') {
                    // Superadmin usually manages the active connection or specific one?
                    // For now, let's assume they manage key connection or skip
                    connectionId = config.activeConnectionId;
                }

                if (!connectionId) {
                    report.push({ admin: admin.username, error: 'No Mikrotik connection found' });
                    continue; // Skip
                }

                // 3. Find Unpaid Customers for this Admin
                // Get all customers owned by admin
                const customers = await db.customer.findMany({
                    where: { ownerId: admin.id }
                });

                // Get all payments for this month/year for this admin
                const payments = await db.payment.findMany({
                    where: {
                        ownerId: admin.id,
                        month: currentMonth,
                        year: currentYear
                    }
                });

                const paidUsernames = new Set(payments.map(p => p.username));

                // Identify candidates who haven't paid
                const unpaidCustomers = customers.filter(c => !paidUsernames.has(c.username));
                const unpaidUsernames = unpaidCustomers.map(c => c.username);

                if (unpaidUsernames.length === 0) {
                    report.push({ admin: admin.username, message: 'All customers paid', count: 0 });
                    continue;
                }

                // 4. Execute Isolation on Mikrotik
                const client = await getMikrotikClient(connectionId);

                // Fetch current secrets to filter only enabled ones?
                // Or just try to disable all unpaid ones.

                // Fetch secrets to get IDs
                const secrets = await client.write('/ppp/secret/print');
                const secretsToDisable = secrets.filter(s =>
                    unpaidUsernames.includes(s.name) &&
                    (s.disabled === 'false' || s.disabled === false) // Only target enabled ones
                );

                if (secretsToDisable.length === 0) {
                    report.push({ admin: admin.username, message: 'Unpaid users already disabled', count: 0 });
                    continue;
                }

                const actions = [];
                for (const secret of secretsToDisable) {
                    try {
                        await client.write('/ppp/secret/set', [
                            `=.id=${secret['.id']}`,
                            '=disabled=yes',
                            `=comment=Auto-Isolated on ${today.toISOString().split('T')[0]}`
                        ]);

                        // Also Kill Active Connection to force disconnect
                        // We need to find active connection ID
                        const activeConns = await client.write('/ppp/active/print', [`?name=${secret.name}`]);
                        for (const active of activeConns) {
                            await client.write('/ppp/active/remove', [`=.id=${active['.id']}`]);
                        }

                        actions.push(secret.name);

                        // Log Notification
                        await db.notification.create({
                            data: {
                                message: `Auto-Isolated user ${secret.name} due to non-payment.`,
                                username: secret.name,
                                status: 'warning',
                                ownerId: admin.id,
                                mikrotikId: 'system-auto'
                            }
                        });

                    } catch (err) {
                        console.error(`Failed to isolate ${secret.name}`, err);
                    }
                }

                report.push({
                    admin: admin.username,
                    isolatedCount: actions.length,
                    users: actions
                });

            } catch (err) {
                console.error(`Error processing admin ${admin.username}:`, err);
                report.push({ admin: admin.username, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            date: targetDay,
            report
        });

    } catch (error) {
        console.error('Auto-Isolation Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
