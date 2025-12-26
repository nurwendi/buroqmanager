import { Telnet } from 'telnet-client';
import db from '../db';

const connectionPool = new Map(); // Map<oltId, Telnet>
const locks = new Map(); // Map<oltId, Mutex>

// Simple Mutex Implementation
class Mutex {
    constructor() {
        this._queue = Promise.resolve();
    }

    lock() {
        let unlock;
        const next = new Promise(resolve => unlock = resolve);
        const previous = this._queue;
        this._queue = this._queue.then(() => next, () => next);
        return previous.then(() => unlock);
    }
}

function getLock(oltId) {
    if (!locks.has(oltId)) {
        locks.set(oltId, new Mutex());
    }
    return locks.get(oltId);
}

const getOltConfig = async (oltId) => {
    if (!oltId) throw new Error("OLT ID required for configuration");

    let dbConfig = null;
    try {
        dbConfig = await db.oltConfig.findUnique({
            where: { id: oltId }
        });
    } catch (e) {
        console.error("Failed to load OLT config from DB:", e);
    }

    if (!dbConfig) {
        return null;
    }

    return {
        host: dbConfig.host,
        port: dbConfig.port || 23,
        username: dbConfig.username,
        password: dbConfig.password,
        shellPrompt: /ZXAN.*#\s*$/,
        loginPrompt: /Username:/i,
        passwordPrompt: /Password:/i,
        timeout: 30000,
        negotiationMandatory: false,
        debug: process.env.NODE_ENV !== "production"
            ? (msg) => console.log(`[TELNET ${oltId}]`, msg)
            : undefined
    };
};

/**
 * Ensure we have a connected Telnet session for the specific OLT
 */
async function getConnection(oltId) {
    if (!oltId) throw new Error("OLT ID missing");

    let existingParam = connectionPool.get(oltId);
    if (existingParam && existingParam._socket && existingParam._socket.writable && !existingParam._socket.destroyed) {
        return existingParam;
    }

    console.log(`[Telnet] Establishing new connection to OLT ${oltId}...`);
    const params = await getOltConfig(oltId);

    if (!params || !params.host || !params.username || !params.password) {
        throw new Error("OLT Credentials not configured");
    }

    const connection = new Telnet();

    try {
        await connection.connect(params);

        try {
            await connection.send("terminal length 0", { shellPrompt: params.shellPrompt });
        } catch (e) {
            console.warn("[Telnet] Warning: terminal length 0 failed", e.message);
        }

        connectionPool.set(oltId, connection);

        connection.on('close', () => {
            console.log(`[Telnet] Connection closed for ${oltId}`);
            if (connectionPool.get(oltId) === connection) {
                connectionPool.delete(oltId);
            }
        });

        connection.on('error', (err) => {
            console.error(`[Telnet] Socket error for ${oltId}:`, err);
            if (connectionPool.get(oltId) === connection) {
                connectionPool.delete(oltId);
            }
        });

        return connection;
    } catch (error) {
        console.error(`Telnet Connection Failed (${params.host}):`, error);
        if (connection) connection.end();
        throw error;
    }
}

export async function runOltCommand(command, oltId) {
    if (!oltId) throw new Error("OLT ID is required");
    const mutex = getLock(oltId);
    const unlock = await mutex.lock();

    try {
        let conn = await getConnection(oltId);
        const params = await getOltConfig(oltId);

        console.log(`[Telnet ${oltId}] Executing: ${command}`);
        const result = await conn.send(command, {
            shellPrompt: params.shellPrompt,
            timeout: params.timeout
        });

        return result;
    } catch (err) {
        console.error(`[Telnet ${oltId}] Command '${command}' error:`, err.message);
        const poolConn = connectionPool.get(oltId);
        if (poolConn) {
            try { await poolConn.end(); } catch (e) { }
            connectionPool.delete(oltId);
        }
        throw err;
    } finally {
        unlock();
    }
}

export async function closeOltConnection(oltId) {
    if (oltId && connectionPool.has(oltId)) {
        const conn = connectionPool.get(oltId);
        await conn.end();
        connectionPool.delete(oltId);
    }
}

// === Public API Wrappers ===

export async function getUnconfiguredOnus(oltId) {
    return await runOltCommand("show gpon onu uncfg", oltId);
}

export async function getAllOnuDetails(oltId) {
    return await runOltCommand("show running-config", oltId);
}

export async function deleteOnu(slotPort, onuId, oltId) {
    if (!oltId) throw new Error("OLT ID required");
    const mutex = getLock(oltId);
    const unlock = await mutex.lock();

    try {
        console.log(`[Telnet ${oltId}] Deleting ONU ${slotPort}:${onuId}`);
        const conn = await getConnection(oltId);
        const params = await getOltConfig(oltId);

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

export async function registerOnu({ slotPort, onuId, sn, type, name, vlan, user, password, profile, vlanProfile, oltId }) {
    if (!oltId) throw new Error("OLT ID required");
    const mutex = getLock(oltId);
    const unlock = await mutex.lock();

    try {
        const cmds = [];
        cmds.push(`interface gpon-olt_${slotPort}`);
        cmds.push(`onu ${onuId} type ${type} sn ${sn}`);
        cmds.push(`exit`);

        cmds.push(`interface gpon-onu_${slotPort}:${onuId}`);
        const bwProfile = profile || '10M';
        cmds.push(`tcont 1 profile ${bwProfile}`);
        cmds.push(`gemport 1 tcont 1`);
        cmds.push(`gemport 1 traffic-limit upstream ${bwProfile} downstream ${bwProfile}`);
        if (vlan) {
            cmds.push(`service-port 1 vport 1 user-vlan ${vlan} vlan ${vlan}`);
        }
        cmds.push(`exit`);

        cmds.push(`pon-onu-mng gpon-onu_${slotPort}:${onuId}`);
        if (vlan) {
            cmds.push(`service 1 gemport 1 vlan ${vlan}`);
        }
        if (user && password) {
            const vp = vlanProfile || (vlan ? `netmedia${vlan}` : 'default');
            cmds.push(`wan-ip 1 mode pppoe username ${user} password ${password} vlan-profile ${vp} host 1`);
        }
        cmds.push(`exit`);

        const conn = await getConnection(oltId);
        const params = await getOltConfig(oltId);
        const results = [];

        for (const cmd of cmds) {
            console.log(`[Telnet ${oltId}] Registering Step: ${cmd}`);
            const res = await conn.send(cmd, { shellPrompt: params.shellPrompt, timeout: params.timeout });
            results.push({ cmd, res });
        }

        return results;
    } catch (err) {
        console.error("[Telnet] Registration failed:", err);
        const poolConn = connectionPool.get(oltId);
        if (poolConn) {
            try { await poolConn.end(); } catch (e) { }
            connectionPool.delete(oltId);
        }
        throw err;
    } finally {
        unlock();
    }
}
