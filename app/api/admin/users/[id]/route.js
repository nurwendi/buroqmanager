import { NextResponse } from 'next/server';
import { updateUser, deleteUser, getUserById } from '@/lib/auth';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export async function PUT(request, { params }) {
    try {
        const currentUser = await getUserFromRequest(request);
        if (!currentUser) return unauthorizedResponse();

        const { id } = await params;
        const body = await request.json();

        // Check if username is being changed
        if (body.username) {
            const existingUser = await getUserById(id);
            if (existingUser && existingUser.username !== body.username) {
                // Username change attempted
                if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
                    return NextResponse.json({ error: 'Only admins can change usernames' }, { status: 403 });
                }
            }
        }

        const updatedUser = await updateUser(id, body);
        return NextResponse.json(updatedUser);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        await deleteUser(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
