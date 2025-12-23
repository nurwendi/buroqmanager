const { RouterOSAPI } = require("node-routeros");
const fs = require('fs');
const path = require('path');

// Load env vars crudely
const env = {};
try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (key && val) env[key.trim()] = val.trim();
        });
    }
} catch (e) { }

async function main() {
    const username = '8*06TukirPoko/kr';
    const host = '103.150.33.187';
    const user = 'hudi';
    const password = '32326655';
    const port = 48721;

    console.log(`[Debug] Connecting to ${host}:${port} as ${user}...`);

    const client = new RouterOSAPI({
        host,
        user,
        password,
        port: parseInt(port),
        timeout: 10
    });

    try {
        await client.connect();
        console.log('[Debug] Connected!');

        console.log(`[Debug] Searching for user: ${username}`);

        // 1. Exact Match
        try {
            const active = await client.write('/ppp/active/print', [`?name=${username}`]);
            console.log(`[Debug] Exact active sessions found: ${active.length}`);
            if (active.length > 0) console.log(active[0]);
        } catch (e) { console.error('Exact query failed', e); }

        // 2. Scan All
        try {
            console.log('[Debug] Scaning all active sessions...');
            const all = await client.write('/ppp/active/print');
            console.log(`[Debug] Total active sessions: ${all.length}`);

            const match = all.find(s => s.name === username);
            if (match) {
                console.log('[Debug] Manual scan FOUND user:', match);
            } else {
                console.log('[Debug] Manual scan NOT FOUND.');
                const partial = all.filter(s => s.name.includes('*') || s.name.includes('Tukir'));
                if (partial.length > 0) {
                    console.log('[Debug] Users with special chars or "Tukir":', partial.map(s => s.name));
                }
            }
        } catch (e) { console.error('Scan failed', e); }

        client.close();

    } catch (error) {
        console.error('Connection/Auth failed:', error);
    }
}

main();
