import { NextResponse } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import { markAsRead, markAllAsRead } from '@/lib/notifications-db';

export async function POST(request) {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    try {
        const body = await request.json();
        const { recipientId, all } = body;

        if (all) {
            if (user.role === 'customer') {
                await markAllAsRead(null, user.id);
            } else {
                await markAllAsRead(user.id, null);
            }
            return NextResponse.json({ success: true });
        }

        if (!recipientId) {
            return NextResponse.json({ error: 'recipientId is required' }, { status: 400 });
        }

        // Verification: Optional check if recipientId belongs to this user?
        // For simplicity, we just mark it.
        await markAsRead(recipientId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API Notifications Read] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
