import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export async function POST(request) {
    try {
        const currentUser = await getUserFromRequest(request);
        if (!currentUser) {
            return unauthorizedResponse();
        }

        const body = await request.json();
        const { username, currentPassword, newPassword } = body;

        if (!newPassword) {
            return NextResponse.json({ error: 'New password is required' }, { status: 400 });
        }

        if (newPassword.length < 4) {
            return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
        }

        const targetUsername = username || currentUser.username;
        const isSelfService = currentPassword !== undefined || !username || username === currentUser.username;

        // Mode 1: Customer self-service
        if (currentUser.role === 'customer') {
            if (username && username !== currentUser.username) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const customer = await db.customer.findFirst({
                where: {
                    OR: [
                        ...(currentUser.id ? [{ id: currentUser.id }] : []),
                        { customerId: currentUser.username },
                        { username: currentUser.username }
                    ]
                }
            });

            if (!customer) {
                return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
            }

            if (!currentPassword) {
                return NextResponse.json({ error: 'Password saat ini wajib diisi' }, { status: 400 });
            }

            let valid = false;
            if (customer.password) {
                if (customer.password.startsWith('$2')) {
                    valid = await bcrypt.compare(currentPassword, customer.password);
                } else {
                    valid = currentPassword === customer.password;
                }
            }
            if (!valid) {
                return NextResponse.json({ error: 'Password saat ini salah' }, { status: 400 });
            }

            const hashed = await bcrypt.hash(newPassword, 10);
            await db.customer.update({
                where: { id: customer.id },
                data: { password: hashed }
            });

            return NextResponse.json({ success: true, message: 'Password changed successfully' });
        }

        // Find system user
        const targetUser = await db.user.findUnique({
            where: { username: targetUsername }
        });

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Self-service password change with currentPassword verification
        if (isSelfService && targetUser.id === currentUser.id && currentPassword !== undefined) {
            const valid = await bcrypt.compare(currentPassword, targetUser.passwordHash);
            if (!valid) {
                return NextResponse.json({ error: 'Password saat ini salah' }, { status: 400 });
            }
        } else {
            // Mode 2: Admin password reset (or self-reset by admin/superadmin without currentPassword)
            const isSuperAdmin = currentUser.role === 'superadmin';
            const isTenantAdmin =
                currentUser.role === 'admin' &&
                (targetUser.id === currentUser.id || targetUser.ownerId === currentUser.id) &&
                targetUser.role !== 'superadmin';

            if (!isSuperAdmin && !isTenantAdmin) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        await db.user.update({
            where: { id: targetUser.id },
            data: { passwordHash }
        });

        return NextResponse.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
    }
}
