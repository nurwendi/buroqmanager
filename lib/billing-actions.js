import { getMikrotikClient } from '@/lib/mikrotik';
import { getConfig } from '@/lib/config';

/**
 * Restores a user's connection by re-enabling their PPPoE secret and reverting their profile from DROP to the original one.
 * @param {string} username - The PPPoE username to restore.
 * @param {string|null} [ownerId=null] - Optional tenant owner ID to resolve the correct MikroTik router connection.
 */
export async function restoreUserConnection(username, ownerId = null) {
    let client;
    try {
        const db = (await import('@/lib/db')).default;
        const customer = await db.customer.findFirst({
            where: {
                username,
                ...(ownerId ? { ownerId } : {})
            },
            include: { profile: true }
        });

        const resolvedOwnerId = ownerId || customer?.ownerId || null;
        const config = await getConfig();
        let connectionId = config.activeConnectionId || null;

        if (resolvedOwnerId && Array.isArray(config.connections)) {
            const ownerConnection = config.connections.find(c => c.ownerId === resolvedOwnerId);
            if (ownerConnection) {
                connectionId = ownerConnection.id;
            }
        }

        client = await getMikrotikClient(connectionId);

        // 1. Get the secret to find the original profile / disabled state
        const secrets = await client.write('/ppp/secret/print', [
            `?name=${username}`
        ]);

        if (!secrets || secrets.length === 0) {
            console.warn(`User ${username} not found in Mikrotik during restore.`);
            return { success: false, error: 'User not found' };
        }
        const secret = secrets[0];
        const isDisabled = secret.disabled === 'true' || secret.disabled === true;

        // 2. Resolve original profile (prioritize DB lookup, fallback to OLD:... comment)
        let profileToRestore = secret.profile && secret.profile !== 'DROP' ? secret.profile : 'default';
        let currentComment = secret.comment || '';
        const oldMatch = currentComment.match(/OLD:([^\s]+)/);

        if (customer && customer.profile) {
            profileToRestore = customer.profile.name;
        } else if (oldMatch) {
            profileToRestore = oldMatch[1];
        } else if (secret.profile !== 'DROP' && !isDisabled) {
            return { success: true, message: 'User is not in DROP profile or disabled.' };
        }

        // 3. Strip OLD:... from comment if present
        const cleanedComment = oldMatch
            ? currentComment.replace(/\s*OLD:[^\s]+/g, '').trim()
            : currentComment;

        // 4. Update the secret (restore profile, re-enable if disabled, and clean comment)
        const setParams = [
            `=.id=${secret['.id']}`,
            `=profile=${profileToRestore}`,
            '=disabled=no'
        ];
        if (cleanedComment !== currentComment) {
            setParams.push(`=comment=${cleanedComment}`);
        }

        await client.write('/ppp/secret/set', setParams);

        // 5. Kick active connections to apply the new profile immediately
        const activeConnections = await client.write('/ppp/active/print', [
            `?name=${username}`
        ]);

        if (activeConnections && activeConnections.length > 0) {
            for (const conn of activeConnections) {
                await client.write('/ppp/active/remove', [
                    `=.id=${conn['.id']}`
                ]);
            }
        }

        console.log(`Successfully restored user ${username} to profile ${profileToRestore}`);

        // Notify User
        try {
            const { sendTargetedNotificationByUsername } = await import('./notifications-db');
            await sendTargetedNotificationByUsername({
                username,
                ownerId: resolvedOwnerId,
                title: 'Koneksi Pulih',
                message: 'Admin telah mengaktifkan kembali koneksi internet Anda. Silakan restart router jika diperlukan.',
                type: 'system'
            });
        } catch (notifyError) {
            console.error('Failed to send restoration notification:', notifyError.message);
        }

        return { success: true, profile: profileToRestore };

    } catch (error) {
        console.error(`Failed to restore user ${username}:`, error);
        return { success: false, error: error.message };
    }
}

