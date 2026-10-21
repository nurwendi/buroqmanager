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

            let customer = await db.customer.findFirst({
                where: {
                    OR: [
                        { customerId: { equals: trimmedUsername, mode: 'insensitive' } },
                        { username: { equals: trimmedUsername, mode: 'insensitive' } },
                        { phone: { equals: trimmedUsername, mode: 'insensitive' } },
                        ...(trimmedUsername.includes('@')
                            ? [{ email: { equals: trimmedUsername, mode: 'insensitive' } }]
                            : [])
                    ]
                }
            });

            // If not found in DB, check directly in Mikrotik routers (on-demand sync for virtual customer)
            if (!customer) {
                try {
                    const { getConfig } = await import('@/lib/config');
                    const { getMikrotikClient } = await import('@/lib/mikrotik');
                    const config = await getConfig();
                    const connections = config.connections || [];
                    const connIds = connections.length > 0 ? connections.map(c => c.id) : [undefined];

                    let matchedSecret = null;
                    let matchedOwnerId = null;

                    for (const connId of connIds) {
                        try {
                            const client = await getMikrotikClient(connId);
                            const secrets = await client.write('/ppp/secret/print', [
                                '?name=' + trimmedUsername
                            ]);
                            if (secrets && secrets.length > 0) {
                                matchedSecret = secrets[0];
                                const connObj = connections.find(c => c.id === connId);
                                matchedOwnerId = connObj?.ownerId || null;
                                break;
                            }
                        } catch (err) {
                            // continue checking next router
                        }
                    }

                    if (matchedSecret) {
                        const { generateCustomerId } = await import('@/lib/customer-utils');
                        const defaultOwner = matchedOwnerId || (await db.user.findFirst({ where: { role: 'admin' } }))?.id || null;
                        const newCustomerId = await generateCustomerId(defaultOwner, db);
                        const defaultHash = await bcrypt.hash('buroq', 10);

                        customer = await db.customer.create({
                            data: {
                                customerId: newCustomerId,
                                username: matchedSecret.name,
                                name: '',
                                phone: '',
                                address: '',
                                comment: matchedSecret.comment || '',
                                password: defaultHash,
                                ownerId: defaultOwner
                            }
                        });
                    }
                } catch (mtErr) {
                    console.error('[Login] On-demand Mikrotik customer lookup error:', mtErr.message);
                }
            }

            if (customer) {
                let authenticated = false;
                let isUsingDefaultPassword = false;

                const isIdentityIncomplete =
                    !customer.name ||
                    customer.name === customer.username ||
                    !customer.phone ||
                    customer.phone === '-' ||
                    !customer.address ||
                    customer.address === '-' ||
                    (!customer.agentId && !customer.technicianId);

                // Check password
                if (password === 'buroq') {
                    // Password 'buroq' is ALWAYS valid jika:
                    // 1. Password di DB belum diset / kosong / null
                    // 2. Atau identitas belum lengkap (butuh aktivasi)
                    // 3. Atau password di DB memang diset ke 'buroq' (baik hash maupun plain)
                    // 4. Atau pelanggan belum pernah mengganti password mandiri
                    if (isIdentityIncomplete || !customer.password || customer.password.trim() === '') {
                        authenticated = true;
                        isUsingDefaultPassword = true;
                    } else if (customer.password.startsWith('$2a$') || customer.password.startsWith('$2b$')) {
                        const isMatch = await bcrypt.compare('buroq', customer.password);
                        if (isMatch) {
                            authenticated = true;
                            isUsingDefaultPassword = true;
                        } else if (isIdentityIncomplete) {
                            // Jika identitas belum lengkap, izinkan buroq meskipun hash beda
                            authenticated = true;
                            isUsingDefaultPassword = true;
                        }
                    } else if (customer.password === 'buroq' || isIdentityIncomplete) {
                        authenticated = true;
                        isUsingDefaultPassword = true;
                    }
                }

                // Jika belum authenticated dengan 'buroq', cocokkan dengan password yang diinputkan
                if (!authenticated && customer.password && customer.password.trim() !== '') {
                    if (customer.password.startsWith('$2a$') || customer.password.startsWith('$2b$')) {
                        authenticated = await bcrypt.compare(password, customer.password);
                    } else if (customer.password === password) {
                        authenticated = true;
                        const hashed = await bcrypt.hash(password, 10);
                        await db.customer.update({
                            where: { id: customer.id },
                            data: { password: hashed }
                        }).catch(err => console.error('[Login] Auto-hash customer password failed:', err.message));
                    }
                }

                // Fallback: jika password yang diinputkan adalah 'buroq', terima sebagai default password
                if (!authenticated && password === 'buroq') {
                    authenticated = true;
                    isUsingDefaultPassword = true;
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

                    if (isUsingDefaultPassword || isIdentityIncomplete) {
                        ipCache.delete(rateLimitKey);

                        // Fetch available staff (sales & technicians) for this tenant
                        // Also include the tenant owner/admin if no sub-staff exist or as fallback
                        const staffWhere = customer.ownerId
                            ? {
                                OR: [
                                    {
                                        ownerId: customer.ownerId,
                                        OR: [
                                            { isTechnician: true },
                                            { isAgent: true },
                                            { role: { in: ['staff', 'technician', 'agent', 'editor', 'manager'] } }
                                        ]
                                    },
                                    { id: customer.ownerId }
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
