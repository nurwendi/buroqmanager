import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import db from '@/lib/db';

export async function POST(request) {
    try {
        const client = await getMikrotikClient();
        const users = await client.write('/ppp/secret/print');

        // Get max customer number from DB
        // Since customerNumber is string, we need to fetch all and parse, or just fetch all
        const customers = await db.customer.findMany({
            select: { username: true, customerId: true }
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

                // Upsert customer
                await db.customer.upsert({
                    where: { username },
                    update: { customerId: newCustomerId },
                    create: {
                        username,
                        name: '',
                        customerId: newCustomerId,
                        agentId: null
                    }
                });

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


