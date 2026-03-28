const { RouterOSAPI } = require('node-routeros');
const dotenv = require('dotenv');
dotenv.config();

const client = new RouterOSAPI({
    host: process.env.MIKROTIK_HOST,
    user: process.env.MIKROTIK_USER,
    password: process.env.MIKROTIK_PASSWORD,
    port: parseInt(process.env.MIKROTIK_PORT || 8728),
    timeout: 10,
});

async function run() {
    try {
        await client.connect();
        const secrets = await client.write('/ppp/secret/print');
        console.log('--- MIKROTIK SECRETS ---');
        secrets.forEach(s => {
            console.log(`User: ${s.name}, Comment: ${s.comment}`);
        });
        await client.close();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

run();
