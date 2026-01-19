
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

        // 2. Parse original profile from the comment (Format: "AUTO-ISOLIR | OLD:profileName")
        let profileToRestore = 'default';
        // Fallback to searching 'OLD:' tag
        if (secret.comment) {
            const match = secret.comment.match(/OLD:([^\s]+)/);
            if (match) {
                profileToRestore = match[1];
            } else {
                // Trying to be smart: if no OLD tag, maybe check if they belong to a specific plan based on other data?
                // For now, if no tag is found, we might default to their current profile if it's NOT DROP, 
                // or just 'default' if it is DROP. 
                // SAFEGUARD: If profile is NOT 'DROP', do nothing.
                if (secret.profile !== 'DROP') {
                    return { success: true, message: 'User is not in DROP profile.' };
                }
            }
        }

        // 3. Remove the AUTO-ISOLIR tag from comment
        const newComment = (secret.comment || '').replace(/AUTO-ISOLIR \| OLD:[^\s]+/, '').trim();

        // 4. Update the secret
        await client.write('/ppp/secret/set', [
            `=.id=${secret['.id']}`,
            `=profile=${profileToRestore}`,
            `=comment=${newComment}`
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
        return { success: true, profile: profileToRestore };

    } catch (error) {
        console.error(`Failed to restore user ${username}:`, error);
        return { success: false, error: error.message };
    }
}
