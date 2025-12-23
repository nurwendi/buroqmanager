import mikrotik from './lib/mikrotik.js';
const { getMikrotikClient } = mikrotik;
import fs from 'fs';
import path from 'path';

// Load .env manually
try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (key && val) process.env[key.trim()] = val.trim();
        });
    }
} catch (e) { console.error('Error loading .env', e); }

async function main() {
    const username = '8*06TukirPoko/kr';
    console.log(`[Debug] Checking active status for: ${username}`);

    try {
        const client = await getMikrotikClient();
        console.log('[Debug] Connected to Mikrotik');

        // 1. Try exact match query
        console.log('[Debug] Attempting ?name= query...');
        const activeExact = await client.write('/ppp/active/print', [
            `?name=${username}`
        ]);
        console.log(`[Debug] Exact match result count: ${activeExact.length}`);
        if (activeExact.length > 0) {
            console.log('[Debug] Exact match data:', activeExact[0]);
        } else {
            console.log('[Debug] Exact match return EMPTY array.');
        }

        // 2. Try fetching ALL and filtering manually (fallback check)
        console.log('[Debug] Attempting fetch all and filter...');
        const allActive = await client.write('/ppp/active/print');
        console.log(`[Debug] Total active sessions: ${allActive.length}`);

        // Manual filter
        const manualMatch = allActive.find(s => s.name === username);
        if (manualMatch) {
            console.log('[Debug] Manual match FOUND:', manualMatch);
        } else {
            console.log('[Debug] Manual match NOT FOUND.');
            const similar = allActive.filter(s => s.name && s.name.includes('Tukir'));
            if (similar.length > 0) {
                console.log('[Debug] Found similar names:', similar.map(s => s.name));
            }
        }

        client.close();

    } catch (error) {
        console.error('[Debug] Error:', error);
    }
}

main();
