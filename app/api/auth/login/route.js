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

    try {
        const body = await request.json();
        const { username, password } = body;

        // Use IP + Username combination so that 1 IP used by many people doesn't get fully blocked
        const rateLimitKey = `${ip}_${username}`;
        let rateLimitData = ipCache.get(rateLimitKey) || { attempts: 0, resetTime: now + windowMs };

        // Reset attempts if the block window has expired
        if (now > rateLimitData.resetTime) {
            rateLimitData.attempts = 0;
            rateLimitData.resetTime = now + windowMs;
        }

        // Check if this specific IP+Username combo is currently rate limited
        if (rateLimitData.attempts >= maxAttempts) {
            const minutesLeft = Math.ceil((rateLimitData.resetTime - now) / 60000);
            return NextResponse.json({
                error: `Terlalu banyak percobaan gagal untuk akun ini. Silakan coba lagi dalam ${minutesLeft} menit.`
            }, { status: 429 });
        }

        const trimmedUsername = (username || '').trim();
        let user = await verifyPassword(trimmedUsername, password);

        // If local system user not found, check Customer by Customer ID or Email
        if (!user && trimmedUsername) {
            const db = (await import('@/lib/db')).default;
            const bcrypt = (await import('bcryptjs')).default;

            const customer = await db.customer.findFirst({
                where: {
                    OR: [
                        { customerId: { equals: trimmedUsername, mode: 'insensitive' } },
                        ...(trimmedUsername.includes('@')
                            ? [{ email: { equals: trimmedUsername, mode: 'insensitive' } }]
                            : [])
                    ]
                }
            });

            if (customer) {
                let authenticated = false;
                let isUsingDefaultPassword = false;

                if (customer.password && customer.password.trim() !== '') {
                    if (customer.password.startsWith('$2a$') || customer.password.startsWith('$2b$')) {
                        authenticated = await bcrypt.compare(password, customer.password);
                        if (authenticated && password === 'buroq') {
                            isUsingDefaultPassword = true;
                        }
                    } else if (customer.password === password) {
                        authenticated = true;
                        if (password === 'buroq') {
                            isUsingDefaultPassword = true;
                        }
                        const hashed = await bcrypt.hash(password, 10);
                        await db.customer.update({
                            where: { id: customer.id },
                            data: { password: hashed }
                        }).catch(err => console.error('[Login] Auto-hash customer password failed:', err.message));
                    } else if (password === 'buroq') {
                        // Also check if customer still hasn't completed identity or staff assignment (first time login with 'buroq')
                        const isIdentityIncomplete =
                            !customer.name ||
                            customer.name === customer.username ||
                            !customer.phone ||
                            customer.phone === '-' ||
                            !customer.address ||
                            customer.address === '-' ||
                            (!customer.agentId && !customer.technicianId);
                        if (isIdentityIncomplete) {
                            authenticated = true;
                            isUsingDefaultPassword = true;
                        }
                    }
                } else {
                    // No password set yet -> default password is 'buroq'
                    if (password === 'buroq') {
                        authenticated = true;
                        isUsingDefaultPassword = true;
                    }
                }

                if (authenticated) {
                    // Check if customer already has a pending activation request
                    const pendingActivation = await db.registration.findFirst({
                        where: {
                            type: 'activation',
                            targetUsername: customer.username,
                            status: 'pending',
                            ...(customer.ownerId ? { ownerId: customer.ownerId } : {})
                        }
                    });

                    if (pendingActivation) {
                        ipCache.delete(rateLimitKey);
                        return NextResponse.json({
                            pendingApproval: true,
                            message: 'Pengajuan aktivasi & perubahan data identitas Anda sedang menunggu konfirmasi dari Teknisi.'
                        }, { status: 403 });
                    }

                    const isIdentityIncomplete =
                        !customer.name ||
                        customer.name === customer.username ||
                        !customer.phone ||
                        customer.phone === '-' ||
                        !customer.address ||
                        customer.address === '-' ||
                        (!customer.agentId && !customer.technicianId);

                    if (isUsingDefaultPassword || isIdentityIncomplete) {
                        ipCache.delete(rateLimitKey);

                        // Fetch available staff (sales & technicians) for this tenant
                        const staffWhere = customer.ownerId
                            ? {
                                ownerId: customer.ownerId,
                                OR: [
                                    { isTechnician: true },
                                    { isAgent: true },
                                    { role: { in: ['staff', 'technician', 'agent', 'editor', 'manager'] } }
                                ]
                            }
                            : {
                                OR: [
                                    { isTechnician: true },
                                    { isAgent: true },
                                    { role: { in: ['staff', 'technician', 'agent', 'editor', 'manager'] } }
                                ]
                            };
                        const staffList = await db.user.findMany({
                            where: staffWhere,
                            select: {
                                id: true,
                                username: true,
                                fullName: true,
                                agentNumber: true,
                                role: true,
                                isTechnician: true,
                                isAgent: true
                            },
                            orderBy: { agentNumber: 'asc' }
                        });

                        const existingStaffId = customer.technicianId || customer.agentId || '';
                        const existingStaffObj = staffList.find(s => s.id === existingStaffId);

                        const activationToken = await signToken({
                            purpose: 'customer_activation',
                            customerId: customer.id,
                            customerNumber: customer.customerId,
                            username: customer.username,
                            ownerId: customer.ownerId
                        });

                        return NextResponse.json({
                            needsActivation: true,
                            activationToken,
                            customer: {
                                id: customer.id,
                                customerId: customer.customerId,
                                name: (customer.name && customer.name !== customer.username) ? customer.name : '',
                                email: customer.email || '',
                                phone: (customer.phone && customer.phone !== '-') ? customer.phone : '',
                                identityNumber: customer.identityNumber || '',
                                address: (customer.address && customer.address !== '-') ? customer.address : '',
                                coordinates: customer.coordinates || '',
                                comment: customer.comment || '',
                                staffId: existingStaffId,
                                staffCode: existingStaffObj?.agentNumber || ''
                            },
                            staffList
                        });
                    }

                    user = {
                        id: customer.id,
                        username: customer.customerId,
                        pppoeUsername: customer.username,
                        role: 'customer',
                        ownerId: customer.ownerId,
                        fullName: customer.name
                    };
                }
            }
        }

        if (user) {
            // Clear rate limit entries on successful login
            ipCache.delete(rateLimitKey);

            const payload = {
                username: user.username,
                role: user.role,
                id: user.id,
                ownerId: user.ownerId,
                fullName: user.fullName,
                isAgent: !!user.isAgent,
                isTechnician: !!user.isTechnician,
                pppoeUsername: user.pppoeUsername || (user.role === 'customer' ? user.username : undefined)
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
        ipCache.set(rateLimitKey, rateLimitData);

        return NextResponse.json({ error: 'Nomor Pelanggan / Email atau password salah.' }, { status: 401 });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message,
        }, { status: 500 });
    }
}
