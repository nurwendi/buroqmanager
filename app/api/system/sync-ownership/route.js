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
                    // Strategy: Match by username AND ownerId (composite unique key)
                    try {
                        const existing = await db.customer.findUnique({
                            where: {
                                username_ownerId: {
                                    username: secret.name,
                                    ownerId: conn.ownerId
                                }
                            }
                        });

                        if (existing) {
                            // Update existing if missing customerId
                            if (!existing.customerId) {
                                const cleanAgentNumber = (await getAgentNumber(conn.ownerId)) || '99';
                                const suffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
                                const customerNumber = `${cleanAgentNumber}${suffix}`;

                                await db.customer.update({
                                    where: { id: existing.id },
                                    data: { customerId: customerNumber }
                                });
                            }
                            syncedCount++;
                        } else {
                            // Create new if missing (Auto-Import)
                            const cleanAgentNumber = (await getAgentNumber(conn.ownerId)) || '99';
                            const suffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
                            const customerNumber = `${cleanAgentNumber}${suffix}`;

                            await db.customer.create({
                                data: {
                                    username: secret.name,
                                    customerId: customerNumber,
                                    name: secret.name,
                                    owner: { connect: { id: conn.ownerId } },
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
                results.push({ router: conn.name, ownerId: conn.ownerId, syncedCount: syncedCount, errors: errorCount });

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
