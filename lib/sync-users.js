
import { getMikrotikClient } from './mikrotik';
import db from './db';
import bcrypt from 'bcryptjs';

export async function syncUsersFromRouter(targetOwnerIdParam, connectionId = null) {
    console.log(`Starting Sync: Owner = ${targetOwnerIdParam}, Connection = ${connectionId || 'Default'} `);
    try {
        const client = await getMikrotikClient(connectionId); // Gets active connection
        const mikrotikUsers = await client.write('/ppp/secret/print');

        if (!mikrotikUsers || mikrotikUsers.length === 0) {
            console.log('No users found in Mikrotik.');
            return { imported: 0, total: 0 };
        }

        // Determine Owner
        // If ownerId is provided, use it. Otherwise, try to find a default superadmin or the first admin.
        let targetOwnerId = targetOwnerIdParam;

        // Validation: If no owner provided, we cannot strictly scope.
        // Fallback to superadmin?
        if (!targetOwnerId) {
            const admin = await db.user.findFirst({ where: { role: 'superadmin' } }) ||
                await db.user.findFirst({ where: { role: 'admin' } });
            targetOwnerId = admin?.id;
        }

        if (!targetOwnerId) {
            console.error('Sync Aborted: No Owner ID found.');
            return { error: 'No Owner ID' };
        }

        const owner = await db.user.findUnique({ where: { id: targetOwnerId } });
        // Ensure agentNumber is treated as '100' if null OR empty string
        const agentNumber = (owner?.agentNumber && owner.agentNumber.trim() !== '') ? owner.agentNumber : '99';

        // Fetch existing customers FOR THIS OWNER to avoid duplicates
        // Note: Different owners can have same usernames now.
        const existingCustomers = await db.customer.findMany({
            where: { ownerId: targetOwnerId },
            select: { username: true }
        });
        const existingUsernames = new Set(existingCustomers.map(c => c.username));

        // Filter users that are NOT in DB for this owner and deduplicate by name
        const seenInBatch = new Set();
        const newUsers = [];
        for (const u of mikrotikUsers) {
            if (!u.name || existingUsernames.has(u.name) || seenInBatch.has(u.name)) continue;
            seenInBatch.add(u.name);
            newUsers.push({
                name: u.name,
                password: u.password,
                profile: u.profile,
                service: u.service,
                comment: u.comment
            });
        }

        if (newUsers.length === 0) {
            console.log('No new users to sync for this owner.');
            return { imported: 0, total: mikrotikUsers.length };
        }

        // Get max customer ID sequence (customerId)
        const lastCustomer = await db.customer.findFirst({
            where: { customerId: { startsWith: agentNumber } },
            orderBy: { customerId: 'desc' }
        });

        let currentSequence = 0;
        if (lastCustomer && lastCustomer.customerId.length > agentNumber.length) {
            try {
                const seqPart = lastCustomer.customerId.substring(agentNumber.length);
                currentSequence = parseInt(seqPart) || 0;
            } catch (e) { }
        }

        // Default customer portal password is 'buroq' (must be changed on first login)
        const defaultPasswordHash = await bcrypt.hash('buroq', 10);

        const customersToInsert = newUsers.map(u => {
            currentSequence++;
            const sequenceStr = currentSequence.toString().padStart(5, '0');
            return {
                username: u.name,
                customerId: `${agentNumber}${sequenceStr}`,
                password: defaultPasswordHash,
                name: '',
                ownerId: targetOwnerId
            };
        });

        let successCount = 0;
        const INSERT_CHUNK_SIZE = 500;
        for (let i = 0; i < customersToInsert.length; i += INSERT_CHUNK_SIZE) {
            const chunk = customersToInsert.slice(i, i + INSERT_CHUNK_SIZE);
            const res = await db.customer.createMany({
                data: chunk,
                skipDuplicates: true
            });
            successCount += res.count;
        }

        console.log(`Auto-Sync Complete. Imported ${successCount} users for owner ${targetOwnerId}.`);
        return { imported: successCount, total: mikrotikUsers.length };

    } catch (error) {
        console.error('Auto-Sync Error:', error);
        return { error: error.message };
    }
}

