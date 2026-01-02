
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

        console.log('--- ROOT KEYS ---');
        console.log(Object.keys(device).join(', '));

        if (device._deviceId) {
            console.log('\n--- _deviceId OBJECT ---');
            console.log(JSON.stringify(device._deviceId, null, 2));
        }

        console.log('\n--- POTENTIAL PARAMETER PATHS ---');

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

        const searchTerm = process.argv[2] ? process.argv[2].toLowerCase() : null;
        if (searchTerm) {
            console.log(`🔎 Searching for value matching: "${searchTerm}"`);
        }

        function checkKey(path, value) {
            const p = path.toLowerCase();
            const v = String(value).toLowerCase();

            // 1. Value Match (if argument provided)
            if (searchTerm && v.includes(searchTerm)) {
                console.log(`[MATCH] ${path} = ${value}`);
                return; // Prioritize value match
            }

            // 2. Keyword Match (if no specific search term, or as general discovery)
            if (!searchTerm && (
                p.includes('power') ||
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
                p.includes('deviceinfo')
            )) {
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
