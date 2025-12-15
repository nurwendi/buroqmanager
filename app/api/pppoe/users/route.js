import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';

export async function GET(request) {
    try {
        const client = await getMikrotikClient();
        let users = await client.write('/ppp/secret/print');

        // Filter based on role
        const user = await getUserFromRequest(request);
        if (user && user.role !== 'admin') {
            try {
                // If role is agent, technician, or partner - filter the list
                if (user.role === 'agent' || user.role === 'technician' || user.role === 'partner') {
                    // Load allowed customers from DB
                    let allowedUsernames = new Set();

                    if (user.role === 'agent' || user.role === 'partner') {
                        const customers = await db.customer.findMany({
                            where: { agentId: user.id },
                            select: { username: true }
                        });
                        customers.forEach(c => allowedUsernames.add(c.username));
                    }

                    if (user.role === 'technician') {
                        const customers = await db.customer.findMany({
                            where: { technicianId: user.id },
                            select: { username: true }
                        });
                        customers.forEach(c => allowedUsernames.add(c.username));
                    }

                    users = users.filter(u => allowedUsernames.has(u.name));
                }
            } catch (e) {
                console.error('Error filtering users:', e);
            }
        }

        // Attach monthly usage data
        const { getAllMonthlyUsage } = await import('@/lib/usage-tracker');
        const allUsageData = await getAllMonthlyUsage();
        const currentMonth = new Date().toISOString().slice(0, 7);

        const usersWithUsage = users.map(u => {
            const userData = allUsageData[u.name];
            let usage = { rx: 0, tx: 0 };

            if (userData && userData.month === currentMonth) {
                usage = {
                    rx: userData.accumulated_rx + userData.last_session_rx,
                    tx: userData.accumulated_tx + userData.last_session_tx
                };
            }
            return { ...u, usage };
        });

        return NextResponse.json(usersWithUsage);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


export async function POST(request) {
    try {
        const body = await request.json();
        const { name, password, profile, service = "pppoe", routerIds, comment } = body;

        if (!name || !password) {
            return NextResponse.json({ error: "Name and password are required" }, { status: 400 });
        }

        // Check user role
        const user = await getUserFromRequest(request);
        let userRole = 'admin';
        let userId = '';
        let prefix = '';

        if (user) {
            userRole = user.role;
            userId = user.id;
            prefix = user.prefix || '';
        }

        // Apply prefix if user is partner and prefix exists
        let finalUsername = name;
        if (userRole === 'partner' && prefix) {
            finalUsername = `${prefix}${name}`;
        }

        // If partner, save as pending registration in DB
        if (userRole === 'partner') {
            const existingReg = await db.registration.findFirst({
                where: {
                    username: finalUsername,
                    status: 'pending'
                }
            });

            if (existingReg) {
                return NextResponse.json({ error: "User already exists or is pending" }, { status: 400 });
            }

            // Auto-generate customer number logic is complex in DB without sequence.
            // Simplified: don't generate here, let approve process handle it or generate generic.
            // Actually, we don't need customer number for pending registration record itself usually.

            await db.registration.create({
                data: {
                    type: 'register',
                    status: 'pending',
                    username: finalUsername,
                    name: body.customerName,
                    address: body.customerAddress,
                    phone: body.customerPhone,
                    agentId: userId,
                    password: password,
                    profile: profile,
                    service: service,
                    comment: comment,
                    routerIds: JSON.stringify(routerIds)
                }
            });

            return NextResponse.json({
                success: true,
                message: "Registration submitted for approval. Please wait for admin confirmation."
            });
        }

        // If admin/technician, proceed with Mikrotik creation
        const targetRouterIds = (routerIds && Array.isArray(routerIds) && routerIds.length > 0)
            ? routerIds
            : [null];

        const results = [];
        const errors = [];

        for (const routerId of targetRouterIds) {
            try {
                const client = await getMikrotikClient(routerId);
                const command = [
                    `=name=${name}`,
                    `=password=${password}`,
                ];

                if (profile) command.push(`=profile=${profile}`);
                if (service && service !== 'any') command.push(`=service=${service}`);
                if (comment) command.push(`=comment=${comment}`);

                try {
                    await client.write('/ppp/secret/add', command);
                    results.push({ routerId, success: true });
                } catch (addError) {
                    if (addError.errno === 'UNKNOWNREPLY' || addError.message?.includes('!empty')) {
                        results.push({ routerId, success: true });
                    } else {
                        throw addError;
                    }
                }
            } catch (err) {
                console.error(`Failed to add user to router ${routerId}:`, err);
                errors.push({ routerId, error: err.message });
            }
        }

        if (errors.length > 0 && results.length === 0) {
            return NextResponse.json({ error: "Failed to add user to any router", details: errors }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            results,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
