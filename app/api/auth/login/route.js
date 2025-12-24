import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth';
import { signToken } from '@/lib/security';

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, password } = body;

        let user = await verifyPassword(username, password);

        // If local user not found, check if input is Customer ID
        if (!user) {
            const db = (await import('@/lib/db')).default;

            // Find Customer by customerId
            const customer = await db.customer.findUnique({
                where: { customerId: username }
            });

            if (customer) {
                // Determine password verification method
                // 1. Check if Customer has a local password (hashed)
                if (customer.password) {
                    const isValid = await import('bcryptjs').then(bcrypt => bcrypt.compare(password, customer.password));
                    if (isValid) {
                        // Construct simplified user object for token
                        user = {
                            id: customer.id,
                            username: customer.customerId, // Identity is CustomerID
                            role: 'customer', // Use 'customer' role
                            ownerId: customer.ownerId,
                            fullName: customer.name
                        };
                    }
                }

                // 2. Fallback: Check PPPoE credentials (if no local password or it failed?)
                // Usually if local password set, we only check that.
                // If not set, check PPPoE.
                if (!user && !customer.password) {
                    const { verifyPppoeCredentials } = await import('@/lib/mikrotik');
                    // Note: We need to verify against the SPECIFIC username and potentially scoped to owner?
                    // verifyPppoeCredentials currently just checks if username/password pair exists in ANY connected router.
                    // Since "username" is just the PPPoE username, and we have it in customer.username
                    const pppoeUser = await verifyPppoeCredentials(customer.username, password);

                    if (pppoeUser) {
                        // Basic match found
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
        }

        if (user) {
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
                secure: false, // Set to true if using HTTPS
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: '/',
            });

            return response;
        }

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
