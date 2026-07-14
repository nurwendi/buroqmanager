
import { getMikrotikClient } from '@/lib/mikrotik';

/**
 * Restores a user's connection by reverting their profile from DROP to the original one.
 * @param {string} username - The PPPoE username to restore.
 */
export async function restoreUserConnection(username) {
    let client;
    try {
        client = await getMikrotikClient();

        // 1. Get the secret to find the original profile
        const secrets = await client.write('/ppp/secret/print', [
            `?name=${username}`
        ]);

        if (!secrets || secrets.length === 0) {
            console.warn(`User ${username} not found in Mikrotik during restore.`);
            return { success: false, error: 'User not found' };
        }
        const secret = secrets[0];

        // 2. Resolve original profile (prioritize DB lookup, fallback to comment)
        let profileToRestore = 'default';
        const db = (await import('@/lib/db')).default;
        const customer = await db.customer.findFirst({
            where: { username },
            include: { profile: true }
        });

        if (customer && customer.profile) {
            profileToRestore = customer.profile.name;
        } else if (secret.comment) {
            const match = secret.comment.match(/OLD:([^\s]+)/);
            if (match) {
                profileToRestore = match[1];
            } else if (secret.profile !== 'DROP') {
                return { success: true, message: 'User is not in DROP profile.' };
            }
        } else if (secret.profile !== 'DROP') {
            return { success: true, message: 'User is not in DROP profile.' };
        }

        // 4. Update the secret (profile only, preserving existing comment)
        await client.write('/ppp/secret/set', [
            `=.id=${secret['.id']}`,
            `=profile=${profileToRestore}`
        ]);

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
