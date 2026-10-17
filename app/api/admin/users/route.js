import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-auth';
import { getUsers, createUser } from '@/lib/auth';

export async function GET(request) {
    try {
        const currentUser = await getUserFromRequest(request);
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let filter = {};
        if (currentUser.role === 'admin') {
            // Admin sees only their own users and themselves
            filter = { 
                OR: [
                    { ownerId: currentUser.id },
                    { id: currentUser.id }
                ]
            };
        } else if (currentUser.role === 'superadmin') {
            // Superadmin sees all (or specific logic)
            // For now, no filter means all
        } else {
            // Other roles shouldn't be here (Middleware blocks them), but just in case
            filter = { id: currentUser.id }; // Can only see self
        }

        const users = await getUsers(filter);
        
        // Remove password hash and ensure we return what we need
        const safeUsers = users.map(({ passwordHash, ...user }) => ({
            ...user,
            // Ensure owner is flattened or available for display
            ownerName: user.owner?.username || null
        }));
        
        return NextResponse.json(safeUsers);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

async function generateStaffId(db, ownerId, ownerPrefixInput = null) {
    let ownerPrefix = ownerPrefixInput;
    if (!ownerPrefix && ownerId) {
        const owner = await db.user.findUnique({
            where: { id: ownerId },
            select: { agentNumber: true }
        });
        ownerPrefix = owner?.agentNumber;
    }
    if (!ownerPrefix || ownerPrefix.trim() === '') {
        ownerPrefix = '01';
    }

    const existingStaff = await db.user.findMany({
        where: {
            ownerId,
            agentNumber: { startsWith: ownerPrefix }
        },
        select: { agentNumber: true }
    });

    let maxSeq = 0;
    for (const u of existingStaff) {
        if (u.agentNumber && u.agentNumber.length > ownerPrefix.length) {
            const seqPart = u.agentNumber.substring(ownerPrefix.length);
            const seq = parseInt(seqPart, 10);
            if (!isNaN(seq) && seq > maxSeq) {
                maxSeq = seq;
            }
        }
    }

    return `${ownerPrefix}${String(maxSeq + 1).padStart(3, '0')}`;
}

export async function POST(request) {
    try {
        const currentUser = await getUserFromRequest(request);
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
            return NextResponse.json({ error: 'Forbidden: Only admins can create users' }, { status: 403 });
        }

        const body = await request.json();
        const { username, password, fullName, phone, address, role, agentNumber, radiusPool } = body;

        if (body.role === 'viewer') {
            return NextResponse.json({ error: 'Role viewer sudah tidak digunakan. Gunakan manager, editor, atau staff.' }, { status: 400 });
        }

        const db = (await import('@/lib/db')).default;

        // Security / Logic checks
        if (currentUser.role === 'admin') {
            // Admin cannot create other admins or superadmins
            if (['admin', 'superadmin'].includes(body.role)) {
                return NextResponse.json({ error: 'Admins cannot create other admins' }, { status: 403 });
            }
            // Force ownerId to be the current admin
            body.ownerId = currentUser.id;

            // SCOPED USERNAME LOGIC: username@owner
            const adminUser = await db.user.findUnique({
                where: { id: currentUser.id },
                select: { username: true, agentNumber: true }
            });

            if (adminUser) {
                if (!body.username.includes('@')) {
                    body.username = `${body.username}@${adminUser.username}`;
                }
            }

            // Auto-generate standardized ID (ownerPrefix + 3-digit sequence) for manager, editor, staff
            if (!body.agentNumber || !body.agentNumber.trim()) {
                body.agentNumber = await generateStaffId(db, currentUser.id, adminUser?.agentNumber);
            }

        } else if (currentUser.role === 'superadmin') {
            if (body.role === 'admin' || body.role === 'superadmin') {
                // Admin is a top-level tenant owner
                body.ownerId = null;

                // Generate Numeric Admin ID (agentNumber) if not provided
                if (body.role === 'admin' && !body.agentNumber) {
                    const admins = await db.user.findMany({
                        where: { role: 'admin' },
                        select: { agentNumber: true }
                    });

                    let maxNum = 1; // Start at 01
                    for (const a of admins) {
                        const n = parseInt(a.agentNumber);
                        if (!isNaN(n) && n >= maxNum) {
                            maxNum = n + 1;
                        }
                    }
                    body.agentNumber = String(maxNum).padStart(2, '0');
                }
            } else {
                // Staff created by superadmin belongs to superadmin (unless explicit ownerId provided)
                body.ownerId = body.ownerId || currentUser.id;
                if (!body.agentNumber || !body.agentNumber.trim()) {
                    body.agentNumber = await generateStaffId(db, body.ownerId);
                }
            }
        }

        // Add radiusPool to the body if it exists in the destructured variables
        if (radiusPool !== undefined) {
            body.radiusPool = radiusPool;
        }

        const newUser = await createUser(body);
        return NextResponse.json(newUser);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
