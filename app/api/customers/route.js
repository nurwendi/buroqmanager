import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';

export async function GET(request) {
    try {
        const user = await getUserFromRequest(request); // Await the promise!
        let where = {};

        if (user) {
            // Role-based filtering
            if (user.role === 'admin') {
                where.ownerId = user.id;
            } else if (user.role === 'superadmin') {
                // No filter
            } else if (['agent', 'technician', 'staff', 'editor'].includes(user.role)) {
                // Combined restriction logic
                if (user.role === 'technician') {
                    where.technicianId = user.id;
                } else {
                    // Agent, Staff, Editor -> assumed Agent role for now unless logic differs?
                    // Actually, staff usually means generic agent. Editor is now same.
                    where.agentId = user.id;
                }

                // Allow finding if they are EITHER agent OR technician if they have both flags?
                // The DB structure is rigid here in the IF/ELSE blocks.
                // Let's defer to the existing simpler logic or improve it.
                // Existing logic had separate blocks. Let's act like 'agent'.
                if (user.ownerId) where.ownerId = user.ownerId;
            } else {
                // Fallback (e.g. viewer)
                if (user.ownerId) where.ownerId = user.ownerId;
            }
        }

        const customersList = await db.customer.findMany({
            where,
            include: {
                agent: { select: { username: true, id: true } },
                technician: { select: { username: true, id: true } }
            }
        });

        // Convert array to object to maintain API compatibility
        const customers = customersList.reduce((acc, curr) => {
            acc[curr.username] = curr;
            return acc;
        }, {});

        return NextResponse.json(customers);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, name, address, phone, email, customerId, password, profileId } = body; // Extract profileId


        // Radius Sync Flags
        const createRadiusUser = true;

        console.log(`[API] Updating customer data for username: ${username}`, body);

        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        const user = await getUserFromRequest(request);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let agentId = body.agentId || null;
        let technicianId = body.technicianId || null;
        let ownerId = body.ownerId || null; // Allow superadmin to specify?

        // Auto-assign ownerId based on User
        if (user.role === 'admin') {
            ownerId = user.id; // Admin owns the customer
        } else if (user.role === 'superadmin') {
            // Keep provided ownerId or null. If null, creates 'global' customer?
            // Ideally should require ownerId if strictly multi-tenant.
        } else {
            // Staff -> assign to their owner
            if (user.ownerId) ownerId = user.ownerId;
        }

        // Auto-assign agent/tech if IsAgent/IsTechnician
        if (user.isAgent && !agentId) agentId = user.id;
        if (user.isTechnician && !technicianId) technicianId = user.id;

        // Verify Ownership / Existence
        // We must scope this by ownerId if we have it, or findFirst if we don't (risky)
        // With ownerId determined, we can check specifically.

        let existingCustomer = null;
        if (ownerId) {
            existingCustomer = await db.customer.findUnique({
                where: {
                    username_ownerId: { username, ownerId }
                }
            });
        } else {
            // Fallback for global lookups (superadmin without ownerId)
            // Using findFirst as username is not unique globally
            existingCustomer = await db.customer.findFirst({ where: { username } });
        }

        if (existingCustomer) {
            if (user.role === 'admin' && existingCustomer.ownerId !== user.id) {
                return NextResponse.json({ error: "Unauthorized: not your customer" }, { status: 403 });
            }
            if ((user.role === 'agent' || user.role === 'staff') && existingCustomer.agentId !== user.id) {
                // Check if they belong to same owner at least
                if (existingCustomer.ownerId !== user.ownerId) {
                    return NextResponse.json({ error: "Unauthorized: not your tenant" }, { status: 403 });
                }
            }
        }

        // Verify agent/tech existence if IDs provided
        if (agentId) {
            const agent = await db.user.findUnique({ where: { id: agentId } });
            if (!agent) agentId = null;
        }
        if (technicianId) {
            const tech = await db.user.findUnique({ where: { id: technicianId } });
            if (!tech) technicianId = null;
        }

        // Handle Customer ID Auto-generation
        let finalCustomerId = customerId;

        // If not provided, check if exists in DB or generate
        if (!finalCustomerId) {
            if (existingCustomer && existingCustomer.customerId) {
                finalCustomerId = existingCustomer.customerId;
            } else {
                // Generate new Customer ID
                // Strict Requirement: Prefix with Owner's Agent Number (ownerId di awal)

                let prefix = '999'; // Default fallback

                let effectiveOwnerId = ownerId;
                if (!effectiveOwnerId && user.role === 'superadmin') {
                    // fallback?
                }

                if (effectiveOwnerId) {
                    const ownerUser = await db.user.findUnique({ where: { id: effectiveOwnerId } });
                    if (ownerUser && ownerUser.agentNumber) {
                        prefix = ownerUser.agentNumber;
                    }
                }

                // Optimization: Find customers where customerId starts with prefix
                const existingWithPrefix = await db.customer.findMany({
                    where: {
                        customerId: {
                            startsWith: prefix
                        }
                    },
                    select: { customerId: true }
                });

                let maxSeq = 0;
                for (const c of existingWithPrefix) {
                    if (c.customerId && c.customerId.length > prefix.length) {
                        const seqStr = c.customerId.substring(prefix.length);
                        const seq = parseInt(seqStr, 10); // Ensure base 10
                        if (!isNaN(seq) && seq > maxSeq) {
                            maxSeq = seq;
                        }
                    }
                }

                // Pad sequence to 5 digits
                const nextSeq = maxSeq + 1;
                const paddedSeq = String(nextSeq).padStart(5, '0');

                finalCustomerId = `${prefix}${paddedSeq}`;
            }
        }

        // Upsert Logic
        // We MUST rely on the composite key for upsert if we want it to work with @@unique([username, ownerId])
        // If ownerId is null, we pass null.

        // Check for orphan adoption
        if (ownerId && username) {
            // Check if there is an orphan record with this username
            // Only adopt if we are not editing an existing owned record (which we shouldn't be here if upsert logic is correct, but let's be safe)
            // Actually, if we are here, we are about to Upsert based on (username, ownerId).
            // If that pair doesn't exist, we might be about to collide with an orphan's customerId.

            const orphan = await db.customer.findFirst({
                where: {
                    username: username,
                    ownerId: null
                }
            });

            if (orphan) {
                console.log(`[API] Found orphan customer ${username}. Adopting to owner ${ownerId}.`);
                // Update the orphan to belong to this owner
                await db.customer.update({
                    where: { id: orphan.id },
                    data: { ownerId: ownerId }
                });
            }
        }


        // Manual Upsert to avoid Prisma Unique Constraint nuances with Compound Keys
        let existing = null;
        if (ownerId) {
            existing = await db.customer.findUnique({
                where: {
                    username_ownerId: {
                        username: username,
                        ownerId: ownerId
                    }
                }
            });
        } else {
            // Should properly match the unique index anyway, but findFirst is safer if undefined
            existing = await db.customer.findFirst({
                where: {
                    username: username,
                    ownerId: null
                }
            });
        }

        let customer;
        if (existing) {
            customer = await db.customer.update({
                where: { id: existing.id },
                data: {
                    name: name,
                    address: address,
                    phone: phone,
                    email: email,
                    // customerId: finalCustomerId, // Don't update ID if exists unless necessary? Let's keep existing logic.
                    // Actually, usually we don't change customerId on edit unless explicit?
                    // But here we are syncing. Let's update it if provided.
                    customerId: finalCustomerId,
                    agentId: agentId,
                    technicianId: technicianId,
                }
            });
        } else {
            customer = await db.customer.create({
                data: {
                    username,
                    name: name || '',
                    address: address || '',
                    phone: phone || '',
                    email: email || '',
                    customerId: finalCustomerId,
                    agentId: agentId,
                    technicianId: technicianId,
                    ownerId: ownerId,
                    password: password || undefined,
                    profileId: profileId || undefined
                }
            });
        }

        // ---------------------------------------------------------
        // AUTO-SYNC TO RADIUS (User & Group)
        // ---------------------------------------------------------
        if (createRadiusUser) {
            try {
                // 1. Sync Password (radcheck)
                if (password) {
                    const existingCheck = await db.radCheck.findFirst({
                        where: { username, attribute: 'Cleartext-Password' }
                    });

                    if (existingCheck) {
                        await db.radCheck.update({
                            where: { id: existingCheck.id },
                            data: { value: password }
                        });
                    } else {
                        await db.radCheck.create({
                            data: {
                                username,
                                attribute: 'Cleartext-Password',
                                op: ':=',
                                value: password
                            }
                        });
                    }
                    console.log(`[Radius-Sync] Synced password for ${username}`);
                }

                // 2. Sync Profile/Group (radusergroup)
                if (profileId) {
                    const profile = await db.profile.findUnique({ where: { id: profileId } });
                    if (profile) {
                        // Check if group assignment exists
                        // Note: RadUserGroup uses composite logic usually, but here ID is primary.
                        // We check by username. User usually has 1 main profile.

                        // Clear existing group to avoid duplicates/conflicts? 
                        // Or just update if specific logic used?
                        // Simple approach: Delete all groups for user and add new one.

                        await db.radUserGroup.deleteMany({ where: { username } });

                        await db.radUserGroup.create({
                            data: {
                                username,
                                groupname: profile.name,
                                priority: 1
                            }
                        });
                        console.log(`[Radius-Sync] Assigned user ${username} to group ${profile.name}`);
                    }
                }

                // 3. Sync IP Pool (Framed-Pool) if Owner has specific pool
                if (ownerId) {
                    const owner = await db.user.findUnique({ where: { id: ownerId } });
                    if (owner && owner.radiusPool) {
                        const poolName = owner.radiusPool;

                        // Upsert Framed-Pool in RadReply
                        const existingReply = await db.radReply.findFirst({
                            where: { username, attribute: 'Framed-Pool' }
                        });

                        if (existingReply) {
                            if (existingReply.value !== poolName) {
                                await db.radReply.update({
                                    where: { id: existingReply.id },
                                    data: { value: poolName }
                                });
                            }
                        } else {
                            await db.radReply.create({
                                data: {
                                    username,
                                    attribute: 'Framed-Pool',
                                    op: '=',
                                    value: poolName
                                }
                            });
                        }
                        console.log(`[Radius-Sync] Assigned user ${username} to pool ${poolName}`);
                    }
                }

            } catch (rErr) {
                console.error("[Radius-Sync] Error syncing to Radius tables:", rErr);
                // Do not fail the whole request, just log it.
            }
        }

        return NextResponse.json({ success: true, customer });
    } catch (error) {
        console.error('[API] Error saving customer data:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
