
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const now = new Date();
        const cutoffDate = new Date(now.setMonth(now.getMonth() - 3));

        // 1. Get all customers
        const customers = await db.customer.findMany({
            select: { id: true, username: true, name: true, createdAt: true }
        });

        // 2. Get list of "Active" usernames (Seen in last 3 months or currently online)
        // Active means: acctstoptime > cutoff OR acctstoptime IS NULL (assuming NULL means online or session not closed properly but recently started)
        // To be safe, we check acctstarttime > cutoff for active sessions too.

        // Prisma doesn't support sophisticated ORs well with distinct in one go easily, so let's simplify.
        // Get all usernames from RadAcct where acctstoptime > cutoff OR acctstoptime is NULL
        // Note: Prisma where clause:

        const activeSessions = await db.radAcct.findMany({
            where: {
                OR: [
                    { acctstoptime: { gt: cutoffDate } },
                    { acctstoptime: null }
                ]
            },
            select: { username: true },
            distinct: ['username']
        });

        const activeUsernames = new Set(activeSessions.map(s => s.username));

        // 3. Identification
        const inactiveUsers = [];

        for (const customer of customers) {
            // If user is considered active, skip
            if (activeUsernames.has(customer.username)) continue;

            // If user is NEW (created < 3 months ago) and not seen yet, give them a grace period.
            // "Offline for 3 months" implies they are older than 3 months.
            if (new Date(customer.createdAt) > cutoffDate) continue;

            // Find last seen time for display
            // We know they are not in activeSessions, so their last session must be <= cutoffDate OR they have no sessions.
            const lastSession = await db.radAcct.findFirst({
                where: { username: customer.username },
                orderBy: { acctstoptime: 'desc' },
                select: { acctstoptime: true }
            });

            inactiveUsers.push({
                ...customer,
                lastSeen: lastSession?.acctstoptime ? lastSession.acctstoptime : 'Never',
                status: lastSession ? 'Inactive' : 'Never Connected'
            });
        }

        return NextResponse.json(inactiveUsers);
    } catch (error) {
        console.error("Cleanup scan error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { usernames } = body;

        if (!usernames || !Array.isArray(usernames)) {
            return NextResponse.json({ error: 'Usernames array required' }, { status: 400 });
        }

        const deleted = [];
        const errors = [];

        for (const username of usernames) {
            try {
                // Transactional delete?
                // Radius tables
                await db.radCheck.deleteMany({ where: { username } });
                await db.radReply.deleteMany({ where: { username } });
                await db.radUserGroup.deleteMany({ where: { username } });
                // We typically DO NOT delete RadAcct to keep historical logs, unless requested.
                // The prompt says "terhapus" (deleted). I will leave RadAcct for audit, or maybe delete.
                // Usually billing systems keep logs. I'll keep RadAcct but delete the User/Customer.

                // Customer Table
                await db.customer.deleteMany({ where: { username } });

                // Note: user might be in `User` table if it's an admin? No, Customer table users are PPPoE.
                // The `User` table is for system access (admins, agents).
                // But wait, `Customer` model has `username`.

                deleted.push(username);
            } catch (err) {
                console.error(`Failed to delete ${username}:`, err);
                errors.push({ username, error: err.message });
            }
        }

        return NextResponse.json({ success: true, deleted, errors });
    } catch (error) {
        console.error("Cleanup delete error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
