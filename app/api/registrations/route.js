import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/api-auth';
import { generateCustomerId } from '@/lib/customer-utils';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        let where = { status: 'pending' };

        // Filter by Owner
        if (user.role !== 'superadmin') {
            const ownerId = user.role === 'admin' ? user.id : user.ownerId;
            if (ownerId) where.ownerId = ownerId;
            else if (user.role !== 'admin') where.ownerId = 'nothing';

            // Restrict Staff/Agent to only their own registrations
            // Editor is EXEMPT from this (can see all pending to approve)
            if (['staff', 'agent', 'technician'].includes(user.role)) {
                where.agentId = user.id;
            }
        }

        const pending = await db.registration.findMany({
            where: where
        });

        return NextResponse.json(pending);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, action, updatedData, type, targetUsername, newValues, agentId } = body;

        // Auth check
        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // --- SUBMIT REQUEST (Register, Edit, Delete) ---
        if (type) {
            if (type === 'register') {
                // Check if user exists in User/Customer tables or pending registration
                // Note: 'username' in body is the requested new username

                const existingUser = await db.user.findUnique({ where: { username } });
                if (existingUser) {
                    return NextResponse.json({ error: "Username already exists" }, { status: 400 });
                }

                const existingReg = await db.registration.findFirst({
                    where: { username: username, status: 'pending' }
                });
                if (existingReg) {
                    return NextResponse.json({ error: "Registration for this username is already pending" }, { status: 400 });
                }

                // Infer Owner from Agent
                let ownerId = null;
                if (agentId) {
                    const agent = await db.user.findUnique({ where: { id: agentId } });
                    if (agent) {
                        ownerId = agent.role === 'admin' ? agent.id : agent.ownerId;
                    }
                }

                await db.registration.create({
                    data: {
                        type: 'register',
                        status: 'pending',
                        username: username, // Requested username
                        name: body.name,
                        address: body.address,
                        phone: body.phone,
                        agentId: agentId,
                        ownerId: ownerId, // Save Owner
                        password: body.password,
                        profile: body.profile,
                        service: body.service,
                        comment: body.comment,
                        coordinates: body.coordinates,
                        technicianId: body.technicianId,
                        routerIds: body.routerIds ? JSON.stringify(body.routerIds) : null
                    }
                });

                // Send Notification to Admin/Owner
                try {
                    const { sendNotification } = await import('@/lib/notifications-db');
                    await sendNotification({
                        title: 'Pendaftaran Baru',
                        message: `Pelanggan ${body.name || username} telah didaftarkan oleh ${user.fullName || user.username} dan memerlukan verifikasi.`,
                        type: 'alert',
                        ownerId: ownerId,
                        recipients: [{ userId: ownerId }] // Notify the Admin
                    });
                } catch (notifError) {
                    console.error('Failed to send registration notification:', notifError);
                }

                return NextResponse.json({ success: true, message: "Registration submitted for approval" });

            } else if (type === 'edit' || type === 'delete') {
                if (!targetUsername) {
                    return NextResponse.json({ error: "Target username is required" }, { status: 400 });
                }

                // Resolve Owner ID
                let ownerId = null;
                if (agentId) {
                    const agent = await db.user.findUnique({ where: { id: agentId } });
                    if (agent) {
                        ownerId = agent.role === 'admin' ? agent.id : agent.ownerId;
                    }
                }

                await db.registration.create({
                    data: {
                        type: type,
                        status: 'pending',
                        username: `req_${Date.now()}_${targetUsername}`, // Unique ID for this request
                        targetUsername: targetUsername,
                        agentId: agentId,
                        ownerId: ownerId, // Save Owner
                        newValues: newValues ? JSON.stringify(newValues) : null,
                        name: body.name || targetUsername // For display
                    }
                });

                // Send Notification to Admin/Owner
                try {
                    const { sendNotification } = await import('@/lib/notifications-db');
                    await sendNotification({
                        title: type === 'edit' ? 'Permintaan Edit' : 'Permintaan Hapus',
                        message: `Permintaan ${type === 'edit' ? 'perubahan data' : 'penghapusan'} untuk pelanggan ${body.name || targetUsername} telah diajukan oleh ${user.fullName || user.username} dan memerlukan verifikasi.`,
                        type: 'alert',
                        ownerId: ownerId,
                        recipients: [{ userId: ownerId }] // Notify the Admin
                    });
                } catch (notifError) {
                    console.error(`Failed to send ${type} notification:`, notifError);
                }

                return NextResponse.json({ success: true, message: `${type === 'edit' ? 'Edit' : 'Delete'} request submitted for approval` });
            }
        }

        // --- APPROVE / REJECT ---
        // 'username' here matches the 'username' field in Registration model (which is the Key)
        if (!username || !action) {
            return NextResponse.json({ error: "Request ID (username) and action are required" }, { status: 400 });
        }

        const registration = await db.registration.findFirst({
            where: { username: username, status: 'pending' }
        });

        if (!registration) {
            return NextResponse.json({ error: "Request not found or not pending" }, { status: 404 });
        }

        if (action === 'reject') {
            await db.registration.update({
                where: { id: registration.id },
                data: { status: 'rejected' }
            });
            // Delete to keep clean
            await db.registration.delete({ where: { id: registration.id } });

            // Notify Agent
            try {
                const { sendNotification } = await import('@/lib/notifications-db');
                await sendNotification({
                    title: 'Pendaftaran Ditolak',
                    message: `Permintaan ${registration.type} untuk ${registration.name || registration.username} telah ditolak.`,
                    type: 'error',
                    ownerId: registration.ownerId,
                    recipients: [{ userId: registration.agentId }]
                });
            } catch (notifError) {
                console.error('Failed to send rejection notification:', notifError);
            }

            return NextResponse.json({ success: true, message: "Request rejected" });
        }

        if (action === 'approve') {
            const requestType = registration.type;

            if (requestType === 'register') {
                const finalData = {
                    name: registration.name,
                    address: registration.address,
                    phone: registration.phone,
                    agentId: registration.agentId,
                    username: registration.username,
                    password: registration.password,
                    profile: registration.profile,
                    service: registration.service,
                    comment: registration.comment,
                    coordinates: registration.coordinates,
                    technicianId: registration.technicianId,
                    routerIds: registration.routerIds ? JSON.parse(registration.routerIds) : []
                };

                // Merge with overrides from Admin if any
                if (updatedData) {
                    // Preserve routerIds from registration unless admin explicitly changed them
                    const savedRouterIds = finalData.routerIds;
                    Object.assign(finalData, updatedData);
                    // Restore routerIds if updatedData didn't supply a valid one
                    if (!updatedData.routerIds || (Array.isArray(updatedData.routerIds) && updatedData.routerIds.length === 0)) {
                        finalData.routerIds = savedRouterIds;
                    }
                    // If username changed in Admin update
                    if (updatedData.username && updatedData.username !== registration.username) {
                        // Check collision
                        const exists = await db.user.findUnique({ where: { username: updatedData.username } });
                        if (exists) return NextResponse.json({ error: "New username already exists" }, { status: 400 });
                        finalData.username = updatedData.username;
                    }
                }

                // Create User + Customer Transactionally
                if (!finalData.password) {
                    return NextResponse.json({ error: "Password is required" }, { status: 400 });
                }
                const passwordHash = require('bcryptjs').hashSync(finalData.password, 10);

                let newCustomer;
                try {
                    newCustomer = await db.$transaction(async (tx) => {
                        const generatedId = await generateCustomerId(registration.ownerId, tx);
                        const c = await tx.customer.create({
                            data: {
                                username: finalData.username,
                                customerId: generatedId,
                                password: passwordHash, // Save hashed password to Customer table
                                name: finalData.name || '',
                                phone: finalData.phone || '',
                                address: finalData.address || '',
                                agentId: finalData.agentId,
                                technicianId: finalData.technicianId,
                                coordinates: finalData.coordinates,
                                comment: finalData.comment,
                                ownerId: registration.ownerId
                            }
                        });
                        return c;
                    });
                } catch (dbError) {
                    console.error('[RegApprove] DB Transaction Failed:', dbError);
                    return NextResponse.json({ error: "Database creation failed: " + dbError.message }, { status: 500 });
                }

                // Create in Mikrotik
                let targetRouterIds = (finalData.routerIds && Array.isArray(finalData.routerIds) && finalData.routerIds.length > 0) ? finalData.routerIds : [];

                // If no specific router selected, try to find the Owner's default connection
                if (targetRouterIds.length === 0) {
                    console.log('[RegApprove] No router selected. Attempting to resolve default for Owner:', registration.ownerId);
                    try {
                        // Import config helpers
                        const configModule = await import('@/lib/config');
                        const getConfig = configModule.getConfig;
                        const getUserConnectionId = configModule.getUserConnectionId;

                        const config = await getConfig();
                        console.log('[RegApprove] Config loaded. Connections:', config.connections?.length);

                        // resolve owner connection
                        const mockUserForConfig = { role: 'agent', ownerId: registration.ownerId };
                        const defaultConnId = getUserConnectionId(mockUserForConfig, config);

                        console.log(`[RegApprove] Resolved Connection ID: ${defaultConnId}`);

                        if (defaultConnId) {
                            targetRouterIds.push(defaultConnId);
                        } else {
                            console.warn('[RegApprove] Could not resolve default router. Using fallback NULL.');
                            targetRouterIds.push(null);
                        }
                    } catch (e) {
                        console.error('[RegApprove] Failed to resolve default router connection:', e);
                        targetRouterIds.push(null);
                    }
                } else {
                    console.log('[RegApprove] Using selected routers:', targetRouterIds);
                }

                const errors = [];
                let successCount = 0;

                for (const routerId of targetRouterIds) {
                    try {
                        const client = await getMikrotikClient(routerId);
                        const command = [
                            `=name=${finalData.username}`,
                            `=password=${finalData.password}`,
                            `=profile=${finalData.profile || ''}`,
                            `=service=${finalData.service || 'pppoe'}`,
                        ];
                        if (finalData.comment) command.push(`=comment=${finalData.comment}`);
                        await client.write('/ppp/secret/add', command);
                        successCount++;
                    } catch (err) {
                        console.error(`Failed to add user to router ${routerId}:`, err);
                        errors.push({ routerId, error: err.message });
                    }
                }

                if (successCount === 0 && targetRouterIds.length > 0) {
                    // No longer rolling back User since it's not created
                    try {
                        await db.customer.delete({ where: { id: newCustomer.id } });
                    } catch (e) { console.error('Rollback customer failed', e); }

                    const errorDetails = errors.map(e => `${e.routerId}: ${e.error}`).join(', ');
                    return NextResponse.json({
                        error: `Failed to create user in any router. Details: ${errorDetails}`,
                        details: errors
                    }, { status: 500 });
                }

                await db.registration.update({ where: { id: registration.id }, data: { status: 'approved' } });
                await db.registration.delete({ where: { id: registration.id } });

                // Notify Agent & Customer
                try {
                    const { sendNotification } = await import('@/lib/notifications-db');
                    // Notify Agent
                    await sendNotification({
                        title: 'Pendaftaran Disetujui',
                        message: `Pendaftaran untuk ${finalData.name} telah disetujui. Akun ${finalData.username} telah aktif.`,
                        type: 'success',
                        ownerId: registration.ownerId,
                        recipients: [{ userId: registration.agentId }]
                    });
                    // Notify Customer (New account)
                    await sendNotification({
                        title: 'Selamat Datang!',
                        message: `Pendaftaran Anda telah disetujui. Gunakan ID Pelanggan ${finalData.username} untuk masuk ke aplikasi.`,
                        type: 'success',
                        ownerId: registration.ownerId,
                        recipients: [{ customerId: newCustomer.id }]
                    });
                } catch (notifError) {
                    console.error('Failed to send approval notification:', notifError);
                }

                return NextResponse.json({ success: true, message: "Registration approved and user created" });

            } else if (requestType === 'edit') {
                const targetUsername = registration.targetUsername;
                let newValues = registration.newValues ? JSON.parse(registration.newValues) : {};

                if (updatedData) {
                    newValues = { ...newValues, ...updatedData };
                }

                // Resolve Connection
                let connectionId = null;
                try {
                    const { getConfig, getUserConnectionId } = await import('@/lib/config');
                    const config = await getConfig();
                    const mockUser = { role: 'agent', ownerId: registration.ownerId };
                    connectionId = getUserConnectionId(mockUser, config);
                } catch (e) {
                    console.error('Failed to resolve connection for edit:', e);
                }

                // Update Mikrotik
                try {
                    const client = await getMikrotikClient(connectionId);
                    const users = await client.write('/ppp/secret/print', [`?name=${targetUsername}`]);
                    if (users.length === 0) throw new Error(`User ${targetUsername} not found in Mikrotik`);
                    const userId = users[0]['.id'];

                    const updateParams = [`=.id=${userId}`];
                    if (newValues.username && newValues.username !== targetUsername) updateParams.push(`=name=${newValues.username}`);
                    if (newValues.password) updateParams.push(`=password=${newValues.password}`);
                    if (newValues.profile) updateParams.push(`=profile=${newValues.profile}`);
                    if (newValues.service) updateParams.push(`=service=${newValues.service}`);

                    await client.write('/ppp/secret/set', updateParams);

                    // Disconnect
                    const activeConnections = await client.write('/ppp/active/print', [`?name=${targetUsername}`]);
                    for (const conn of activeConnections) {
                        await client.write('/ppp/active/remove', [`=.id=${conn['.id']}`]);
                    }

                } catch (err) {
                    return NextResponse.json({ error: "Failed to update Mikrotik: " + err.message }, { status: 500 });
                }

                // Update DB (Customer & User)
                const finalUsername = newValues.username || targetUsername;

                if (newValues.username && newValues.username !== targetUsername) {
                    // Check if new exists
                    const exists = await db.customer.findUnique({
                        where: {
                            username_ownerId: {
                                username: newValues.username,
                                ownerId: registration.ownerId
                            }
                        }
                    });

                    if (exists) return NextResponse.json({ error: "New username already exists" }, { status: 400 });

                    // Update User username (if exists)
                    await db.user.updateMany({
                        where: { username: targetUsername },
                        data: { username: newValues.username }
                    });

                    // Customer table - update
                    // Must find using composite key
                    const oldCust = await db.customer.findUnique({
                        where: {
                            username_ownerId: {
                                username: targetUsername,
                                ownerId: registration.ownerId
                            }
                        }
                    });

                    if (oldCust) {
                        await db.customer.update({
                            where: {
                                username_ownerId: {
                                    username: targetUsername,
                                    ownerId: registration.ownerId
                                }
                            },
                            data: {
                                username: newValues.username, // Actual Rename
                                name: newValues.name || undefined,
                                address: newValues.address || undefined,
                                phone: newValues.phone || undefined,
                                agentId: newValues.agentId || undefined,
                                technicianId: newValues.technicianId || undefined,
                                coordinates: newValues.coordinates || undefined,
                                comment: newValues.comment || undefined
                            }
                        });
                    }
                } else {
                    // Update existing
                    await db.customer.update({
                        where: {
                            username_ownerId: {
                                username: targetUsername,
                                ownerId: registration.ownerId
                            }
                        },
                        data: {
                            name: newValues.name,
                            address: newValues.address,
                            phone: newValues.phone,
                            agentId: newValues.agentId,
                            technicianId: newValues.technicianId,
                            coordinates: newValues.coordinates,
                            comment: newValues.comment
                        }
                    });
                }

                await db.registration.delete({ where: { id: registration.id } });
                return NextResponse.json({ success: true, message: "Edit request approved and executed" });

            } else if (requestType === 'delete') {
                const targetUsername = registration.targetUsername;

                // Resolve Connection
                let connectionId = null;
                try {
                    const { getConfig, getUserConnectionId } = await import('@/lib/config');
                    const config = await getConfig();
                    const mockUser = { role: 'agent', ownerId: registration.ownerId };
                    connectionId = getUserConnectionId(mockUser, config);
                } catch (e) {
                    console.error('Failed to resolve connection for delete:', e);
                }

                // --- 1. MIKROTIK REMOVAL ---
                try {
                    const client = await getMikrotikClient(connectionId);
                    const users = await client.write('/ppp/secret/print', [`?name=${targetUsername}`]);
                    if (users.length > 0) {
                        await client.write('/ppp/secret/remove', [`=.id=${users[0]['.id']}`]);
                        console.log(`[Mikrotik] Removed PPPoE secret: ${targetUsername}`);
                    }
                    
                    // Kick active session
                    const actives = await client.write('/ppp/active/print', [`?name=${targetUsername}`]);
                    for (const active of actives) {
                        await client.write('/ppp/active/remove', [`=.id=${active['.id']}`]);
                    }
                } catch (err) {
                    console.error("Failed to delete from Mikrotik:", err.message);
                    // We continue DB deletion even if Mikrotik fails
                }

                // --- 2. DATABASE DELETION (Transaction) ---
                try {
                    // Find customer first to get ID for cleanup
                    const customer = await db.customer.findFirst({
                        where: { 
                            username: targetUsername,
                            ownerId: registration.ownerId
                        }
                    });

                    await db.$transaction(async (tx) => {
                        if (customer) {
                            // 1. Notification cleanup
                            await tx.notificationRecipient.deleteMany({
                                where: { customerId: customer.id }
                            });

                            const assocUser = await tx.user.findFirst({ where: { username: targetUsername, role: 'customer' } });
                            if (assocUser) {
                                await tx.notificationRecipient.deleteMany({
                                    where: { userId: assocUser.id }
                                });
                            }
                        }

                        // 2. Radius cleanup
                        await tx.radCheck.deleteMany({ where: { username: targetUsername } });
                        await tx.radReply.deleteMany({ where: { username: targetUsername } });
                        await tx.radUserGroup.deleteMany({ where: { username: targetUsername } });

                        // 3. User & Customer cleanup
                        await tx.user.deleteMany({ where: { username: targetUsername, role: 'customer' } });
                        
                        if (customer) {
                            await tx.customer.delete({ where: { id: customer.id } });
                        } else {
                            // Fallback if findFirst failed for some reason but we still want to try deleting by unique key
                            await tx.customer.deleteMany({
                                where: {
                                    username: targetUsername,
                                    ownerId: registration.ownerId
                                }
                            });
                        }

                        // 4. Delete the registration request itself
                        await tx.registration.delete({ where: { id: registration.id } });
                    });

                    return NextResponse.json({ success: true, message: "Permintaan hapus disetujui dan data pelanggan telah dibersihkan" });
                } catch (dbErr) {
                    console.error('Delete Approval DB Error:', dbErr);
                    return NextResponse.json({ error: `Gagal memproses penghapusan di database: ${dbErr.message}` }, { status: 500 });
                }
            }
        }
    } catch (error) {
        console.error('Registration action error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
