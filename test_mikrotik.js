
const { RouterOSAPI } = require('node-routeros');

async function main() {
    console.log('Testing Mikrotik Connection with Hardcoded Params:');
    
    const params = {
        host: '192.168.88.1',
        user: 'admin',
        password: 'password',
        port: 8728,
        timeout: 5
    };
    
    console.log('Target:', params.host);

    const client = new RouterOSAPI(params);

    try {
        await client.connect();
        console.log('✅ Connected successfully!');
        const secrets = await client.write('/ppp/secret/print');
        console.log(`Found ${secrets.length} secrets in Mikrotik.`);
        await client.close();
    } catch (e) {
        console.error('❌ Connection failed:', e.message);
    }
}

main();
