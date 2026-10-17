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
                    where: { ownerId: admin.id },
                    select: { username: true }
                });

                const [paidPayments, pendingInvoices] = await Promise.all([
                    db.payment.findMany({
                        where: {
                            ownerId: admin.id,
                            month: currentMonth,
                            year: currentYear,
                            status: { in: ['completed', 'paid'] }
                        },
                        select: { username: true }
                    }),
                    db.payment.findMany({
                        where: {
                            ownerId: admin.id,
                            month: currentMonth,
                            year: currentYear,
                            status: 'pending'
                        },
                        select: { username: true }
                    })
                ]);

                const paidUsernames = new Set(paidPayments.map(p => p.username));
                const pendingUsernames = new Set(pendingInvoices.map(p => p.username));
                const unpaidCustomers = customers.filter(
                    c => pendingUsernames.has(c.username) || !paidUsernames.has(c.username)
                );
                const unpaidUsernames = unpaidCustomers.map(c => c.username);

                if (unpaidUsernames.length === 0) {
                    report.push({ admin: admin.username, message: 'All customers paid', count: 0 });
                    continue;
                }

                // 4. Connect to Mikrotik and batch-fetch secrets & active sessions once
                const client = await getMikrotikClient(connectionId);
                const [allSecrets, allActiveConns] = await Promise.all([
                    client.write('/ppp/secret/print'),
                    client.write('/ppp/active/print')
                ]);

                const secretMap = new Map();
                if (Array.isArray(allSecrets)) {
                    for (const s of allSecrets) {
                        if (s.name) secretMap.set(s.name, s);
                    }
                }

                const activeMap = new Map();
                if (Array.isArray(allActiveConns)) {
                    for (const a of allActiveConns) {
                        if (!a.name) continue;
                        if (!activeMap.has(a.name)) activeMap.set(a.name, []);
                        activeMap.get(a.name).push(a);
                    }
                }

                const actions = [];
                const logsToCreate = [];
                const useDisableIsolation = admin.isolationType === 'disable';
                const ISOLATION_BATCH_SIZE = 15;

                for (let i = 0; i < unpaidUsernames.length; i += ISOLATION_BATCH_SIZE) {
                    const batch = unpaidUsernames.slice(i, i + ISOLATION_BATCH_SIZE);
                    await Promise.allSettled(batch.map(async (username) => {
                        try {
                            const secret = secretMap.get(username);
                            if (!secret) return;

                            const existingComment = secret.comment || '';
                            const updatedComment = (!existingComment.includes('OLD:') && secret.profile && secret.profile !== 'DROP')
                                ? `${existingComment} OLD:${secret.profile}`.trim()
                                : existingComment;

                            let didIsolate = false;

                            if (useDisableIsolation) {
                                if (secret.disabled !== 'true') {
                                    const setParams = [
                                        `=.id=${secret['.id']}`,
                                        '=disabled=yes'
                                    ];
                                    if (updatedComment !== existingComment) {
                                        setParams.push(`=comment=${updatedComment}`);
                                    }
                                    await client.write('/ppp/secret/set', setParams);
                                    didIsolate = true;
                                }
                            } else {
                                // Default to DROP profile isolation
                                if (secret.profile !== 'DROP') {
                                    await client.write('/ppp/secret/set', [
                                        `=.id=${secret['.id']}`,
                                        '=profile=DROP',
                                        `=comment=${updatedComment}`
                                    ]);
                                    didIsolate = true;
                                }
                            }

                            if (didIsolate) {
                                // KILL ACTIVE CONNECTION
                                const activeConns = activeMap.get(username) || [];
                                for (const active of activeConns) {
                                    await client.write('/ppp/active/remove', [`=.id=${active['.id']}`]);
                                }

                                actions.push(username);

                                logsToCreate.push({
                                    message: useDisableIsolation
                                        ? `Auto-Isolated user ${username} (Secret disabled).`
                                        : `Auto-Isolated user ${username} (Profile set to DROP).`,
                                    username: username,
                                    status: 'warning',
                                    ownerId: admin.id,
                                    mikrotikId: 'system-auto'
                                });
                            }
                        } catch (err) {
                            console.error(`Failed to isolate ${username}`, err);
                        }
                    }));
                }

                if (actions.length > 0) {
                    globalThis._routerCache?.clear();
                }

                if (logsToCreate.length > 0) {
                    await db.log.createMany({ data: logsToCreate });
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

