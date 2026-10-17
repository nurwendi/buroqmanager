
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || (user.role !== 'superadmin' && user.role !== 'admin' && user.role !== 'manager' && user.role !== 'technician')) {
            return unauthorizedResponse();
        }

        const where = {};
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

        // Fetch all users from radcheck (Unique usernames)
        const users = await db.radCheck.findMany({
            where,
            distinct: ['username'],
            select: { username: true },
            orderBy: { username: 'asc' }
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("Error fetching Radius Users:", error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user || (user.role !== 'superadmin' && user.role !== 'admin' && user.role !== 'manager' && user.role !== 'technician')) {
            return unauthorizedResponse();
        }

        const body = await request.json();
        const { username, password, attributes } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and Password are required' }, { status: 400 });
        }

        // 1. Add Password (Cleartext-Password or User-Password)
        const check = await db.radCheck.create({
            data: {
                username,
                attribute: 'Cleartext-Password',
                op: ':=',
                value: password
            }
        });

        // 2. Add Optional Attributes (Framed-IP-Address, etc in radreply) in a single batch
        if (attributes && Array.isArray(attributes)) {
            const replyData = attributes
                .filter(attr => attr.name && attr.value)
                .map(attr => ({
                    username,
                    attribute: attr.name,
                    op: attr.op || '=',
                    value: attr.value
                }));

            if (replyData.length > 0) {
                await db.radReply.createMany({ data: replyData });
            }
        }

        return NextResponse.json({ success: true, user: check }, { status: 201 });
    } catch (error) {
        console.error("Error creating Radius User:", error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

export async function DELETE(request) {
    const user = await getUserFromRequest(request);
    if (!user || (user.role !== 'superadmin' && user.role !== 'admin')) {
        return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

    try {
        // Verify ownership for non-superadmin before deleting
        if (user.role !== 'superadmin') {
            const customer = await db.customer.findFirst({
                where: { username, ownerId: user.id },
                select: { id: true }
            });
            if (!customer) {
                return NextResponse.json({ error: 'Forbidden: User does not belong to your tenant' }, { status: 403 });
            }
        }

        // Transactional delete
        await db.$transaction([
            db.radCheck.deleteMany({ where: { username } }),
            db.radReply.deleteMany({ where: { username } }),
            db.radUserGroup.deleteMany({ where: { username } })
        ]);

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
