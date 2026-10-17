
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager' && user.role !== 'technician')) {
            return unauthorizedResponse();
        }

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type'); // 'online' or 'all'

        let where = {};
        let take = 100;

        if (type === 'online') {
            where.acctstoptime = null;
        }

        // Multi-tenant isolation: scope non-superadmin to their own customer usernames
        if (user.role !== 'superadmin') {
            const ownerId = user.role === 'admin' ? user.id : user.ownerId;
            const customerWhere = { ownerId };
            if (user.role === 'technician') {
                customerWhere.technicianId = user.id;
            }
            const customers = await db.customer.findMany({
                where: customerWhere,
                select: { username: true }
            });
            const allowedUsernames = customers.map(c => c.username);
            if (allowedUsernames.length === 0) {
                return NextResponse.json([]);
            }
            where.username = { in: allowedUsernames };
        }

        // Determine ordering based on context
        const orderBy = type === 'online'
            ? { acctstarttime: 'desc' } // Newest sessions first
            : { radacctid: 'desc' };  // Newest logs first

        const sessions = await db.radAcct.findMany({
            where,
            take,
            orderBy
        });

        // Serialization for BigInt
        const responseData = sessions.map(s => ({
            ...s,
            radacctid: s.radacctid.toString(),
            acctinputoctets: s.acctinputoctets ? s.acctinputoctets.toString() : '0',
            acctoutputoctets: s.acctoutputoctets ? s.acctoutputoctets.toString() : '0',
        }));

        return NextResponse.json(responseData);
    } catch (error) {
        console.error("Error fetching Radius Accounting:", error);
        return NextResponse.json({ error: 'Failed to fetch accounting data' }, { status: 500 });
    }
}
