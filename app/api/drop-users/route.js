
import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { restoreUserConnection } from '@/lib/billing-actions';
import db from '@/lib/db';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

async function getUsersWithUnpaidInvoices(ownerId = null) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const ownerFilter = ownerId ? { ownerId } : {};

    const [customers, paidInvoices] = await Promise.all([
        db.customer.findMany({
            where: ownerFilter,
            select: { username: true, name: true }
        }),
        db.payment.findMany({
            where: {
                ...ownerFilter,
                month: currentMonth,
                year: currentYear,
                status: 'completed'
            },
            select: { username: true }
        })
    ]);

    const paidUsernames = new Set(paidInvoices.map(p => p.username));

    return customers
        .filter(c => !paidUsernames.has(c.username))
        .map(c => ({
            username: c.username,
            name: c.name
        }));
}

export async function GET(request) {
    try {
        const currentUser = await getUserFromRequest(request);
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
            return unauthorizedResponse();
        }

        const ownerId = currentUser.role === 'admin' ? currentUser.id : null;
        const { getConfig, getUserConnectionId } = await import('@/lib/config');
        const config = await getConfig();
        const connId = getUserConnectionId(currentUser, config);
        const client = await getMikrotikClient(connId);

        // 1. Get Unpaid Users from DB
        const unpaidUsersList = await getUsersWithUnpaidInvoices(ownerId);
        const unpaidUserMap = new Map(unpaidUsersList.map(u => [u.username, u]));

        // 2. Get All PPP Secrets from Mikrotik to check status
        // We need this to see who is ALREADY dropped vs who NEEDS drop
        const secrets = await client.write('/ppp/secret/print');

        const droppedUsers = [];
        const usersToDrop = [];

        for (const secret of secrets) {
            const isDropped = secret.profile === 'DROP';

            if (isDropped) {
                // If dropped, try to parse original profile from comment
                let originalProfile = 'Unknown';
                const match = secret.comment ? secret.comment.match(/OLD:([^\s]+)/) : null;
                if (match) {
                    originalProfile = match[1];
                }

                droppedUsers.push({
                    username: secret.name,
                    originalProfile: originalProfile,
                    comment: secret.comment,
                    id: secret['.id']
                });
            } else {
                // If NOT dropped, check if they are in the unpaid list
                const dbUser = unpaidUserMap.get(secret.name);
                if (dbUser) {
                    usersToDrop.push({
                        username: secret.name,
                        name: dbUser.name || secret.name,
                        currentProfile: secret.profile,
                        id: secret['.id']
                    });
                }
            }
        }

        return NextResponse.json({
            usersToDrop,
            droppedUsers
        });

    } catch (error) {
        console.error('Failed to fetch drop users:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const currentUser = await getUserFromRequest(request);
        if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'superadmin')) {
            return unauthorizedResponse();
        }

        const body = await request.json();
        const { action, users } = body;

        if (!users || !Array.isArray(users) || users.length === 0) {
            return NextResponse.json({ error: 'Users array required' }, { status: 400 });
        }

        const client = await getMikrotikClient();
        const results = [];
        const errors = [];

        for (const user of users) {
            try {
                if (action === 'drop') {
                    // DROP LOGIC
                    // 1. Construct new comment preserving existing comment if needed, or just overwrite
                    // Format: "AUTO-ISOLIR | OLD:{profile}"
                    // We should append if possible or just replace active status.
                    // Let's replace to be safe and consistent with previous logic.
                    await client.write('/ppp/secret/set', [
                        `=.id=${user.id}`,
                        '=profile=DROP'
                    ]);

                    // Remove active connections
                    const activeConnections = await client.write('/ppp/active/print', [
                        `?name=${user.username}`
                    ]);

                    for (const conn of activeConnections) {
                        await client.write('/ppp/active/remove', [
                            `=.id=${conn['.id']}`
                        ]);
                    }

                    results.push(user.username);

                } else if (action === 'restore') {
                    // RESTORE LOGIC using shared helper
                    const result = await restoreUserConnection(user.username);
                    if (result.success) {
                        results.push(user.username);
                    } else {
                        throw new Error(result.error || 'Failed to restore');
                    }
                }
            } catch (err) {
                console.error(`Error processing ${user.username}:`, err);
                errors.push({ username: user.username, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            results,
            errors
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


