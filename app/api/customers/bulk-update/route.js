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
        const ownerId = user.role === 'admin' ? user.id : user.ownerId;

        const updateData = {};
        if (agentId !== undefined) updateData.agentId = agentId || null;
        if (technicianId !== undefined) updateData.technicianId = technicianId || null;

        // 2. Find existing customers in a single query
        const existingCustomers = await db.customer.findMany({
            where: {
                username: { in: usernames },
                ...(ownerId ? { ownerId } : {})
            },
            select: { id: true, username: true }
        });

        const existingUsernames = new Set(existingCustomers.map(c => c.username));
        const existingIds = existingCustomers.map(c => c.id);

        // 3. Batch update existing customers
        if (existingIds.length > 0 && Object.keys(updateData).length > 0) {
            await db.customer.updateMany({
                where: { id: { in: existingIds } },
                data: updateData
            });
        }

        // 4. Batch create missing customers
        const missingUsernames = usernames.filter(u => !existingUsernames.has(u));
        if (missingUsernames.length > 0) {
            const { generateCustomerIdsBatch } = await import('@/lib/customer-utils');
            const newIds = await generateCustomerIdsBatch(ownerId, missingUsernames.length);
            const createData = missingUsernames.map((username, idx) => ({
                username,
                ownerId: ownerId,
                customerId: newIds[idx] || `CUST-${Date.now()}-${idx}`,
                agentId: agentId || null,
                technicianId: technicianId || null,
                name: username
            }));

            const CHUNK_SIZE = 1000;
            for (let i = 0; i < createData.length; i += CHUNK_SIZE) {
                await db.customer.createMany({
                    data: createData.slice(i, i + CHUNK_SIZE),
                    skipDuplicates: true
                });
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
