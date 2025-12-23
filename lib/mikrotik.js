
import { RouterOSAPI } from "node-routeros";
import { getConfig } from "./config.js";

// Map to store active clients: connectionId -> { client: RouterOSAPI, connectPromise: Promise }
const clients = new Map();

const getMikrotikCredentials = async (config, connectionId = null) => {
    if (!config) config = await getConfig();


    // Determine which connection to use
    const targetId = connectionId || config.activeConnectionId;
    const activeConnection = config.connections?.find(c => c.id === targetId);

    // Fallback to env vars if no active connection (or for initial setup)
    const host = activeConnection?.host || process.env.MIKROTIK_HOST;
    const user = activeConnection?.user || process.env.MIKROTIK_USER;
    const password = activeConnection?.password || process.env.MIKROTIK_PASSWORD;
    const port = activeConnection?.port || process.env.MIKROTIK_PORT || 8728;

    if (!host || !user || !password) {
        throw new Error("Mikrotik credentials not configured");
    }

    return { host, user, password, port, targetId };
};

export const isMikrotikConfigured = async () => {
    try {
        await getMikrotikCredentials();
        return true;
    } catch (e) {
        return false;
    }
};

export const getMikrotikClient = async (connectionId = null) => {
    // Always check for fresh config to handle updates
    const config = await getConfig();

    // Get Credentials
    const { host, user, password, port, targetId } = await getMikrotikCredentials(config, connectionId);


    // Check if we already have a client for this connection
    let clientEntry = clients.get(targetId || 'default');

    // If client exists but config changed, close and recreate
    if (clientEntry) {
        const { client } = clientEntry;
        // Check if config matches (simple check)
        const cachedConfig = clientEntry.config; // Note: we aren't storing config in clientEntry in this snippet, might need to fix if original had it.
        // Assuming original logic was simpler or I should just reconstruct standard behavior.

        if (
            client.host !== host ||
            client.port !== parseInt(port) ||
            client.user !== user
        ) {
            try {
                if (client.connected) await client.close();
            } catch (e) {
                console.error("Error closing old connection:", e);
            }
            clients.delete(targetId || 'default');
            clientEntry = null; // Recreate
        }
    }

    if (!clientEntry) {
        const client = new RouterOSAPI({
            host,
            user,
            password,
            port: parseInt(port),
            timeout: 10,
        });

        // Prevent uncaught exceptions from socket errors
        client.on('error', (err) => {
            console.error(`[MikroTik Client Error] ${host}:`, err.message);
        });

        clientEntry = { client, connectPromise: null };
        clients.set(targetId || 'default', clientEntry);
    }

    const { client } = clientEntry;

    if (!client.connected) {
        // If already connecting, wait for that promise
        if (clientEntry.connectPromise) {
            await clientEntry.connectPromise;
        } else {
            // Start connecting
            clientEntry.connectPromise = (async () => {
                try {
                    // Add manual timeout race
                    const connectWithTimeout = Promise.race([
                        client.connect(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Manual Connection Timeout (5s)')), 5000))
                    ]);
                    await connectWithTimeout;
                } catch (error) {
                    console.error(`Failed to connect to Mikrotik (${host}):`, error);
                    // If connection failed, ensure we don't leave a broken client or promise
                    throw error;
                } finally {
                    clientEntry.connectPromise = null;
                }
            })();

            await clientEntry.connectPromise;
        }
    }

    return client;
};

export const verifyPppoeCredentials = async (username, password) => {
    try {
        const client = await getMikrotikClient();

        // Find the secret for this username
        const secrets = await client.write('/ppp/secret/print', [
            `?name=${username}`
        ]);

        if (secrets && secrets.length > 0) {
            const secret = secrets[0];
            if (secret.password === password) {
                return {
                    username: secret.name,
                    role: 'customer',
                    id: secret['.id']
                };
            }
        }

        return null;
    } catch (error) {
        console.error('PPPoE verification failed:', error);
        return null;
    }
};

export const getAllActiveUsers = async (connectionId = null) => {
    try {
        const client = await getMikrotikClient(connectionId);
        const secrets = await client.write('/ppp/secret/print');
        return secrets;
    } catch (error) {
        console.error('Failed to fetch active users', error);
        return [];
    }
};

export const getPppoeProfiles = async (connectionId = null) => {
    try {
        const client = await getMikrotikClient(connectionId);
        const profiles = await client.write('/ppp/profile/print');
        return profiles;
    } catch (error) {
        console.error('Failed to fetch PPPoE profiles', error);
        return [];
    }
};
