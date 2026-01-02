
const GENIEACS_URL = process.env.GENIEACS_API_URL || 'http://localhost:7557';

async function findParams() {
    console.log(`\n🔍 Connecting to ${GENIEACS_URL} to find hidden parameters...`);

    try {
        const res = await fetch(`${GENIEACS_URL}/devices`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!res.ok) throw new Error(res.statusText);
        const devices = await res.json();

        if (devices.length === 0) {
            console.log('❌ No devices found.');
            return;
        }

        const device = devices[0];
        console.log(`✅ Analyzing Device ID: ${device._id}\n`);

        console.log('--- POTENTIAL PARAMETER PATHS ---');

        // Recursive walk
        function walk(obj, path = '') {
            if (!obj || typeof obj !== 'object') return;

            for (const key in obj) {
                // Skip mongo keys
                if (key.startsWith('_') && key !== '_value') continue;

                const newPath = path ? `${path}.${key}` : key;
                const value = obj[key];

                // Check if this is a value node
                if (value && typeof value === 'object' && '_value' in value) {
                    const val = value._value;
                    checkKey(newPath, val);
                } else if (typeof value !== 'object') {
                    // Direct value
                    checkKey(newPath, value);
                }

                // Recurse
                walk(value, newPath);
            }
        }

        function checkKey(path, value) {
            const p = path.toLowerCase();
            // Keywords to look for
            if (p.includes('power') ||
                p.includes('temp') ||
                p.includes('rssi') ||
                p.includes('rate') ||
                p.includes('serial') ||
                p.includes('product') ||
                p.includes('model') ||
                p.includes('manuf') ||
                p.includes('ssid') ||
                p.includes('username') ||
                p.includes('ppp') ||
                p.includes('vendor') ||
                p.includes('software') ||
                p.includes('deviceinfo')) {

                console.log(`[FOUND] ${path} = ${value}`);
            }
        }

        walk(device);
        console.log('\n--- END SEARCH ---');

    } catch (err) {
        console.error('Error:', err.message);
    }
}

findParams();
