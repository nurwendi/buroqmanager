import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth';
import { signToken } from '@/lib/security';

const ipCache = new Map();

// Helper to get client IP address
function getClientIp(request) {
    const xForwardedFor = request.headers.get('x-forwarded-for');
    if (xForwardedFor) {
        return xForwardedFor.split(',')[0].trim();
    }
    return '127.0.0.1';
}

// Cleanup interval to avoid memory leaks
if (typeof global !== 'undefined' && !global._ipCacheCleanupSet) {
    global._ipCacheCleanupSet = true;
    setInterval(() => {
        const now = Date.now();
        for (const [ip, data] of ipCache.entries()) {
            if (now > data.resetTime) {
                ipCache.delete(ip);
            }
        }
    }, 10 * 60 * 1000); // Cleanup every 10 minutes
}

export async function POST(request) {
    const ip = getClientIp(request);
    const now = Date.now();
    const maxAttempts = 5;
    const windowMs = 15 * 60 * 1000; // 15 minutes lock

    let rateLimitData = ipCache.get(ip) || { attempts: 0, resetTime: now + windowMs };

    // Reset attempts if the block window has expired
    if (now > rateLimitData.resetTime) {
        rateLimitData.attempts = 0;
        rateLimitData.resetTime = now + windowMs;
    }

    // Check if the IP is currently rate limited
    if (rateLimitData.attempts >= maxAttempts) {
        const minutesLeft = Math.ceil((rateLimitData.resetTime - now) / 60000);
        return NextResponse.json({
            error: `Terlalu banyak percobaan login gagal dari IP Anda. Silakan coba lagi dalam ${minutesLeft} menit.`
        }, { status: 429 });
    }

    try {
        const body = await request.json();
        const { username, password } = body;

        let user = await verifyPassword(username, password);

        // If local system user not found, check if input is Customer ID (e.g. BRQ-0001)
        if (!user) {
            const db = (await import('@/lib/db')).default;

            // Find Customer by customerId only (primary login method for customers)
            const customer = await db.customer.findFirst({
                where: {
                    customerId: username // ONLY login by Customer ID (e.g. BRQ-0001)
                }
            });

            if (customer) {
                let authenticated = false;

                // Method 1: Check cached/local password (hashed in DB)
                if (customer.password) {
                    const bcrypt = await import('bcryptjs');
                    const isValid = await bcrypt.compare(password, customer.password);
                    if (isValid) {
                        authenticated = true;
                    }
                }

                // Method 2: Verify against Mikrotik PPPoE (if no local password or local failed)
                if (!authenticated) {
                    try {
                        const { verifyPppoeCredentials } = await import('@/lib/mikrotik');
                        // Use the customer's PPPoE username (not CustomerID) to verify against Mikrotik
                        const pppoeUser = await verifyPppoeCredentials(customer.username, password);

                        if (pppoeUser) {
                            authenticated = true;

                            // Cache the PPPoE password as hashed local password for offline fallback
                            const bcrypt = await import('bcryptjs');
                            const hashed = await bcrypt.hash(password, 10);
                            await db.customer.update({
                                where: { id: customer.id },
                                data: { password: hashed }
                            });
                        }
                    } catch (mikrotikError) {
                        console.error('[Login] Mikrotik verification failed:', mikrotikError.message);
                        // Mikrotik offline — authentication fails if no cached password
                    }
                }

                if (authenticated) {
                    user = {
                        id: customer.id,
                        username: customer.customerId,
                        role: 'customer',
                        ownerId: customer.ownerId,
                        fullName: customer.name
                    };
                }
            }
        }

        if (user) {
            // Clear rate limit entries on successful login
            ipCache.delete(ip);

            const payload = {
                username: user.username,
                role: user.role,
                id: user.id,
                ownerId: user.ownerId,
                fullName: user.fullName
            };

            const token = await signToken(payload);

            const response = NextResponse.json({ success: true, user, token });

            response.cookies.set('auth_token', token, {
                httpOnly: true,
                secure: false,
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: '/',
            });

            return response;
        }

        // Record failed attempt
        rateLimitData.attempts += 1;
        ipCache.set(ip, rateLimitData);

        return NextResponse.json({ error: 'ID Pelanggan atau password salah.' }, { status: 401 });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message,
        }, { status: 500 });
    }
}
