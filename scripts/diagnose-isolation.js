const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const db = new PrismaClient();
const GENIEACS_API_URL = process.env.GENIEACS_API_URL || 'http://127.0.0.1:7557';

async function fetchDevices() {
    const projection = 'DeviceID.SerialNumber,VirtualParameters.pppoeUsername,InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username,_deviceId._SerialNumber';
    try {
        const url = `${GENIEACS_API_URL}/devices/?projection=${projection}`;
        // console.log("Fetching: " + url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        return await res.json();
    } catch (e) {
        console.error("GenieACS Fetch Error:", e.message);
        return [];
    }
}

// Extract PPPoE user logic (simplified from route.js)
function extractUser(d) {
    const getVal = (path) => {
        const parts = path.split('.');
        let current = d;
        for (const part of parts) {
            current = current?.[part];
        }
        if (current && typeof current === 'object' && '_value' in current) return current._value;
        return current;
    };

    return getVal('VirtualParameters.pppoeUsername') ||
        getVal('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username') ||
        '-';
}

async function main() {
    console.log("=== DIAGNOSING DATA ISOLATION MATCHING ===");
    console.log(`API URL: ${GENIEACS_API_URL}`);

    // 1. Fetch Devices
    console.log("Fetching devices from GenieACS...");
    const devices = await fetchDevices();
    console.log(`[GenieACS] Total Devices Found: ${devices.length}`);

    const deviceUsers = devices.map(d => ({
        id: d._id,
        serial: d.DeviceID?.SerialNumber || d._deviceId?._SerialNumber,
        pppoe: extractUser(d)
    }));

    if (deviceUsers.length > 0) {
        console.log("\n[GenieACS] Sample Devices (First 5):");
        deviceUsers.slice(0, 5).forEach(d => console.log(` - ID: ${d.id}, SN: ${d.serial}, PPPoE: ${d.pppoe}`));
    }

    const allPppoe = deviceUsers.map(d => d.pppoe).filter(u => u && u !== '-');
    console.log(`[GenieACS] Total Valid PPPoE Usernames found: ${allPppoe.length}`);

    // 2. Fetch Customers
    console.log("\nFetching customers from Database...");
    const customers = await db.customer.findMany({
        select: { id: true, username: true, ownerId: true }
    });
    console.log(`[Database] Total Customers Found: ${customers.length}`);

    // 3. Group Customers by Owner
    const customersByOwner = {};
    customers.forEach(c => {
        if (!customersByOwner[c.ownerId]) customersByOwner[c.ownerId] = [];
        customersByOwner[c.ownerId].push(c.username);
    });

    console.log("\n[Analysis] Matching Devices to Owners:");
    console.log("----------------------------------------");
    for (const [ownerId, usernames] of Object.entries(customersByOwner)) {
        // Find how many devices match these usernames
        const myUsernames = new Set(usernames);
        const matches = deviceUsers.filter(d => myUsernames.has(d.pppoe));

        console.log(`Owner ID: ${ownerId}`);
        console.log(` - Customers count: ${usernames.length}`);
        console.log(` - GenieACS Matches: ${matches.length}`);

        if (matches.length === 0) {
            console.log(`   WARNING: No devices matched for this owner! Potential Mismatch.`);
            if (usernames.length > 0) {
                console.log(`   Sample Customer Usernames: ${usernames.slice(0, 3).join(', ')}`);
            }
        } else {
            console.log(`   SUCCESS: Matches found.`);
        }
        console.log("----------------------------------------");
    }

}

main()
    .catch(e => console.error(e))
    .finally(async () => await db.$disconnect());
