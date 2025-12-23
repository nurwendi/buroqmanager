import { NextResponse } from 'next/server';
import { getUsers, createUser } from '@/lib/auth';
import { verifyToken } from '@/lib/security';

async function getCurrentUser(request) {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    return await verifyToken(token);
}

export async function GET(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let filter = {};
        if (currentUser.role === 'admin') {
            // Admin sees only their own users (and themselves if needed, but mainly their staff)
            // They should also see users where they are the owner
            filter = { ownerId: currentUser.id };
        } else if (currentUser.role === 'superadmin') {
            // Superadmin sees all (or specific logic)
            // For now, no filter means all
        } else {
            // Other roles shouldn't be here (Middleware blocks them), but just in case
            filter = { id: currentUser.id }; // Can only see self
        }

        const users = await getUsers(filter);
        // Remove password hash from response
        const safeUsers = users.map(({ passwordHash, ...user }) => user);
        return NextResponse.json(safeUsers);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Security / Logic checks
        if (currentUser.role === 'admin') {
            // Admin cannot create other admins or superadmins
            if (['admin', 'superadmin'].includes(body.role)) {
                return NextResponse.json({ error: 'Admins cannot create other admins' }, { status: 403 });
            }
            // Force ownerId to be the current admin
            body.ownerId = currentUser.id;

            // SCOPED USERNAME LOGIC: username@owner
            // 1. Fetch Admin's username to be sure
            const db = (await import('@/lib/db')).default;
            const adminUser = await db.user.findUnique({
                where: { id: currentUser.id },
                select: { username: true }
            });

            if (adminUser) {
                // Ensure username doesn't already have domain
                if (!body.username.includes('@')) {
                    body.username = `${body.username}@${adminUser.username}`;
                }
            }

        } else if (currentUser.role === 'superadmin') {
            // Superadmin can create admins.
            // If creating an admin, ownerId represents the superadmin who created them? 
            // Or null? If null, they are top-level. 
            // Let's keep them top-level strictly for now (ownerId=null) unless they are staff of superadmin.
            // But if superadmin creates a Staff, that staff belongs to superadmin.
            if (body.role !== 'admin' && body.role !== 'superadmin') {
                // Creating specific staff for superadmin?
                // Or maybe superadmin is assigning staff to an admin? 
                // For now, assume superadmin's staff belong to superadmin
                body.ownerId = currentUser.id;
            } else {
                // Creating Admin or Superadmin
                body.ownerId = currentUser.id;

                // Generate Numeric Admin ID (agentNumber) if not provided
                if (body.role === 'admin' && !body.agentNumber) {
                    const db = (await import('@/lib/db')).default;
                    // Find max agentNumber where role is admin
                    // agentNumber is string, need to cast or fetch all and sort
                    const admins = await db.user.findMany({
                        where: { role: 'admin' },
                        select: { agentNumber: true }
                    });

                    let maxNum = 100; // Start at 100
                    for (const a of admins) {
                        const n = parseInt(a.agentNumber);
                        if (!isNaN(n) && n >= maxNum) {
                            maxNum = n + 1;
                        }
                    }
                    body.agentNumber = String(maxNum);
                }
            }
        }

        const newUser = await createUser(body);
        return NextResponse.json(newUser);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
