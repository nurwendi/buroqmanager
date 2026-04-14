import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/security';

export async function getUserFromRequest(request) {
    try {
        // 1. Check for Authorization header (Bearer token)
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const resolvedUser = await verifyToken(token);
            if (!resolvedUser) {
                console.warn(`[AUTH] Bearer token rejected from ${authHeader.substring(0, 15)}...`);
            } else {
                console.log(`[AUTH] Resolved User from Bearer: ${resolvedUser.username} (${resolvedUser.role})`);
            }
            return resolvedUser;
        }

        // 2. Check for auth_token cookie (Web fallback)
        const cookieToken = request.cookies.get('auth_token');
        if (cookieToken) {
            const resolvedUser = await verifyToken(cookieToken.value);
            return resolvedUser;
        }

        return null;
    } catch (error) {
        console.error('[AUTH] Error parsing auth token:', error.message);
        return null;
    }
}

export function unauthorizedResponse() {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
