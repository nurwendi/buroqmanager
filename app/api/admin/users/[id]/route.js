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

        if (body.role === 'viewer') {
            return NextResponse.json({ error: 'Role viewer sudah tidak digunakan. Gunakan manager, editor, atau staff.' }, { status: 400 });
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

        // Auto-generate standardized ID (ownerPrefix + 3-digit sequence) if missing for manager/editor/staff
        const effectiveRole = body.role || targetUser.role;
        const effectiveOwnerId = targetUser.ownerId || (currentUser.role === 'admin' ? currentUser.id : null);
        if (
            ['manager', 'editor', 'staff'].includes(effectiveRole) &&
            effectiveOwnerId &&
            (!targetUser.agentNumber || !targetUser.agentNumber.trim()) &&
            (!body.agentNumber || !body.agentNumber.trim())
        ) {
            const db = (await import('@/lib/db')).default;
            const owner = await db.user.findUnique({
                where: { id: effectiveOwnerId },
                select: { agentNumber: true }
            });
            const ownerPrefix = (owner?.agentNumber && owner.agentNumber.trim() !== '') ? owner.agentNumber : '01';
            const existingStaff = await db.user.findMany({
                where: {
                    ownerId: effectiveOwnerId,
                    agentNumber: { startsWith: ownerPrefix }
                },
                select: { agentNumber: true }
            });
            let maxSeq = 0;
            for (const u of existingStaff) {
                if (u.agentNumber && u.agentNumber.length > ownerPrefix.length) {
                    const seq = parseInt(u.agentNumber.substring(ownerPrefix.length), 10);
                    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
                }
            }
            body.agentNumber = `${ownerPrefix}${String(maxSeq + 1).padStart(3, '0')}`;
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
