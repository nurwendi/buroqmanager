import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/security';

export async function proxy(request) {
    const authToken = request.cookies.get('auth_token');
    const { pathname } = request.nextUrl;

    // Allow access to public pages and static assets
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/invoice') ||
        pathname.startsWith('/isolir') ||
        pathname.startsWith('/_next')
    ) {
        return NextResponse.next();
    }

    // Allow public API routes
    if (
        pathname === '/api/auth/login' ||
        pathname === '/api/auth/logout' ||
        pathname.startsWith('/api/isolir') ||
        (pathname === '/api/app-settings' && request.method === 'GET') ||
        pathname.startsWith('/api/uploads') ||
        pathname.startsWith('/api/webhooks/midtrans') ||
        pathname.startsWith('/api/cron')
    ) {
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
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const user = await verifyToken(token);

    if (!user) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // API routes handle their own fine-grained authorization
    if (pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    // Restrict /superadmin strictly to superadmin role
    if (pathname.startsWith('/superadmin') && user.role !== 'superadmin') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // If user is superadmin, allow everything
    if (user.role === 'superadmin') {
        return NextResponse.next();
    }

    // If user is admin, allow everything (except /superadmin handled above)
    if (user.role === 'admin') {
        return NextResponse.next();
    }

    // Role: Customer — only allow specific customer pages
    if (user.role === 'customer') {
        const allowedForCustomer = ['/billing', '/invoice', '/isolir', '/profile', '/tickets', '/notifications'];
        const isAllowed =
            pathname === '/' ||
            allowedForCustomer.some(path => pathname === path || pathname.startsWith(path + '/'));
        if (!isAllowed) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // Role: Editor
    if (user.role === 'editor') {
        const restrictedForEditor = ['/system-users', '/system-admin', '/routers', '/app-settings', '/superadmin'];
        if (restrictedForEditor.some(path => pathname.startsWith(path))) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // Role: Manager
    if (user.role === 'manager') {
        const restrictedForManager = ['/system-users', '/system-admin', '/superadmin'];
        if (restrictedForManager.some(path => pathname.startsWith(path))) {
            return NextResponse.redirect(new URL('/', request.url));
        }
        return NextResponse.next();
    }

    // Other Roles (agent, technician, staff, viewer)
    const restrictedPaths = [
        '/settings',
        '/system-users',
        '/system-admin',
        '/superadmin',
        '/routers',
        '/app-settings',
        '/drop-users',
        '/radius/nas'
    ];
    if (restrictedPaths.some(path => pathname.startsWith(path))) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|uploads|.*\\.(?:jpg|jpeg|gif|png|webp|svg)).*)'],
};
