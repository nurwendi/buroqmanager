import { NextResponse } from 'next/server';
import { updateUser, deleteUser, getUserById } from '@/lib/auth';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export async function PUT(request, { params }) {
    try {
        const currentUser = await getUserFromRequest(request);
        if (!currentUser) return unauthorizedResponse();

        const { id } = await params;
        const body = await request.json();

        const targetUser = await getUserById(id);
        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (currentUser.role !== 'superadmin' && currentUser.role !== 'admin') {
            if (currentUser.id !== id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            // Strip privileged fields for non-admin self-updates
            const privilegedFields = [
                'role',
                'ownerId',
                'agentRate',
                'technicianRate',
                'isAgent',
                'isTechnician',
                'agentNumber',
                'prefix',
                'radiusPool'
            ];
            for (const field of privilegedFields) {
                delete body[field];
            }
        } else if (currentUser.role === 'admin') {
            if (targetUser.id !== currentUser.id && targetUser.ownerId !== currentUser.id) {
                return NextResponse.json({ error: 'Forbidden: User does not belong to your tenant' }, { status: 403 });
            }
            if (body.role === 'superadmin' || (targetUser.id !== currentUser.id && body.role === 'admin')) {
                return NextResponse.json({ error: 'Forbidden: Cannot escalate role' }, { status: 403 });
            }
            delete body.ownerId;
        }

        // Check if username is being changed
        if (body.username && targetUser.username !== body.username) {
            if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
                return NextResponse.json({ error: 'Only admins can change usernames' }, { status: 403 });
            }
        }

        // Restrict changing radiusPool to Superadmin
        if (typeof body.radiusPool !== 'undefined' && currentUser.role !== 'superadmin') {
            delete body.radiusPool;
        }

        const updatedUser = await updateUser(id, body);
        return NextResponse.json(updatedUser);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const currentUser = await getUserFromRequest(request);
        if (!currentUser) return unauthorizedResponse();

        if (currentUser.role !== 'superadmin' && currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;

        if (currentUser.id === id) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
        }

        const targetUser = await getUserById(id);
        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (currentUser.role === 'admin' && targetUser.ownerId !== currentUser.id) {
            return NextResponse.json({ error: 'Forbidden: User does not belong to your tenant' }, { status: 403 });
        }

        await deleteUser(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
