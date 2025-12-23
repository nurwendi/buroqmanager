
import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/config';
import { getMikrotikClient } from '@/lib/mikrotik';
import { syncUsersFromRouter } from '@/lib/sync-users';
import { getUserFromRequest } from '@/lib/api-auth'; // Ensure this exists

export async function GET(request) {
    const user = await getUserFromRequest(request);
    const config = await getConfig();

    // Mask passwords
    let safeConnections = config.connections.map(conn => ({
        ...conn,
        password: conn.password ? '******' : ''
    }));

    // Filter for Admin/Staff
    if (user && user.role !== 'superadmin') {
        const ownerId = user.role === 'admin' ? user.id : user.ownerId;
        if (ownerId) {
            safeConnections = safeConnections.filter(c => c.ownerId === ownerId);
        } else {
            // If no ownerId (e.g. legacy staff), maybe show empty or global?
            // "Data Baru" implies empty if strict.
            safeConnections = [];
        }
    }

    const emailConfig = config.email ? { ...config.email, password: config.email.password ? '******' : '' } : {};

    return NextResponse.json({
        connections: safeConnections,
        activeConnectionId: config.activeConnectionId,
        title: config.title || 'Mikrotik PPPoE Manager',
        wanInterface: config.wanInterface || '',
        email: emailConfig
    });
}

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { connections, activeConnectionId, title, wanInterface, email } = body;

        // Validation
        if (connections && Array.isArray(connections)) {
            for (const conn of connections) {
                if (!conn.host || !conn.user || !conn.port) {
                    return NextResponse.json({ error: "Host, User, and Port are required" }, { status: 400 });
                }
            }
        }

        // Fetch existing config to merge
        const existingConfig = await getConfig();
        let newConnections = [];

        if (user.role === 'superadmin') {
            // Superadmin can overwrite everything
            newConnections = connections.map(c => {
                // Preserve password if "******"
                if (c.password === '******') {
                    const old = existingConfig.connections.find(old => old.id === c.id);
                    if (old) c.password = old.password;
                }
                // Preserve ownerId if existing, or set to null/superadmin?
                // If superadmin creates, ownerId is null (System Global) or implicit?
                // Let's keep existing ownerId if match, or allow superadmin to assign?
                // For now, preserve existing ownerId.
                const old = existingConfig.connections.find(old => old.id === c.id);
                if (old && old.ownerId) c.ownerId = old.ownerId;
                return c;
            });
        } else if (user.role === 'admin') {
            // Admin: Only modify THEIR connections
            // 1. Keep connections from OTHERS
            const othersConnections = existingConfig.connections.filter(c => c.ownerId !== user.id);

            // 2. Process Admin's submitted connections
            const myNewConnections = connections.map((c) => {
                // Force Owner ID
                c.ownerId = user.id;

                // Handle Masked Password
                if (c.password === '******') {
                    const old = existingConfig.connections.find(old => old.id === c.id);
                    if (old) c.password = old.password;
                }
                return c;
            });

            newConnections = [...othersConnections, ...myNewConnections];
        } else {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        // Prepare new config
        // Only update globals (title, etc) if Superadmin?
        // Admin likely shouldn't change App Title.

        let newConfig = {
            ...existingConfig,
            connections: newConnections,
        };

        if (user.role === 'superadmin') {
            newConfig.title = title || newConfig.title;
            newConfig.wanInterface = wanInterface || newConfig.wanInterface;
            newConfig.activeConnectionId = activeConnectionId; // Global active

            // Email also global
            if (email) {
                if (email.password === '******') {
                    email.password = existingConfig.email?.password || '';
                }
                newConfig.email = email;
            }
        } else {
            // Admin can't change global title/email/activeConnectionId (Global)
            // But wait, what if Admin wants to set "My Active Connection"?
            // We don't have "My Active Connection" field in DB yet.
            // But they can switch 'activeConnectionId' in UI, but that switches GLOBAL.
            // We should ignore activeConnectionId change from Admin for now to prevent hijacking.
            // Admin just manages their list.
        }

        const saved = await saveConfig(newConfig);

        if (!saved) {
            return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
        }

        // Auto-Sync if we just added/updated
        // But we need to sync only if Admin did it?
        // syncUsersFromRouter typically uses global active connection which might NOT be this admin's.
        // We need to sync specifically from the router they just edited/added?
        // Simplest: Try to sync from the first connection owned by user?

        let syncResult = null;
        if (user.role === 'admin' && connections.length > 0) {
            // Try to sync from their first router
            // We need a way to tell syncUsersFromRouter WHICH connection ID to use.
            // syncUsersFromRouter(targetOwnerId, connectionId)
            // I need to update syncUsersFromRouter signature.
            const myFirstRouter = newConnections.find(c => c.ownerId === user.id);
            if (myFirstRouter) {
                try {
                    syncResult = await syncUsersFromRouter(user.id, myFirstRouter.id);
                } catch (e) {
                    console.log("Auto-sync failed for admin", e);
                }
            }
        } else if (user.role === 'superadmin') {
            // Standard sync from global active
            try {
                syncResult = await syncUsersFromRouter(user.id, activeConnectionId);
            } catch (e) { }
        }

        return NextResponse.json({
            success: true,
            message: syncResult?.imported ? `Saved and synced ${syncResult.imported} users` : "Settings saved"
        });

    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

