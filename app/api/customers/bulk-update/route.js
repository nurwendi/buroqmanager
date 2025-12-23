import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);

        // Only admin, manager, or editor can likely do this. 
        // Or maybe staff can if they are assigning to themselves?
        // For now, let's assume general permission logic handled by UI, 
        // but strict check here:
        // Only admin or superadmin can do this.
        if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { usernames, agentId, technicianId } = body;

        if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
            return NextResponse.json({ error: 'Usernames array is required' }, { status: 400 });
        }

        console.log(`[API] Bulk updating ${usernames.length} customers. Agent: ${agentId}, Tech: ${technicianId}`);

        // 1. Fetch current ownerId
        const ownerId = user.role === 'admin' ? user.id : user.ownerId; // Should be admin's ID

        const results = [];
        for (const username of usernames) {
            // Check if customer exists for this owner
            const existing = await db.customer.findFirst({
                where: {
                    username: username,
                    ownerId: ownerId
                }
            });

            if (existing) {
                // Update
                await db.customer.update({
                    where: { id: existing.id },
                    data: {
                        agentId: agentId === undefined ? undefined : (agentId || null),
                        technicianId: technicianId === undefined ? undefined : (technicianId || null)
                    }
                });
                results.push({ username, status: 'updated' });
            } else {
                // Create
                // Generate a customerId if possible, or leave it to default if DB handles it? 
                // Schema says customerId is String @unique. We usually generate it.
                // Let's use a simple generator or timestamp if not provided.
                // Actually, let's try to query max or just random for now if not strictly sequential.
                // In app/api/customers/route.js we generated it. Let's do a simple one.

                // For bulk causing collisions, maybe just Random? 
                // Better: username + timestamp? No, customerId is visible.
                // Let's rely on cuid() if schema allows or just a timestamp suffix.

                // WAIT: If we create here, we might miss other data. 
                // But this is bulk assignment. 
                // Let's try to match existing logic: 
                const newCustomerId = `CUST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                await db.customer.create({
                    data: {
                        username,
                        ownerId: ownerId,
                        customerId: newCustomerId, // Ensure this exists
                        agentId: agentId || null,
                        technicianId: technicianId || null,
                        name: username // Default name to username
                    }
                });
                results.push({ username, status: 'created' });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully updated ${usernames.length} users.`
        });

    } catch (error) {
        console.error('[API] Bulk update failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
