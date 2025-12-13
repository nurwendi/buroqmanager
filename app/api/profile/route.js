import { NextResponse } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import { updateUser, getUserById, getUserByUsername } from '@/lib/auth';

export async function GET(request) {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    // Fetch fresh data from DB to get latest fields
    // getUserById returns the raw DB object including passwordHash
    const fullUser = await getUserById(user.id);

    if (!fullUser) {
        return unauthorizedResponse();
    }

    // Strip sensitive data
    const { passwordHash, ...safeUser } = fullUser;
    return NextResponse.json(safeUser);
}

export async function PUT(request) {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    try {
        const body = await request.json();

        // Allowed fields for update
        const allowedFields = ['username', 'password', 'fullName', 'phone', 'address', 'avatar', 'language'];
        const updates = {};

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        // Basic validation
        if (updates.username && updates.username.length < 3) {
            return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
        }
        if (updates.password && updates.password.length < 4) {
            return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
        }

        if (updates.username) {
            // Check if username is taken by another user
            const existingUser = await getUserByUsername(updates.username);
            if (existingUser && existingUser.id !== user.id) {
                return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
            }
        }

        const updatedUser = await updateUser(user.id, updates);
        return NextResponse.json(updatedUser);

    } catch (error) {
        console.error('Profile update error:', error);
        // Handle unique constraint violation (e.g. username taken)
        if (error.message.includes('Username already exists') || error.code === 'P2002') {
            return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}
