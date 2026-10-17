import db from './db';
import { getMikrotikClient } from './mikrotik.js';

export async function getLogs(ownerId = null) {
    try {
        const where = {};
        if (ownerId) where.ownerId = ownerId;

        const logs = await db.log.findMany({
            where: where,
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        return logs;
    } catch (error) {
        console.error('Error fetching logs:', error);
        return [];
    }
}

export async function saveLogs(logs) {
    return true;
}

export async function addLog(message, options = {}) {
    try {
        await db.log.create({
            data: {
                message: message,
                username: options.username || null,
                time: new Date().toISOString(),
                status: 'info',
                ownerId: options.ownerId || null
            }
        });
    } catch (e) {
        console.error('Error adding log:', e);
    }
}

export async function syncLogs(ownerId = null, connectionId = null) {
    try {
        // If no specific connectionId is passed, sync across all configured connections
        if (!connectionId) {
            const { getConfig } = await import('./config.js');
            const config = await getConfig();
            const connections = config.connections || [];

            if (connections.length > 0) {
                let totalSynced = 0;
                for (const conn of connections) {
                    totalSynced += await syncSingleRouterLogs(conn.ownerId || ownerId, conn.id);
                }
                return totalSynced;
            }
        }

        return await syncSingleRouterLogs(ownerId, connectionId);
    } catch (error) {
        console.error('Error syncing logs:', error);
        return 0;
    }
}

async function syncSingleRouterLogs(ownerId = null, connectionId = null) {
    try {
        const client = await getMikrotikClient(connectionId);

        // Fetch logs
        const mikrotikLogs = await client.write('/log/print', []);

        // Filter and process Mikrotik logs
        const processedLogs = mikrotikLogs
            .reverse()
            .map(log => {
                const message = log.message;
                if (!message) return null;
                const pppoeMatch = message.match(/^<pppoe-(.+?)>:\s*(connected|disconnected)$/);

                if (!pppoeMatch) return null;

                const username = pppoeMatch[1];
                const status = pppoeMatch[2];
                const cleanMessage = `${username} : ${status}`;

                return {
                    mikrotikId: connectionId ? `${connectionId}_${log['.id']}` : log['.id'],
                    time: log.time,
                    message: cleanMessage,
                    username: username,
                    status: status
                };
            })
            .filter(item => item !== null);

        if (processedLogs.length === 0) return 0;

        // Batch-resolve ownerId from customers if ownerId not provided
        let customerOwnerMap = new Map();
        if (!ownerId) {
            const usernames = [...new Set(processedLogs.map(l => l.username).filter(Boolean))];
            if (usernames.length > 0) {
                const customers = await db.customer.findMany({
                    where: { username: { in: usernames } },
                    select: { username: true, ownerId: true }
                });
                for (const c of customers) {
                    if (!customerOwnerMap.has(c.username) && c.ownerId) {
                        customerOwnerMap.set(c.username, c.ownerId);
                    }
                }
            }
        }

        // Batch-fetch existing logs by mikrotikId to avoid N+1 duplicate checks
        const mikrotikIds = [...new Set(processedLogs.map(l => l.mikrotikId).filter(Boolean))];
        const existingLogs = mikrotikIds.length > 0
            ? await db.log.findMany({
                where: { mikrotikId: { in: mikrotikIds } },
                select: { mikrotikId: true, time: true, message: true }
            })
            : [];

        const existingKeySet = new Set(
            existingLogs.map(e => `${e.mikrotikId || ''}|${e.time || ''}|${e.message || ''}`)
        );

        const logsToInsert = [];
        for (const log of processedLogs) {
            const key = `${log.mikrotikId || ''}|${log.time || ''}|${log.message || ''}`;
            if (existingKeySet.has(key)) continue;
            existingKeySet.add(key);

            const finalOwnerId = ownerId || customerOwnerMap.get(log.username) || null;
            logsToInsert.push({
                mikrotikId: log.mikrotikId,
                time: log.time,
                message: log.message,
                username: log.username,
                status: log.status,
                ownerId: finalOwnerId
            });
        }

        let count = 0;
        if (logsToInsert.length > 0) {
            const res = await db.log.createMany({ data: logsToInsert });
            count = res.count;
            console.log(`[Sync] Synced ${count} new logs (Router: ${connectionId || 'default'}).`);
        }
        return count;

    } catch (error) {
        console.error(`Error syncing logs for router ${connectionId || 'default'}:`, error.message);
        return 0;
    }
}

/**
 * Automatically prune old logs, system metrics, and read notifications to keep PostgreSQL lean
 */
export async function pruneOldRecords(retentionDays = 30) {
    try {
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        const metricCutoffDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 days for system metrics
        const notifCutoffDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days for notifications
        const radAcctCutoffDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000); // 180 days for closed RADIUS accounting sessions

        const [deletedLogs, deletedMetrics, deletedNotifs, deletedPostAuth, deletedRadAcct] = await Promise.all([
            db.log.deleteMany({
                where: { createdAt: { lt: cutoffDate } }
            }),
            db.systemMetric.deleteMany({
                where: { timestamp: { lt: metricCutoffDate } }
            }),
            db.notification.deleteMany({
                where: { createdAt: { lt: notifCutoffDate } }
            }),
            db.radPostAuth.deleteMany({
                where: { authdate: { lt: cutoffDate } }
            }),
            db.radAcct.deleteMany({
                where: {
                    acctstoptime: { not: null, lt: radAcctCutoffDate }
                }
            })
        ]);

        console.log(
            `[Maintenance] Pruned ${deletedLogs.count} old logs, ${deletedMetrics.count} metrics, ${deletedNotifs.count} notifications, ${deletedPostAuth.count} radpostauth, and ${deletedRadAcct.count} closed radacct sessions.`
        );
        return {
            logs: deletedLogs.count,
            metrics: deletedMetrics.count,
            notifications: deletedNotifs.count,
            radPostAuth: deletedPostAuth.count,
            radAcct: deletedRadAcct.count
        };
    } catch (error) {
        console.error('[Maintenance] Error pruning old records:', error);
        return null;
    }
}


