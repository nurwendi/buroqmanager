
import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getUsersWithUnpaidInvoices() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const customers = await db.customer.findMany({
        select: { username: true, name: true } // Fetch name too for UI
    });

    const paidInvoices = await db.payment.findMany({
        where: {
            month: currentMonth,
            year: currentYear,
            status: 'completed'
        },
        select: { username: true }
    });

    const paidUsernames = new Set(paidInvoices.map(p => p.username));

    return customers
        .filter(c => !paidUsernames.has(c.username))
        .map(c => ({
            username: c.username,
            name: c.name
        }));
}

export async function GET() {
    try {
        const client = await getMikrotikClient();

        // 1. Get Unpaid Users from DB
        const unpaidUsersList = await getUsersWithUnpaidInvoices();
        const unpaidUsernames = new Set(unpaidUsersList.map(u => u.username));

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
                if (unpaidUsernames.has(secret.name)) {
                    // Match with DB name
                    const dbUser = unpaidUsersList.find(u => u.username === secret.name);
                    usersToDrop.push({
                        username: secret.name,
                        name: dbUser ? dbUser.name : secret.name,
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
        const body = await request.json();
        const { action, users } = body; // users is array of { username, id, currentProfile (for drop) }

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
                    const newComment = `AUTO-ISOLIR | OLD:${user.currentProfile}`;

                    await client.write('/ppp/secret/set', [
                        `=.id=${user.id}`,
                        '=profile=DROP',
                        `=comment=${newComment}`
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
                    // RESTORE LOGIC
                    // 1. We need to get the secret again to be sure of the comment/profile
                    const secrets = await client.write('/ppp/secret/print', [
                        `?name=${user.username}`
                    ]);

                    if (secrets.length === 0) throw new Error('User not found in Mikrotik');
                    const secret = secrets[0];

                    // Parse profile
                    let profileToRestore = 'default'; // Fallback
                    if (secret.comment) {
                        const match = secret.comment.match(/OLD:([^\s]+)/);
                        if (match) {
                            profileToRestore = match[1];
                        }
                    }

                    // Remove the AUTO-ISOLIR tag from comment
                    // We'll set it to empty or just remove our tag? 
                    // Let's just clear it or set it to "RESTORED" to avoid confusion? 
                    // Usually cleaning it is best.
                    const newComment = secret.comment.replace(/AUTO-ISOLIR \| OLD:[^\s]+/, '').trim();

                    await client.write('/ppp/secret/set', [
                        `=.id=${secret['.id']}`,
                        `=profile=${profileToRestore}`,
                        `=comment=${newComment}`
                    ]);

                    // Remove active connections to apply new profile
                    const activeConnections = await client.write('/ppp/active/print', [
                        `?name=${user.username}`
                    ]);

                    for (const conn of activeConnections) {
                        await client.write('/ppp/active/remove', [
                            `=.id=${conn['.id']}`
                        ]);
                    }

                    results.push(user.username);
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
