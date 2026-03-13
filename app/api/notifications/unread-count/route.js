import { NextResponse } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import { getUnreadCount } from '@/lib/notifications-db';

export async function GET(request) {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    let count = 0;
    if (user.role === 'customer') {
        count = await getUnreadCount(null, user.id);
    } else {
        count = await getUnreadCount(user.id, null);
    }

    return NextResponse.json({ count });
}
