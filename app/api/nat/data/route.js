import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import { verifyToken } from '@/lib/security';
import { getConfig } from '@/lib/config';

async function getCurrentUser(request) {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    return await verifyToken(token);
}

async function fetchWithTimeout(promise, ms = 4000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
}

export async function GET(request) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only superadmins and admins can access NAT data
        if (currentUser.role !== 'superadmin' && currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const config = await getConfig();
        const targetConnections = (config.connections || []).filter(c => c && c.id && c.host);

        const natData = await Promise.all(targetConnections.map(async (conn) => {
            const result = {
                id: conn.id,
                name: conn.name || conn.host,
                host: conn.host,
                identity: conn.name || conn.host,
                status: 'offline',
                natRules: [],
                interfaces: [],
                resources: null,
                firewallStats: { nat: 0, filter: 0, mangle: 0 },
                ipAddresses: [],
                arpTable: [],
            };

            try {
                const client = await fetchWithTimeout(getMikrotikClient(conn.id));

                // Identity
                try {
                    const identityRes = await fetchWithTimeout(client.write('/system/identity/print'));
                    result.identity = identityRes[0]?.name || conn.name || conn.host;
                } catch {}

                // System resources
                try {
                    const res = await fetchWithTimeout(client.write('/system/resource/print'));
                    const r = res[0] || {};
                    result.resources = {
                        cpuLoad: parseInt(r['cpu-load']) || 0,
                        memoryUsed: parseInt(r['total-memory']) - parseInt(r['free-memory']) || 0,
                        memoryTotal: parseInt(r['total-memory']) || 0,
                        uptime: r.uptime || 'N/A',
                        version: r.version || 'N/A',
                        boardName: r['board-name'] || 'N/A',
                        architecture: r['architecture-name'] || 'N/A',
                    };
                } catch {}

                // NAT Rules
                try {
                    const nat = await fetchWithTimeout(client.write('/ip/firewall/nat/print'));
                    result.natRules = nat.map(rule => ({
                        id: rule['.id'],
                        chain: rule.chain,
                        action: rule.action,
                        srcAddress: rule['src-address'] || '',
                        dstAddress: rule['dst-address'] || '',
                        toAddresses: rule['to-addresses'] || '',
                        toPorts: rule['to-ports'] || '',
                        protocol: rule.protocol || 'any',
                        dstPort: rule['dst-port'] || '',
                        outInterface: rule['out-interface'] || '',
                        inInterface: rule['in-interface'] || '',
                        bytes: parseInt(rule.bytes) || 0,
                        packets: parseInt(rule.packets) || 0,
                        disabled: rule.disabled === 'true',
                        comment: rule.comment || '',
                    }));
                    result.firewallStats.nat = result.natRules.length;
                } catch {}

                // Interfaces
                try {
                    const ifaces = await fetchWithTimeout(client.write('/interface/print'));
                    result.interfaces = ifaces.map(iface => ({
                        name: iface.name,
                        type: iface.type,
                        running: iface.running === 'true',
                        disabled: iface.disabled === 'true',
                        macAddress: iface['mac-address'] || '',
                        txBytes: parseInt(iface['tx-byte']) || 0,
                        rxBytes: parseInt(iface['rx-byte']) || 0,
                        txRate: parseInt(iface['tx-bits-per-second']) || 0,
                        rxRate: parseInt(iface['rx-bits-per-second']) || 0,
                        comment: iface.comment || '',
                    }));
                } catch {}

                // IP Addresses
                try {
                    const ips = await fetchWithTimeout(client.write('/ip/address/print'));
                    result.ipAddresses = ips.map(ip => ({
                        address: ip.address,
                        network: ip.network,
                        interface: ip.interface,
                        disabled: ip.disabled === 'true',
                    }));
                } catch {}

                // Firewall filter count
                try {
                    const filter = await fetchWithTimeout(client.write('/ip/firewall/filter/print'));
                    result.firewallStats.filter = filter.length;
                } catch {}

                // Firewall mangle count
                try {
                    const mangle = await fetchWithTimeout(client.write('/ip/firewall/mangle/print'));
                    result.firewallStats.mangle = mangle.length;
                } catch {}

                result.status = 'online';
            } catch (error) {
                console.error(`[NAT API] Error fetching data from router ${conn.host}:`, error.message);
                result.status = 'offline';
                result.error = error.message;
            }

            return result;
        }));

        return NextResponse.json({ routers: natData });
    } catch (error) {
        console.error('[NAT API] Fatal error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
