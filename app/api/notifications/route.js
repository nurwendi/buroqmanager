import { NextResponse } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';
import { getNotifications, createBlastNotification } from '@/lib/notifications-db';

export async function GET(request) {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 50;

    const queryParams = { limit };
    if (user.role === 'customer') {
        queryParams.customerId = user.id;
    } else {
        queryParams.userId = user.id;
    }

    const notifications = await getNotifications(queryParams);
    return NextResponse.json(notifications);
}

export async function POST(request) {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    // Only Admin or Superadmin can send blasts
    if (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'manager') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { title, message, type, target } = body;

        if (!title || !message) {
            return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
        }

        // Admin can only blast their own organization
        // Superadmin can blast everything (ownerId null) or specify ownerId
        const ownerId = user.role === 'superadmin' ? (body.ownerId || null) : user.id;

        const notification = await createBlastNotification({
            title,
            message,
            type: type || 'info',
            senderId: user.id,
            ownerId,
            target: target || 'all'
        });

        return NextResponse.json({ success: true, notification });
    } catch (error) {
        console.error('[API Notifications] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
