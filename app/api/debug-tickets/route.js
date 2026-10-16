import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || user.role !== 'superadmin') {
            return unauthorizedResponse();
        }

        const tickets = await db.ticket.findMany({
            include: {
                customer: {
                    select: {
                        id: true,
                        customerId: true,
                        name: true,
                        ownerId: true
                    }
                }
            }
        });
        return NextResponse.json({ tickets });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
