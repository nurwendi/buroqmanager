import db from './db.js';

let cachedConfig = null;
let cachedConfigAt = 0;
const CONFIG_TTL_MS = 5000; // 5s TTL per worker to eliminate duplicate DB reads per request

export const getConfig = async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && cachedConfig && (now - cachedConfigAt < CONFIG_TTL_MS)) {
        return cachedConfig;
    }

    try {
        const setting = await db.systemSetting.findUnique({
            where: { key: 'mikrotik_config' }
        });

        if (setting) {
            const config = JSON.parse(setting.value);
            // Ensure legacy structure support
            if (!config.connections) config.connections = [];
            cachedConfig = config;
            cachedConfigAt = now;
            return config;
        }
    } catch (error) {
        console.error('Error reading config:', error);
    }
    const emptyConfig = { connections: [], activeConnectionId: null };
    cachedConfig = emptyConfig;
    cachedConfigAt = now;
    return emptyConfig;
};

export const saveConfig = async (config) => {
    try {
        await db.systemSetting.upsert({
            where: { key: 'mikrotik_config' },
            update: { value: JSON.stringify(config) },
            create: { key: 'mikrotik_config', value: JSON.stringify(config) }
        });

        cachedConfig = config;
        cachedConfigAt = Date.now();
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
