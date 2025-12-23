import { NextResponse } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export async function GET(request) {
    const user = await getUserFromRequest(request);

    if (!user) {
        return unauthorizedResponse();
    }

    // Fetch fresh user data from DB to ensure latest name/role
    const db = (await import('@/lib/db')).default;
    const freshUser = await db.user.findUnique({
        where: { id: user.id },
        select: { id: true, username: true, fullName: true, role: true, ownerId: true }
    });

    if (!freshUser) return unauthorizedResponse();

    const token = Buffer.from(JSON.stringify({
        username: freshUser.username,
        fullName: freshUser.fullName,
        role: freshUser.role,
        id: freshUser.id,
        ownerId: freshUser.ownerId
    })).toString('base64');

    return NextResponse.json({ user: freshUser, token });
}
