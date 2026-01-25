import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';

import { getConfig, getUserConnectionId } from '@/lib/config';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode');
        const user = await getUserFromRequest(request);
        const config = await getConfig();

        // ------------------------------------------------------------------
        // MODE: ALL (Superadmin Aggregation)
        // ------------------------------------------------------------------
        if (mode === 'all') {
            if (!user || user.role !== 'superadmin') {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const connections = config.connections || [];
            let allUsers = [];

            // Fetch all unique owner IDs from connections
            const ownerIds = [...new Set(connections.map(c => c.ownerId).filter(id => id))];

            // Allow looking up owner details
            const owners = await db.user.findMany({
                where: { id: { in: ownerIds } },
                select: { id: true, username: true, fullName: true }
            });

            const ownerMap = {};
            owners.forEach(o => {
                ownerMap[o.id] = o.username || o.fullName || 'Unknown';
            });

            // Fetch Customers to map Customer IDs (Login ID)
            // Note: We don't have the list of usernames yet.
            // Querying ALL customers might be heavy if getting thousands?
            // But getting users first then querying might be cleaner.
            // Let's do it AFTER getting users.

            // Execute parallel fetches for performance, but handle failures gracefully
            const promises = connections.map(async (conn) => {
                try {
                    const client = await getMikrotikClient(conn.id);
                    const [routerUsers, activeConnections] = await Promise.all([
                        client.write('/ppp/secret/print'),
                        client.write('/ppp/active/print')
                    ]);

                    // Map active connections for quick lookup
                    const activeMap = {};
                    if (Array.isArray(activeConnections)) {
                        activeConnections.forEach(a => {
                            activeMap[a.name] = a;
                        });
                    }

                    // Augment user data with source router info
                    return routerUsers.map(u => ({
                        ...u,
                        _sourceRouterId: conn.id,
                        _sourceRouterName: conn.name || conn.host, // Use name or IP as label
                        _ownerId: conn.ownerId,
                        _ownerName: ownerMap[conn.ownerId] || conn.ownerId || '-', // Fallback to ID if name not found
                        // Ensure unique ID for frontend keying if needed (though Mikrotik ID is usually unique per router)
                        id: `${conn.id}_${u['.id']}`,
                        _rawUsername: u.name, // Keep raw for matching
                        _active: !!activeMap[u.name],
                        _activeData: activeMap[u.name] || null
                    }));
                } catch (err) {
                    console.error(`Failed to fetch users from router ${conn.name || conn.id}:`, err);
                    return []; // Return empty array on failure so one down router doesn't break the view
                }
            });

            const results = await Promise.all(promises);
            results.forEach(users => {
                allUsers = [...allUsers, ...users];
            });

            // Attach Customer IDs (Login ID)
            const usernames = [...new Set(allUsers.map(u => u.name))];
            if (usernames.length > 0) {
                const customers = await db.customer.findMany({
                    where: { username: { in: usernames } },
                    select: { username: true, customerId: true }
                });

                const customerMap = {};
                customers.forEach(c => {
                    customerMap[c.username] = c.customerId;
                });

                allUsers = allUsers.map(u => ({
                    ...u,
                    _customerId: customerMap[u.name] || '-'
                }));
            }

            // Attach Usage Data (Global)
            const { getAllMonthlyUsage } = await import('@/lib/usage-tracker');
            const allUsageData = await getAllMonthlyUsage();
            const currentMonth = new Date().toISOString().slice(0, 7);

            const usageMapLowerCase = {};
            Object.keys(allUsageData).forEach(key => {
                usageMapLowerCase[key.toLowerCase()] = allUsageData[key];
            });

            const usersWithUsage = allUsers.map(u => {
                const userData = allUsageData[u.name] || usageMapLowerCase[u.name.toLowerCase()];
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
        }

        // ------------------------------------------------------------------
        // MODE: STANDARD (Single Router / Scoped)
        // ------------------------------------------------------------------

        const connectionId = getUserConnectionId(user, config);

        // Fallback: If no connection ID for staff/user, try owner's connection
        let effectiveConnectionId = connectionId;
        if (!effectiveConnectionId && user?.ownerId) {
            const ownerConn = config.connections?.find(c => c.ownerId === user.ownerId);
            if (ownerConn) effectiveConnectionId = ownerConn.id;
        }

        // If no connection found for this user (and not superadmin), return empty
        if (!effectiveConnectionId && user?.role !== 'superadmin') {
            // We might want to handle this gracefully if querying DB only? 
            // But line 9 fetches from Mikrotik.
            // If connection missing, we can't fetch from Mikrotik.
            // But we still might return DB users if offline?
            // Current logic mixes Mikrotik + DB filter.
            // Let's return empty to be consistent with Profiles logic.
            // However, "Users" page usually shows DB users if offline?
            // Line 8 fetches Mikrotik. If failing, it errors catch block.
            return NextResponse.json([]);
        }

        const client = await getMikrotikClient(effectiveConnectionId);
        let users = await client.write('/ppp/secret/print');

        // Filter based on role
        // user already fetched above

        if (user) {
            // Determine if user owns the current connection
            const currentConnection = config.connections?.find(c => c.id === effectiveConnectionId);
            const isConnectionOwner = currentConnection?.ownerId === user.id;

            if (user.role === 'superadmin' || isConnectionOwner) {
                // Superadmin or Router Owner sees ALL users on the router
                // We still might want to mark them or something, but for now just return them all.
                // But wait, if we return all, we might show users that belong to OTHER tenants if looking at a shared router?
                // If isConnectionOwner, they own the router, so they own everyone on it.
                // No filter needed.

                // Optional: We could filtering to exclude system users or something? user.role === 'superadmin' usually sees all.
                // Admin who owns router sees all.
            } else {
                // Non-owner Admin/Staff: Apply strict filters
                try {
                    let allowedUsernames = new Set();
                    let filterWhere = {};

                    if (user.role === 'admin' || user.role === 'manager') {
                        // Admin and Manager see ALL users of the owner
                        filterWhere = { ownerId: user.id };
                        if (user.role === 'manager' && user.ownerId) {
                            filterWhere = { ownerId: user.ownerId };
                        }
                    } else if (['agent', 'partner', 'technician', 'staff', 'editor'].includes(user.role)) {
                        // Staff/Agent/Technician/Editor see ONLY assigned users
                        filterWhere = {
                            OR: [
                                { agentId: user.id },
                                { technicianId: user.id }
                            ]
                        };
                        // Ensure strict tenant scoping
                        if (user.ownerId) {
                            filterWhere = {
                                AND: [
                                    { ownerId: user.ownerId },
                                    filterWhere
                                ]
                            };
                        }
                    } else {
                        // Default fallback
                        filterWhere = { ownerId: 'impossible_id' };
                    }

                    // Fetch allowed usernames from DB
                    if (Object.keys(filterWhere).length > 0 || (filterWhere.AND && filterWhere.AND.length > 0)) {
                        const customers = await db.customer.findMany({
                            where: filterWhere,
                            select: { username: true }
                        });
                        customers.forEach(c => allowedUsernames.add(c.username));

                        // Apply filter to Mikrotik result
                        users = users.filter(u => allowedUsernames.has(u.name));
                    } else {
                        users = [];
                    }
                } catch (e) {
                    console.error('Error filtering users:', e);
                    users = [];
                }
            }
        }

        // Attach Customer IDs (Standard Mode)
        const usernames = [...new Set(users.map(u => u.name))];
        if (usernames.length > 0) {
            const customers = await db.customer.findMany({
                where: { username: { in: usernames } },
                select: { username: true, customerId: true }
            });

            const customerMap = {};
            customers.forEach(c => {
                customerMap[c.username] = c.customerId;
            });

            users = users.map(u => ({
                ...u,
                _customerId: customerMap[u.name] || '-'
            }));
        }

        // Attach monthly usage data
        const { getAllMonthlyUsage } = await import('@/lib/usage-tracker');
        const allUsageData = await getAllMonthlyUsage();
        const currentMonth = new Date().toISOString().slice(0, 7);

        // Create a lowercase map for fallback
        const usageMapLowerCase = {};
        Object.keys(allUsageData).forEach(key => {
            usageMapLowerCase[key.toLowerCase()] = allUsageData[key];
        });

        const usersWithUsage = users.map(u => {
            // Try exact match first, then case-insensitive
            const userData = allUsageData[u.name] || usageMapLowerCase[u.name.toLowerCase()];
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
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

        // If staff, partner, or agent, save as pending registration in DB
        // 'staff' role specifically requested to have approval.
        // 'agent' and 'partner' usually imply self-service which might also need approval?
        // Original code had 'partner'. We'll include 'staff'.
        if (userRole === 'partner' || userRole === 'staff' || userRole === 'agent') {
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
                    routerIds: JSON.stringify(routerIds),
                    ownerId: user.ownerId // Assign to owner
                }
            });

            return NextResponse.json({
                success: true,
                message: "Registration submitted for approval. Please wait for admin confirmation."
            });
        }

        // If admin/technician, proceed with Mikrotik creation
        // If admin/technician, proceed with Mikrotik creation

        // Smart Fallback for Router Selection
        let targetRouterIds = [];
        if (routerIds && Array.isArray(routerIds) && routerIds.length > 0) {
            targetRouterIds = routerIds;
        } else {
            // No router specified, try to find a default
            const config = await getConfig();

            if (userRole === 'superadmin') {
                // For superadmin, default to Active Connection, or First Connection
                if (config.activeConnectionId) {
                    targetRouterIds = [config.activeConnectionId];
                } else if (config.connections?.length > 0) {
                    targetRouterIds = [config.connections[0].id];
                }
            } else if (user.ownerId) {
                // For tenants, find their router
                const ownerConn = config.connections?.find(c => c.ownerId === user.ownerId);
                if (ownerConn) {
                    targetRouterIds = [ownerConn.id];
                }
            } else {
                // For tenants who are their own owners (e.g. admin role where id=ownerId conceptually but maybe stored differently)
                // If the user IS the owner (e.g. unrelated admin), try to find connection by their ID?
                // Usually config.connections has ownerId.
                const myConn = config.connections?.find(c => c.ownerId === user.id);
                if (myConn) {
                    targetRouterIds = [myConn.id];
                }
            }
        }

        // If still no router, fallback to [null] which might fail but maintains old behavior or try one last ditch
        if (targetRouterIds.length === 0) targetRouterIds = [null];

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


