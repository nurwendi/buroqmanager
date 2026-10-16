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

        for (const user of users) {
            const username = user.name;
            const existing = customerMap.get(username);

            if (!existing || !existing.customerId) {
                maxId++;
                const newCustomerId = String(maxId);

                if (existing) {
                    await db.customer.update({
                        where: { id: existing.id },
                        data: { customerId: newCustomerId }
                    });
                } else {
                    await db.customer.create({
                        data: {
                            username,
                            name: username,
                            customerId: newCustomerId,
                            agentId: null,
                            ownerId: ownerId
                        }
                    });
                }

                updatedCount++;
            }
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


