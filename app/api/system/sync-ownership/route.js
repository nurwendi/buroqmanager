import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import db from '@/lib/db';
import { getConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const config = await getConfig();
        const connections = config.connections || [];
        const results = [];

        for (const conn of connections) {
            if (!conn.ownerId) {
                results.push({ router: conn.name, status: 'Skipped (No Owner)' });
                continue;
            }

            try {
                // Connect to this specific router
                const client = await getMikrotikClient(conn.id);
                const secrets = await client.write('/ppp/secret/print');

                let syncedCount = 0;
                let errorCount = 0;

                for (const secret of secrets) {
                    // Upsert Customer
                    // Strategy: Match by username. Update ownerId to match Router Owner.
                    try {
                        const existing = await db.customer.findUnique({
                            where: { username: secret.name }
                        });

                        if (existing) {
                            if (existing.ownerId !== conn.ownerId) {
                                await db.customer.update({
                                    where: { id: existing.id }, // Wait, Customer defined by @id username? Let's check schema.
                                    // Schema says: username String @id. So `where: { username: ... }`.
                                    // Existing code said `where: { id: existing.id }`. ID might not exist if username is ID.
                                    // Schema: username @id. No 'id' column on Customer?
                                    // Let's check schema again.
                                    where: { username: secret.name },
                                    data: {
                                        owner: { connect: { id: conn.ownerId } }
                                    }
                                });
                                syncedCount++;
                            }
                        } else {
                            // Create new if missing (Auto-Import)
                            const cleanAgentNumber = (await getAgentNumber(conn.ownerId)) || '999';
                            const suffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
                            const customerNumber = `${cleanAgentNumber}${suffix}`;

                            await db.customer.create({
                                data: {
                                    username: secret.name,
                                    customerId: customerNumber,
                                    name: secret.name,
                                    // ownerId: conn.ownerId, // Replaced with relation
                                    owner: { connect: { id: conn.ownerId } },
                                    // service: secret.service || 'pppoe', // Not in DB schema
                                    // profile: secret.profile || 'default', // Not in DB schema
                                    createdAt: new Date()
                                }
                            });
                            syncedCount++;
                        }
                    } catch (err) {
                        console.error(`Error syncing user ${secret.name}:`, err);
                        // Store first few errors to return
                        if (errorCount < 5) {
                            results.push({ user: secret.name, error: err.message });
                        }
                        errorCount++;
                    }
                }
                results.push({ router: conn.name, ownerId: conn.ownerId, syncedIds: syncedCount, errors: errorCount });

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

async function getAgentNumber(userId) {
    if (!userId) return null;
    const user = await db.user.findUnique({ where: { id: userId } });
    return user?.agentNumber;
}
