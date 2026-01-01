
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Use explicit package imports
import { PrismaClient } from '@prisma/client';
import { RouterOSAPI } from 'node-routeros';

// Polyfill __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manually
try {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, ...values] = line.split('=');
            if (key && values.length > 0) {
                const val = values.join('=').trim();
                process.env[key.trim()] = val.replace(/^["'](.+)["']$/, '$1');
            }
        });
    }
} catch (e) {
    console.warn("Could not load .env file", e);
}

// Instantiate Prisma
const prisma = new PrismaClient();

// Configuration Logic (Mirrors lib/config.js)
async function getConfig() {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'mikrotik_config' }
        });

        if (setting) {
            const config = JSON.parse(setting.value);
            if (!config.connections) config.connections = [];
            return config;
        }
    } catch (error) {
        console.error('Error reading config:', error);
    }
    return { connections: [], activeConnectionId: null };
}

// Mikrotik Logic (Simplified from lib/mikrotik.js)
async function getMikrotikClient() {
    // 1. Get Config
    const config = await getConfig();
    const connectionId = config.activeConnectionId;
    const activeConnection = config.connections?.find(c => c.id === connectionId);

    // 2. Get Credentials
    const host = activeConnection?.host || process.env.MIKROTIK_HOST;
    const user = activeConnection?.user || process.env.MIKROTIK_USER;
    const password = activeConnection?.password || process.env.MIKROTIK_PASSWORD;
    const port = activeConnection?.port || process.env.MIKROTIK_PORT || 8728;

    if (!host || !user || !password) {
        throw new Error("Mikrotik credentials not configured");
    }

    // 3. Connect (No pooling for simplicity in this standalone script, or add basic caching if needed)
    // For low traffic isolation page, per-request connection is acceptable but caching is better.
    // Let's implement basic caching.

    if (global.cachedClient && global.cachedClient.connected) {
        return global.cachedClient;
    }

    const client = new RouterOSAPI({
        host,
        user,
        password,
        port: parseInt(port),
        timeout: 10,
    });

    try {
        await client.connect();
        global.cachedClient = client;
        return client;
    } catch (e) {
        console.error("Failed to connect to Mikrotik:", e.message);
        throw e;
    }
}

const PORT = 1500;
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // API Routes
    if (pathname === '/api/isolir/contact') {
        try {
            const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
            const data = await getContactInfo(clientIp);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        } catch (error) {
            console.error(error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
        return;
    }

    // Serve Static Files
    if (pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js)$/)) {
        const filePath = path.join(PUBLIC_DIR, pathname);
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath);
            const content = fs.readFileSync(filePath);
            const contentType = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.css': 'text/css',
                '.js': 'text/javascript',
                '.svg': 'image/svg+xml'
            }[ext] || 'application/octet-stream';

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
            return;
        }
    }

    // Default: Serve isolir.html
    const htmlPath = path.join(PUBLIC_DIR, 'isolir.html');
    if (fs.existsSync(htmlPath)) {
        let html = fs.readFileSync(htmlPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    } else {
        res.writeHead(404);
        res.end('Isolir page not found.');
    }
});

async function getContactInfo(clientIp) {
    if (!clientIp) return { phone: '628123456789', name: 'Admin', role: 'Default' };

    let pppoeUsername = null;
    let contactNumber = '';
    let contactName = 'Admin';
    let contactRole = 'Default';

    try {
        const client = await getMikrotikClient();
        const cleanIp = clientIp.replace('::ffff:', '');

        const activeConnections = await client.write('/ppp/active/print', [
            '?address=' + cleanIp
        ]);

        if (activeConnections && activeConnections.length > 0) {
            pppoeUsername = activeConnections[0].name;
        }
    } catch (e) {
        console.error("Mikrotik lookup error:", e.message);
    }

    if (pppoeUsername) {
        const customer = await prisma.customer.findUnique({
            where: { username: pppoeUsername },
            include: { agent: true, technician: true }
        });

        if (customer) {
            if (customer.agent && customer.agent.phone) {
                contactNumber = customer.agent.phone;
                contactName = customer.agent.fullName || customer.agent.username;
                contactRole = 'Agen';
            } else if (customer.technician && customer.technician.phone) {
                contactNumber = customer.technician.phone;
                contactName = customer.technician.fullName || customer.technician.username;
                contactRole = 'Teknisi';
            }
        }
    }

    // Fallbacks
    if (!contactNumber) {
        const editor = await prisma.user.findFirst({ where: { role: 'editor' } });
        if (editor?.phone) {
            contactNumber = editor.phone;
            contactName = editor.fullName || editor.username;
            contactRole = 'Admin';
        } else {
            const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
            if (admin?.phone) {
                contactNumber = admin.phone;
                contactName = admin.fullName || admin.username;
                contactRole = 'Admin';
            }
        }
    }

    if (!contactNumber) contactNumber = '628123456789';

    // Format phone
    let p = contactNumber.replace(/\D/g, '');
    if (p.startsWith('0')) p = '62' + p.substring(1);

    return {
        phone: p,
        name: contactName,
        role: contactRole,
        ip: clientIp,
        user: pppoeUsername
    };
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Isolir Server running at http://0.0.0.0:${PORT}`);
});
