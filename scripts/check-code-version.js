
const fs = require('fs');
const path = require('path');

// Mock environmental variables if needed, or rely on .env loading
// Assuming this is run with: node -r dotenv/config scripts/check-code-version.js
// or just relying on defaults if env vars are missing (GenieACS URL)

const GENIEACS_URL = process.env.GENIEACS_API_URL || 'http://localhost:7557';
const DEVICE_ID = process.argv[2] || '00259E-HG8245H-485754431BEEB933';

async function verifyAndTest() {
    console.log('--- 1. Checking lib/genieacs.js Content ---');
    const libPath = path.join(__dirname, '../lib/genieacs.js');
    try {
        const content = fs.readFileSync(libPath, 'utf8');
        // We look for the exact string used in the fix
        if (content.includes('/devices/${encodeURIComponent(deviceId)}/tasks')) {
            console.log('✅ Code appears updated (Found correct endpoint format).');
        } else {
            console.log('❌ Code appears OUTDATED! (Did not find correct endpoint format).');
            console.log('   Expected logic containing: /devices/${encodeURIComponent(deviceId)}/tasks');

            // Print the lines around rebootDevice to show what IS there
            const lines = content.split('\n');
            const idx = lines.findIndex(l => l.includes('async function rebootDevice'));
            if (idx !== -1) {
                console.log('   Actual Code on Disk:\n' + lines.slice(idx, idx + 8).join('\n'));
            }
        }
    } catch (e) {
        console.log('❌ Could not read lib/genieacs.js:', e.message);
    }

    console.log('\n--- 2. Testing Raw Fetch with CLEAN Payload ---');
    try {
        const url = `${GENIEACS_URL}/devices/${encodeURIComponent(DEVICE_ID)}/tasks`;
        console.log(`Target URL: ${url}`);

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'reboot' })
        });

        console.log(`Result: ${res.status} ${res.statusText}`);
        if (!res.ok) console.log('Response Body:', await res.text());

    } catch (e) {
        console.log('Fetch Error:', e.message);
    }
}

verifyAndTest();
