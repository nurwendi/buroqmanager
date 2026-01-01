import fs from 'fs';
import path from 'path';
import { getMikrotikClient } from './mikrotik';
const USAGE_FILE = path.join(process.cwd(), 'data', 'user-usage.json');

// Helper to read usage data
function getUsageData() {
    try {
        if (fs.existsSync(USAGE_FILE)) {
            const data = fs.readFileSync(USAGE_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error reading usage file:', error);
    }
    return {};
}

// Helper to save usage data
function saveUsageData(data) {
    try {
        // Ensure directory exists
        const dir = path.dirname(USAGE_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving usage file:', error);
    }
}

export async function syncUsage() {
    // console.log('[UsageSync] Starting daily/periodic sync...');
    try {
        const { getConfig } = await import('./config');
        const config = await getConfig();

        let targetConnections = config.connections || [];

        // Fallback for ENV based setup (if no connections in DB)
        if (targetConnections.length === 0) {
            // console.log('[UsageSync] No connections in config. Trying default ENV connection...');
            targetConnections.push({ id: null, name: 'Default (Env)', host: process.env.MIKROTIK_HOST || 'env' });
        }

        const usageData = getUsageData();
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        // Iterate over all connections
        for (const connection of targetConnections) {
            // console.log(`[UsageSync] Syncing connection: ${connection.name}`);
            try {
                const client = await getMikrotikClient(connection.id);

                // Fetch active connections and interfaces
                const [activeConnections, interfaces] = await Promise.all([
                    client.write('/ppp/active/print'),
                    client.write('/interface/print')
                ]);

                // console.log(`[UsageSync] Connection ${connection.name}: ${activeConnections.length} active sessions`);

                // Create a map for faster interface lookup
                const interfaceMap = new Map();
                interfaces.forEach(i => interfaceMap.set(i.name, i));

                // Process each active connection
                for (const conn of activeConnections) {
                    const username = conn.name;

                    // Improved matching logic:
                    // 1. <pppoe-username> (MikroTik dynamic default)
                    // 2. pppoe-username (Manual or custom)
                    // 3. username (Direct interface)
                    const patterns = [
                        `<pppoe-${username}>`,
                        `pppoe-${username}`,
                        username
                    ];

                    let userInterface = null;
                    for (const p of patterns) {
                        if (interfaceMap.has(p)) {
                            userInterface = interfaceMap.get(p);
                            break;
                        }
                    }

                    if (!userInterface) {
                        // console.warn(`[UsageSync] Interface not found for user ${username}`);
                        continue;
                    }

                    const currentRx = parseInt(userInterface['rx-byte'] || 0);
                    const currentTx = parseInt(userInterface['tx-byte'] || 0);
                    const sessionId = conn['.id'];

                    // Initialize user data if not exists
                    if (!usageData[username]) {
                        usageData[username] = {
                            month: currentMonth,
                            accumulated_rx: 0,
                            accumulated_tx: 0,
                            last_session_id: sessionId,
                            last_session_rx: currentRx,
                            last_session_tx: currentTx
                        };
                    }

                    const userData = usageData[username];

                    // Check for month change
                    if (userData.month !== currentMonth) {
                        userData.month = currentMonth;
                        userData.accumulated_rx = 0;
                        userData.accumulated_tx = 0;
                        userData.last_session_id = sessionId;
                        userData.last_session_rx = currentRx;
                        userData.last_session_tx = currentTx;
                    }

                    // Check for session change
                    if (userData.last_session_id !== sessionId) {
                        // Previous session ended. Add its last known usage to accumulated.
                        userData.accumulated_rx += userData.last_session_rx;
                        userData.accumulated_tx += userData.last_session_tx;

                        // Start tracking new session
                        userData.last_session_id = sessionId;
                        userData.last_session_rx = currentRx;
                        userData.last_session_tx = currentTx;
                    } else {
                        // Same session
                        // Handle counter reset (reboot/overflow)
                        if (currentRx < userData.last_session_rx) {
                            userData.accumulated_rx += userData.last_session_rx;
                            userData.accumulated_tx += userData.last_session_tx;
                        }

                        userData.last_session_rx = currentRx;
                        userData.last_session_tx = currentTx;
                    }
                }

            } catch (err) {
                console.error(`[UsageSync] Failed to sync connection ${connection.name}:`, err.message);
            }
        }

        saveUsageData(usageData);
    } catch (error) {
        console.error('[UsageSync] Error syncing usage:', error);
    }
}

export async function getMonthlyUsage(username) {
    const usageData = getUsageData();
    const userData = usageData[username];

    if (!userData) return { rx: 0, tx: 0 };

    // Check if month matches current month (if not, it's old data)
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (userData.month !== currentMonth) return { rx: 0, tx: 0 };

    // Total = Accumulated + Current Session (Last Known)
    return {
        rx: userData.accumulated_rx + userData.last_session_rx,
        tx: userData.accumulated_tx + userData.last_session_tx
    };
}

export async function getAllMonthlyUsage() {
    return getUsageData();
}

