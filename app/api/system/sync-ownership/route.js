import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import db from '@/lib/db';
import { getConfig } from '@/lib/config';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const currentUser = await getUserFromRequest(request);
        if (!currentUser || (currentUser.role !== 'superadmin' && currentUser.role !== 'admin')) {
            return unauthorizedResponse();
        }

        const config = await getConfig();
        let connections = config.connections || [];

        if (currentUser.role === 'admin') {
            connections = connections.filter(c => c.ownerId === currentUser.id);
        }

        const results = [];

        // Pre-fetch owner agentNumbers in a single query
        const ownerIds = [...new Set(connections.map(c => c.ownerId).filter(Boolean))];
        const owners = ownerIds.length > 0
            ? await db.user.findMany({
                where: { id: { in: ownerIds } },
                select: { id: true, agentNumber: true }
            })
            : [];
        const agentNumberMap = new Map(owners.map(o => [o.id, o.agentNumber || '99']));

        for (const conn of connections) {
            if (!conn.ownerId) {
                results.push({ router: conn.name, status: 'Skipped (No Owner)' });
                continue;
            }

            try {
                const client = await getMikrotikClient(conn.id);
                const secrets = await client.write('/ppp/secret/print');
                const cleanAgentNumber = agentNumberMap.get(conn.ownerId) || '99';

                // Batch-fetch all existing customers for this owner
                const existingCustomers = await db.customer.findMany({
                    where: { ownerId: conn.ownerId },
                    select: { id: true, username: true, customerId: true }
                });
                const existingMap = new Map(existingCustomers.map(c => [c.username, c]));
                const usedIds = new Set(existingCustomers.map(c => c.customerId).filter(Boolean));

                const generateUniqueId = () => {
                    for (let attempt = 0; attempt < 20; attempt++) {
                        const suffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
                        const candidate = `${cleanAgentNumber}${suffix}`;
                        if (!usedIds.has(candidate)) {
                            usedIds.add(candidate);
                            return candidate;
                        }
                    }
                    return `${cleanAgentNumber}${Date.now().toString().slice(-6)}`;
                };

                const toCreate = [];
                const toUpdate = [];
                const seenUsernames = new Set();

                for (const secret of secrets) {
                    if (!secret.name || seenUsernames.has(secret.name)) continue;
                    seenUsernames.add(secret.name);

                    const existing = existingMap.get(secret.name);
                    if (existing) {
                        if (!existing.customerId) {
                            toUpdate.push({ id: existing.id, customerId: generateUniqueId() });
                        }
                    } else {
                        toCreate.push({
                            username: secret.name,
                            customerId: generateUniqueId(),
                            name: secret.name,
                            ownerId: conn.ownerId,
                            createdAt: new Date()
                        });
                    }
                }

                let errorCount = 0;

                // Batch insert new customers in chunks of 1000
                const CHUNK_SIZE = 1000;
                for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
                    try {
                        await db.customer.createMany({
                            data: toCreate.slice(i, i + CHUNK_SIZE),
                            skipDuplicates: true
                        });
                    } catch (err) {
                        console.error(`Error batch creating customers for router ${conn.name}:`, err);
                        errorCount++;
                    }
                }

                // Batch update customers missing customerId in parallel chunks of 50
                for (let i = 0; i < toUpdate.length; i += 50) {
                    const chunk = toUpdate.slice(i, i + 50);
                    await Promise.all(chunk.map(item =>
                        db.customer.update({
                            where: { id: item.id },
                            data: { customerId: item.customerId }
                        }).catch(() => { errorCount++; })
                    ));
                }

                results.push({
                    router: conn.name,
                    ownerId: conn.ownerId,
                    syncedCount: seenUsernames.size,
                    createdCount: toCreate.length,
                    updatedCount: toUpdate.length,
                    errors: errorCount
                });

            } catch (err) {
                console.error(`Failed to sync router ${conn.name}:`, err);
                results.push({ router: conn.name, error: err.message });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

