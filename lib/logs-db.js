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
        const client = await getMikrotikClient(connectionId);

        // Fetch logs
        const mikrotikLogs = await client.write('/log/print', []);

        // Filter and process Mikrotik logs
        const processedLogs = mikrotikLogs
            .reverse()
            .map(log => {
                const message = log.message;
                const pppoeMatch = message.match(/^<pppoe-(.+?)>:\s*(connected|disconnected)$/);

                if (!pppoeMatch) return null;

                const username = pppoeMatch[1];
                const status = pppoeMatch[2];
                const cleanMessage = `${username} : ${status}`;

                return {
                    mikrotikId: log['.id'],
                    time: log.time,
                    message: cleanMessage,
                    username: username,
                    status: status
                };
            })
            .filter(item => item !== null);

        let count = 0;
        for (const log of processedLogs) {
            try {
                // Determine Owner if not provided
                let finalOwnerId = ownerId;
                if (!finalOwnerId) {
                    // Try to look up customer owner
                    const customer = await db.customer.findUnique({
                        where: { username: log.username },
                        select: { ownerId: true }
                    });
                    if (customer) finalOwnerId = customer.ownerId;
                }

                const exists = await db.log.findFirst({
                    where: {
                        mikrotikId: log.mikrotikId,
                        time: log.time,
                        message: log.message
                    }
                });

                if (!exists) {
                    await db.log.create({
                        data: {
                            mikrotikId: log.mikrotikId,
                            time: log.time,
                            message: log.message,
                            username: log.username,
                            status: log.status,
                            ownerId: finalOwnerId
                        }
                    });
                    count++;
                }
            } catch (e) {
                // ignore
            }
        }

        if (count > 0) {
            console.log(`[Sync] Synced ${count} new logs.`);
        }
        return count;

    } catch (error) {
        console.error('Error syncing logs:', error);
        return 0;
    }
}

