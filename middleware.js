import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/security';

export async function middleware(request) {
    const authToken = request.cookies.get('auth_token');
    const { pathname } = request.nextUrl;

    // Allow access to login page, invoice page, and static assets
    if (pathname.startsWith('/login') || pathname.startsWith('/invoice') || pathname.startsWith('/isolir') || pathname.startsWith('/_next') || pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    // Check if user is authenticated
    let token = authToken?.value;

    // Also check for Bearer token in Authorization header (for mobile app)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }

    if (!token) {
        // For API routes, return 401 instead of redirect
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const user = await verifyToken(token);

    if (!user) {
        // Invalid token
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check for restricted roles
    // If user is admin, allow everything
    if (user.role === 'admin') {
        return NextResponse.next();
    }

    // Role: Editor
    // Allow everything EXCEPT: system-users, routers, app-settings
    if (user.role === 'editor') {
        const restrictedForEditor = ['/system-users', '/routers', '/app-settings'];
        if (restrictedForEditor.some(path => pathname.startsWith(path))) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // Role: Manager
    // Allow everything EXCEPT: system-users
    if (user.role === 'manager') {
        if (pathname.startsWith('/system-users')) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // Other Roles (agent, technician, staff, viewer)
    // By default, prevent access to admin pages unless specified
    const restrictedPaths = ['/settings', '/system-users', '/routers', '/app-settings'];
    if (restrictedPaths.some(path => pathname.startsWith(path))) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)'],
};
