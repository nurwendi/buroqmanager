import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        
        let where = {};
        if (user) {
            if (user.role === 'admin') {
                where.ownerId = user.id;
            } else if (user.role === 'superadmin') {
                // No filter
            } else if (['agent', 'partner', 'technician', 'staff', 'editor'].includes(user.role)) {
                where.OR = [
                    { agentId: user.id },
                    { technicianId: user.id }
                ];
                if (user.ownerId) {
                    where.ownerId = user.ownerId;
                }
            } else {
                if (user.ownerId) where.ownerId = user.ownerId;
            }
        }

        where.coordinates = {
            not: null,
            contains: ','
        };

        const withCoords = await db.customer.findMany({
            where,
            select: {
                username: true,
                name: true,
                phone: true,
                address: true,
                coordinates: true,
                profile: {
                    select: {
                        name: true
                    }
                }
            }
        });

        return NextResponse.json(withCoords);
    } catch (error) {
        console.error('[API_CUSTOMERS_MAP_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
