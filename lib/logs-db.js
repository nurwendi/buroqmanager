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
            console.log(`[Sync] Synced ${count} new logs.`);
        }
        return count;

    } catch (error) {
        console.error('Error syncing logs:', error);
        return 0;
    }
}

