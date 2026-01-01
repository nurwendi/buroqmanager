import db from './db.js';

export const getConfig = async () => {
    try {
        const setting = await db.systemSetting.findUnique({
            where: { key: 'mikrotik_config' }
        });

        if (setting) {
            const config = JSON.parse(setting.value);
            // Ensure legacy structure support
            if (!config.connections) config.connections = [];
            return config;
        }
    } catch (error) {
        console.error('Error reading config:', error);
    }
    return { connections: [], activeConnectionId: null };
};

export const saveConfig = async (config) => {
    try {
        await db.systemSetting.upsert({
            where: { key: 'mikrotik_config' },
            update: { value: JSON.stringify(config) },
            create: { key: 'mikrotik_config', value: JSON.stringify(config) }
        });

        // Also update file for backup/fallback? No, source of truth is DB now.
        // We might want to delete the file later.
        return true;
    } catch (error) {
        console.error('Error saving config:', error);
        return false;
    }
};

export const getUserConnectionId = (user, config) => {
    if (!user || user.role === 'superadmin') return config.activeConnectionId;

    // For Admin: Find their own connection
    if (user.role === 'admin') {
        const myConn = config.connections?.find(c => c.ownerId === user.id);
        return myConn ? myConn.id : null;
    }

    // For Staff: Find Owner's connection
    if (user.ownerId) {
        const ownerConn = config.connections?.find(c => c.ownerId === user.ownerId);
        return ownerConn ? ownerConn.id : null;
    }

    return null;
};
