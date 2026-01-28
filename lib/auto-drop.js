import { getMikrotikClient } from '@/lib/mikrotik';
import db from '@/lib/db';
import { getConfig } from '@/lib/config';

/**
 * Main function to check and drop users
 * Supports both automatic (daily) and manual execution.
 * 
 * Strategy:
 * 1. Find Admins with isAutoIsolationEnabled = true
 * 2. If automatic run, check if today == admin.autoIsolationDate
 * 3. Find unpaid customers for valid admins
 * 4. Connect to Mikrotik and set Secret Profile = 'DROP'
 * 5. Remove Active Connection to force reconnect
 * 
 * @param {Object} options
 * @param {boolean} [options.manual=false] - If true, ignores date checks (unless targetDate provided)
 * @param {string} [options.specificUserId] - If provided, only run for this admin ID
 * @param {number} [options.targetDate] - Optional override for "today's date"
 */
export async function checkAndDropUsers({ manual = false, specificUserId = null, targetDate = null } = {}) {
    try {
        const today = new Date();
        const currentDay = targetDate || today.getDate();
        const currentMonth = today.getMonth(); // 0-11
        const currentYear = today.getFullYear();

        // 1. Find eligible admins
        const whereClause = {
            isAutoIsolationEnabled: true
        };

        // If not manual run, strict date check
        if (!manual && !specificUserId) {
            whereClause.autoIsolationDate = currentDay;
        }

        // Use specific admin if requested
        if (specificUserId) {
            whereClause.id = specificUserId;
        }

        const admins = await db.user.findMany({
            where: whereClause
        });

        if (admins.length === 0) {
            return {
                success: true,
                message: 'No admins scheduled for auto-isolation.',
                date: currentDay,
                report: []
            };
        }

        const report = [];

        // 2. Process each Admin
        for (const admin of admins) {
            try {
                // Skip if manual=false and date doesn't match (double check for safety)
                if (!manual && !specificUserId && admin.autoIsolationDate !== currentDay) {
                    continue;
                }

                // Get Admin's Mikrotik Connection
                const config = await getConfig();
                let connectionId = null;

                if (admin.role === 'admin') {
                    const myConn = config.connections?.find(c => c.ownerId === admin.id);
                    connectionId = myConn ? myConn.id : null;
                } else if (admin.role === 'superadmin') {
                    connectionId = config.activeConnectionId;
                }

                if (!connectionId) {
                    report.push({ admin: admin.username, error: 'No Mikrotik connection found' });
                    continue;
                }

                // 3. Find Unpaid Customers
                const customers = await db.customer.findMany({
                    where: { ownerId: admin.id }
                });

                const payments = await db.payment.findMany({
                    where: {
                        ownerId: admin.id,
                        month: currentMonth,
                        year: currentYear
                    }
                });

                const paidUsernames = new Set(payments.map(p => p.username));
                const unpaidCustomers = customers.filter(c => !paidUsernames.has(c.username));
                const unpaidUsernames = unpaidCustomers.map(c => c.username);

                if (unpaidUsernames.length === 0) {
                    report.push({ admin: admin.username, message: 'All customers paid', count: 0 });
                    continue;
                }

                // 4. Connect to Mikrotik
                const client = await getMikrotikClient(connectionId);
                const actions = [];

                // Fetch secrets to get IDs
                // Optimization: Filter by name in query if possible, but for array just fetch all or iterative?
                // Iterative is safer for large lists usually, but 'print' with ?name is standard.

                for (const username of unpaidUsernames) {
                    try {
                        const secrets = await client.write('/ppp/secret/print', [`?name=${username}`]);

                        // We target secrets that are NOT already DROP profile
                        // We also ensure they are ENABLED (disabled=false) or simply force DROP regardless?
                        // Let's force DROP regardless of disabled state, but usually we want active users.

                        if (secrets && secrets.length > 0) {
                            const secret = secrets[0];

                            // Check if already DROP
                            if (secret.profile !== 'DROP') {
                                // CHANGE PROFILE TO DROP
                                await client.write('/ppp/secret/set', [
                                    `=.id=${secret['.id']}`,
                                    '=profile=DROP',
                                    `=comment=Auto-Isolated (DROP) on ${today.toISOString().split('T')[0]}`
                                ]);

                                // KILL ACTIVE CONNECTION
                                const activeConns = await client.write('/ppp/active/print', [`?name=${username}`]);
                                for (const active of activeConns) {
                                    await client.write('/ppp/active/remove', [`=.id=${active['.id']}`]);
                                }

                                actions.push(username);

                                // Log Notification
                                await db.notification.create({
                                    data: {
                                        message: `Auto-Isolated user ${username} (Profile set to DROP).`,
                                        username: username,
                                        status: 'warning',
                                        ownerId: admin.id,
                                        mikrotikId: 'system-auto'
                                    }
                                });
                            }
                        }
                    } catch (err) {
                        console.error(`Failed to isolate ${username}`, err);
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

        return {
            success: true,
            date: currentDay,
            report
        };

    } catch (error) {
        console.error('Auto-Drop Logic Error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

