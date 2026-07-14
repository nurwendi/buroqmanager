import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request) {
    try {
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
