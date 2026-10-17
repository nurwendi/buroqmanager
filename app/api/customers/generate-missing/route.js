import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import db from '@/lib/db';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export async function POST(request) {
    try {
        const currentUser = await getUserFromRequest(request);
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
            return unauthorizedResponse();
        }

        const ownerId = currentUser.role === 'admin' ? currentUser.id : currentUser.ownerId || null;
        const client = await getMikrotikClient();
        const users = await client.write('/ppp/secret/print');

        // Get max customer number from DB
        const customers = await db.customer.findMany({
            where: ownerId ? { ownerId } : {},
            select: { id: true, username: true, customerId: true, ownerId: true }
        });
        const customerMap = new Map(customers.map(c => [c.username, c]));

        let maxId = 10000;
        for (const c of customers) {
            if (c.customerId) {
                const numPart = parseInt(c.customerId);
                if (!isNaN(numPart) && numPart > maxId) {
                    maxId = numPart;
                }
            }
        }

        let updatedCount = 0;
        const toCreate = [];
        const toUpdate = [];
        const seenUsernames = new Set();

        const bcrypt = (await import('bcryptjs')).default;
        const defaultPasswordHash = await bcrypt.hash('buroq', 10);

        for (const user of users) {
            const username = user.name;
            if (!username || seenUsernames.has(username)) continue;
            seenUsernames.add(username);

            const existing = customerMap.get(username);

            if (!existing || !existing.customerId) {
                maxId++;
                const newCustomerId = String(maxId);

                if (existing) {
                    toUpdate.push({ id: existing.id, customerId: newCustomerId });
                } else {
                    toCreate.push({
                        username,
                        name: '',
                        customerId: newCustomerId,
                        password: defaultPasswordHash,
                        agentId: null,
                        ownerId: ownerId
                    });
                }

                updatedCount++;
            }
        }

        const CHUNK_SIZE = 1000;
        for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
            await db.customer.createMany({
                data: toCreate.slice(i, i + CHUNK_SIZE),
                skipDuplicates: true
            });
        }

        for (let i = 0; i < toUpdate.length; i += 50) {
            const chunk = toUpdate.slice(i, i + 50);
            await Promise.all(
                chunk.map(item =>
                    db.customer.update({
                        where: { id: item.id },
                        data: { customerId: item.customerId }
                    })
                )
            );
        }

        return NextResponse.json({
            success: true,
            message: `Successfully generated customer numbers for ${updatedCount} users.`,
            updatedCount
        });

    } catch (error) {
        console.error('Failed to generate missing customer numbers:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


