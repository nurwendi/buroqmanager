import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';

import { getConfig, getUserConnectionId } from '@/lib/config';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode'); // We can keep mode for backwards compatibility, but we'll default to all allowed
        const user = await getUserFromRequest(request);
        const config = await getConfig();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let connections = config.connections || [];

        // 1. Determine which connections this user is allowed to query
        if (user.role !== 'superadmin') {
            const ownerId = user.role === 'admin' ? user.id : user.ownerId;
            if (ownerId) {
                connections = connections.filter(c => c.ownerId === ownerId);
            } else {
                connections = [];
            }
        }

        // If a specific connection is requested (e.g., standard mode but they actually only want one),
        // we could filter it here. But usually mode=all means all, and standard meant active.
        // To fix the bug where new routers don't show customers, we will fetch from ALL allowed connections.
        
        let allUsers = [];

        // Fetch all unique owner IDs from connections for labeling
        const ownerIds = [...new Set(connections.map(c => c.ownerId).filter(id => id))];
        const owners = await db.user.findMany({
            where: { id: { in: ownerIds } },
            select: { id: true, username: true, fullName: true }
        });

        const ownerMap = {};
        owners.forEach(o => {
            ownerMap[o.id] = o.username || o.fullName || 'Unknown';
        });

        // 2. Fetch from all allowed connections in parallel
        const promises = connections.map(async (conn) => {
            try {
                const client = await getMikrotikClient(conn.id);
                const [routerUsers, activeConnections] = await Promise.all([
                    client.write('/ppp/secret/print'),
                    client.write('/ppp/active/print')
                ]);

                const activeMap = {};
                if (Array.isArray(activeConnections)) {
                    activeConnections.forEach(a => {
                        activeMap[a.name] = a;
                    });
                }

                return routerUsers.map(u => ({
                    ...u,
                    _sourceRouterId: conn.id,
                    _sourceRouterName: conn.name || conn.host,
                    _ownerId: conn.ownerId,
                    _ownerName: ownerMap[conn.ownerId] || conn.ownerId || '-',
                    id: `${conn.id}_${u['.id']}`,
                    _rawUsername: u.name,
                    _active: !!activeMap[u.name],
                    _activeData: activeMap[u.name] || null
                }));
            } catch (err) {
                console.error(`Failed to fetch users from router ${conn.name || conn.id}:`, err);
                return [{
                    '.id': `error_${conn.id}`,
                    name: `⚠️ GAGAL KONEKSI: ${conn.name || conn.host}`,
                    service: 'any',
                    profile: 'error',
                    comment: err.message || 'Router Offline / API Error',
                    disabled: "true",
                    _sourceRouterId: conn.id,
                    _sourceRouterName: conn.name || conn.host,
                    _ownerId: conn.ownerId,
                    _ownerName: ownerMap[conn.ownerId] || conn.ownerId || '-',
                    id: `${conn.id}_error`,
                    _rawUsername: `⚠️ GAGAL KONEKSI: ${conn.name || conn.host}`,
                    _active: false,
                    _activeData: null,
                    _isError: true
                }];
            }
        });

        const results = await Promise.all(promises);
        results.forEach(users => {
            allUsers = [...allUsers, ...users];
        });

        // 3. Apply strict role-based filtering (for staff, agents, etc.)
        if (user.role !== 'superadmin' && user.role !== 'admin' && user.role !== 'manager') {
            try {
                let allowedUsernames = new Set();
                let filterWhere = {
                    OR: [
                        { agentId: user.id },
                        { technicianId: user.id }
                    ]
                };
                if (user.ownerId) {
                    filterWhere = {
                        AND: [
                            { ownerId: user.ownerId },
                            filterWhere
                        ]
                    };
                }

                if (Object.keys(filterWhere).length > 0 || (filterWhere.AND && filterWhere.AND.length > 0)) {
                    const customers = await db.customer.findMany({
                        where: filterWhere,
                        select: { username: true }
                    });
                    customers.forEach(c => allowedUsernames.add(c.username));
                    allUsers = allUsers.filter(u => allowedUsernames.has(u.name) || u._isError);
                } else {
                    allUsers = [];
                }
            } catch (e) {
                console.error('Error filtering users:', e);
                allUsers = [];
            }
        }

        // 4. Attach Usage Data
        const { getAllMonthlyUsage } = await import('@/lib/usage-tracker');
        const allUsageData = await getAllMonthlyUsage();
        const currentMonth = new Date().toISOString().slice(0, 7);

        const usageMapLowerCase = {};
        Object.keys(allUsageData).forEach(key => {
            usageMapLowerCase[key.toLowerCase()] = allUsageData[key];
        });

        const usersWithUsage = allUsers.map(u => {
            const userData = allUsageData[u.name] || usageMapLowerCase[(u.name || '').toLowerCase()];
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
        const { name, password, profile, service = "pppoe", routerIds, comment, coordinates, technicianId, agentId } = body;

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
                    agentId: agentId || userId,
                    password: password,
                    profile: profile,
                    service: service,
                    comment: comment,
                    coordinates: coordinates,
                    technicianId: technicianId,
                    routerIds: JSON.stringify(routerIds),
                    ownerId: user.ownerId // Assign to owner
                }
            });

            // Send Notification to Admin/Owner
            try {
                const { sendNotification } = await import('@/lib/notifications-db');
                const ownerId = user.role === 'admin' ? user.id : user.ownerId;
                await sendNotification({
                    title: 'Pendaftaran Baru',
                    message: `Pelanggan ${body.customerName || finalUsername} telah didaftarkan oleh ${user.fullName || user.username} dan memerlukan verifikasi.`,
                    type: 'alert',
                    ownerId: ownerId,
                    recipients: [{ userId: ownerId }] // Notify the Admin
                });
            } catch (notifError) {
                console.error('Failed to send registration notification:', notifError);
            }

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


