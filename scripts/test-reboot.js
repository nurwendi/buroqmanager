
const GENIEACS_URL = process.env.GENIEACS_API_URL || 'http://localhost:7557';
// Use the ID we found earlier or fetch one
const DEVICE_ID = process.argv[2] || '00259E-HG8245H-485754431BEEB933';

async function testReboot() {
    console.log(`\n🧪 Testing Reboot Task for Device: ${DEVICE_ID}`);
    console.log(`Target: ${GENIEACS_URL}`);

    const taskBody = {
        name: 'reboot',
        device: DEVICE_ID
    };

    // Test 1: POST /tasks (Standard)
    console.log('\n--- Test 1: POST /tasks ---');
    try {
        const res = await fetch(`${GENIEACS_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskBody)
        });
        console.log(`Status: ${res.status} ${res.statusText}`);
        console.log('Body:', await res.text());
    } catch (e) { console.error(e.message); }

    // Test 2: POST /tasks/{ID} (Current Code)
    console.log('\n--- Test 2: POST /tasks/ID (Current Code) ---');
    try {
        const res = await fetch(`${GENIEACS_URL}/tasks/${encodeURIComponent(DEVICE_ID)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskBody)
        });
        console.log(`Status: ${res.status} ${res.statusText}`);
        console.log('Body:', await res.text());
    } catch (e) { console.error(e.message); }

    // Test 3: POST /devices/{ID}/tasks
    console.log('\n--- Test 3: POST /devices/ID/tasks ---');
    try {
        const res = await fetch(`${GENIEACS_URL}/devices/${encodeURIComponent(DEVICE_ID)}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'reboot' })
        });
        console.log(`Status: ${res.status} ${res.statusText}`);
        console.log('Body:', await res.text());
    } catch (e) { console.error(e.message); }
}

testReboot();
