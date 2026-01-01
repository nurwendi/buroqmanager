
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request) {
    try {
        // Fetch all users from radcheck (Unique usernames)
        // Since radcheck can have multiple rows per user (different attributes), we distinct them.
        const users = await db.radCheck.findMany({
            distinct: ['username'],
            select: { username: true },
            orderBy: { username: 'asc' }
        });

        const detailedUsers = [];

        // This N+1 is not ideal for 100k users, pagination is MUST in real implementation.
        // For now, we implement basic mapping. A better approach for 100k users is server-side pagination.
        // Let's implement cursor/limit based pagination if needed, or just return basic list first.

        // Optimized: Fetch attributes in bulk if possible, but prisma groupBy is tricky here.
        // Let's stick to returning basic list and fetch details on specific user click or optimize later.

        return NextResponse.json(users);
    } catch (error) {
        console.error("Error fetching Radius Users:", error);
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, password, attributes } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and Password are required' }, { status: 400 });
        }

        // 1. Add Password (Cleartext-Password or User-Password)
        // FreeRADIUS typically expects 'Cleartext-Password' := 'password'
        const check = await db.radCheck.create({
            data: {
                username,
                attribute: 'Cleartext-Password',
                op: ':=',
                value: password
            }
        });

        // 2. Add Optional Attributes (Framed-IP-Address, etc in radreply)
        if (attributes && Array.isArray(attributes)) {
            for (const attr of attributes) {
                if (attr.name && attr.value) {
                    await db.radReply.create({
                        data: {
                            username,
                            attribute: attr.name, // e.g. "Framed-IP-Address"
                            op: attr.op || '=',
                            value: attr.value
                        }
                    });
                }
            }
        }

        return NextResponse.json({ success: true, user: check }, { status: 201 });
    } catch (error) {
        console.error("Error creating Radius User:", error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

export async function DELETE(request) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 });

    try {
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
