import { Telnet } from 'telnet-client';
import db from '../db';

let sharedConnection = null;

// Simple Mutex Implementation to enforce serial command execution
class Mutex {
    constructor() {
        this._queue = Promise.resolve();
    }

    lock() {
        let unlock;
        // Create a promise that will be resolved when the lock is released
        const next = new Promise(resolve => unlock = resolve);

        // Chain this promise to the end of the queue
        const previous = this._queue;
        this._queue = this._queue.then(() => next, () => next); // Continue even if previous failed

        // Wait for the previous task to finish
        // We return the unlock function that the caller MUST execute
        return previous.then(() => unlock);
    }
}

const oltLock = new Mutex();

const getOltConfig = async () => {
    let dbConfig = {};
    try {
        const setting = await db.systemSetting.findUnique({
            where: { key: 'olt_config' }
        });
        if (setting) {
            dbConfig = JSON.parse(setting.value);
        }
    } catch (e) {
        console.error("Failed to load OLT config from DB:", e);
    }

    return {
        host: dbConfig.host || process.env.OLT_HOST,
        port: parseInt(dbConfig.port || process.env.OLT_PORT || 23),
        username: dbConfig.username || process.env.OLT_USER,
        password: dbConfig.password || process.env.OLT_PASS,
        shellPrompt: /ZXAN.*#\s*$/, // Regex for ZTE prompt
        loginPrompt: /Username:/i,
        passwordPrompt: /Password:/i,
        timeout: 30000, // Increased to 30s for heavy commands like show running-config
        negotiationMandatory: false,
        debug: process.env.NODE_ENV !== "production"
            ? (msg) => console.log("[TELNET DEBUG]", msg)
            : undefined
    };
};

export async function deleteOnu(slotPort, onuId) {
    const unlock = await oltLock.lock();
    try {
        console.log(`[Telnet] Deleting ONU ${slotPort}:${onuId}`);
        const conn = await getConnection();
        const params = await getOltConfig();

        // Command Sequence: Enter Interface -> No ONU -> Exit
        await conn.send(`interface gpon-olt_${slotPort}`, { shellPrompt: params.shellPrompt });
        const res = await conn.send(`no onu ${onuId}`, { shellPrompt: params.shellPrompt });
        await conn.send('exit', { shellPrompt: params.shellPrompt });

        return res;
    } catch (err) {
        console.error(`[Telnet] Delete ONU error:`, err.message);
        throw err;
    } finally {
        unlock();
    }
}

/**
 * Ensure we have a connected Telnet session
 */
async function getConnection() {
    // Check if shared connection is alive
    if (sharedConnection && sharedConnection._socket && sharedConnection._socket.writable && !sharedConnection._socket.destroyed) {
        return sharedConnection;
    }

    console.log("[Telnet] establishing new connection...");
    const params = await getOltConfig();

    if (!params.host || !params.username || !params.password) {
        throw new Error("OLT Credentials not configured");
    }

    const connection = new Telnet();

    try {
        await connection.connect(params);

        // Note: telnet-client connect() usually handles login if params are provided.
        // We check if we need to manually disable paging.

        try {
            // Disable paging (critical for parsing long outputs)
            await connection.send("terminal length 0", { shellPrompt: params.shellPrompt });
        } catch (e) {
            console.warn("[Telnet] Warning: terminal length 0 command failed or timed out", e.message);
        }

        sharedConnection = connection;

        // Add event listeners to cleanup on close/error
        connection.on('close', () => {
            console.log("[Telnet] Connection closed");
            sharedConnection = null;
        });

        connection.on('error', (err) => {
            console.error("[Telnet] Socket error:", err);
            sharedConnection = null;
        });

        return connection;
    } catch (error) {
        console.error("Telnet Connection Failed:", error);
        if (connection) connection.end();
        throw error;
    }
}

/**
 * Run a command on OLT and return raw output
 * SERIALIZED EXECUTION WITH MUTEX
 */
export async function runOltCommand(command) {
    const unlock = await oltLock.lock(); // Wait for exclusive access

    try {
        let conn = await getConnection();
        const params = await getOltConfig();

        console.log(`[Telnet] Executing: ${command}`);
        const result = await conn.send(command, {
            shellPrompt: params.shellPrompt,
            timeout: params.timeout
        });

        return result;
    } catch (err) {
        console.error(`[Telnet] Command '${command}' error:`, err.message);

        // Force reset connection on error to clear bad state
        if (sharedConnection) {
            try { await sharedConnection.end(); } catch (e) { }
            sharedConnection = null;
        }
        throw err;
    } finally {
        unlock(); // Release lock for next command
    }
}

export async function closeOltConnection() {
    if (sharedConnection) {
        await sharedConnection.end();
        sharedConnection = null;
    }
}

export async function getUnconfiguredOnus() {
    return await runOltCommand("show gpon onu uncfg");
}

export async function getAllOnuDetails() {
    // "show running-config" is heavy but necessary for full PPPoE details if not using N+1 queries.
    // The timeout has been increased to support this.
    return await runOltCommand("show running-config");
}

export async function registerOnu({ slotPort, onuId, sn, type, name, vlan, user, password, profile, vlanProfile }) {
    const unlock = await oltLock.lock(); // Lock for the entire sequence to prevent interruption

    try {
        // Sequence generator matching User CLI
        const cmds = [];

        // 1. Register ONU
        cmds.push(`interface gpon-olt_${slotPort}`);
        cmds.push(`onu ${onuId} type ${type} sn ${sn}`);
        cmds.push(`exit`);

        // 2. Configure Interface
        // interface gpon-onu_1/1/1:1
        cmds.push(`interface gpon-onu_${slotPort}:${onuId}`);
        const bwProfile = profile || '10M';

        cmds.push(`tcont 1 profile ${bwProfile}`);
        cmds.push(`gemport 1 tcont 1`);

        // gemport 1 traffic-limit upstream 10M downstream 10M
        cmds.push(`gemport 1 traffic-limit upstream ${bwProfile} downstream ${bwProfile}`);

        // service-port 1 vport 1 user-vlan 143 vlan 143
        if (vlan) {
            cmds.push(`service-port 1 vport 1 user-vlan ${vlan} vlan ${vlan}`);
        }
        cmds.push(`exit`);

        // 3. Configure WAN / Management
        // pon-onu-mng gpon-onu_1/1/1:1
        cmds.push(`pon-onu-mng gpon-onu_${slotPort}:${onuId}`);

        // service 1 gemport 1 vlan 143
        if (vlan) {
            cmds.push(`service 1 gemport 1 vlan ${vlan}`);
        }

        if (user && password) {
            // wan-ip 1 mode pppoe username jonyelektro password 212 vlan-profile netmedia143 host 1
            const vp = vlanProfile || (vlan ? `netmedia${vlan}` : 'default');
            cmds.push(`wan-ip 1 mode pppoe username ${user} password ${password} vlan-profile ${vp} host 1`);
        }
        cmds.push(`exit`);

        const conn = await getConnection();
        const params = await getOltConfig();
        const results = [];

        for (const cmd of cmds) {
            console.log(`[Telnet] Registering Step: ${cmd}`);
            const res = await conn.send(cmd, { shellPrompt: params.shellPrompt, timeout: params.timeout });
            results.push({ cmd, res });
        }

        return results;
    } catch (err) {
        console.error("[Telnet] Registration failed:", err);
        if (sharedConnection) {
            try { await sharedConnection.end(); } catch (e) { }
            sharedConnection = null;
        }
        throw err;
    } finally {
        unlock();
    }
}
