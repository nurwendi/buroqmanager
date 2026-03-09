import { NextResponse } from 'next/server';
import { getRouterIdentity } from '@/lib/mikrotik';
import { verifyToken } from '@/lib/security';

async function getCurrentUser(request) {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    return await verifyToken(token);
}

export async function GET(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('id');

        if (!connectionId) {
            return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
        }

        // Add a timeout to the identity fetch to prevent long-hanging requests
        const identityPromise = getRouterIdentity(connectionId);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Identity fetch timeout')), 5000)
        );

        const identity = await Promise.race([identityPromise, timeoutPromise]);

        if (identity) {
            return NextResponse.json({ 
                success: true, 
                identity,
                status: 'online'
            });
        } else {
            return NextResponse.json({ 
                success: false, 
                status: 'offline' 
            });
        }
    } catch (error) {
        console.error('Router status error:', error);
        return NextResponse.json({ 
            success: false, 
            status: 'offline', 
            error: error.message 
        });
    }
}
