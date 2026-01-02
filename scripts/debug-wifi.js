
const { getDevice, setParameter } = require('../lib/genieacs');
const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '../.env') }); 
// Note: In Next.js environement .env might be loaded differently, but for raw node script we might need dotenv if env vars are critical.
// Since lib/genieacs.js uses process.env, we really should verify they are present.

const DEVICE_ID = process.argv[2] || '00259E-HG8245H-485754431BEEB933';

async function testWifi() {
    console.log(`Testing Device: ${DEVICE_ID}`);

    // 1. Test getDevice
    try {
        console.log('--- 1. Testing getDevice ---');
        const device = await getDevice(DEVICE_ID);
        console.log('✅ getDevice SUCCESS');

        // Check paths
        if (device.InternetGatewayDevice) console.log('   Has InternetGatewayDevice (TR-098)');
        if (device.Device) console.log('   Has Device (TR-181)');
    } catch (e) {
        console.log('❌ getDevice FAILED:', e.message);
    }

    // 2. Test setParameter
    try {
        console.log('\n--- 2. Testing setParameter (Fake SSID) ---');
        const res = await setParameter(DEVICE_ID, 'VirtualParameters.test', 'debug_value');
        console.log('✅ setParameter SUCCESS:', res);
    } catch (e) {
        console.log('❌ setParameter FAILED:', e.message);
        console.log('   (If this is 405, the endpoint is wrong)');
    }
}

testWifi();
