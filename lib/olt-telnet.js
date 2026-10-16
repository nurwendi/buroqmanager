import { Telnet } from 'telnet-client';

// OLT Configuration (dapat dikonfigurasi via file .env atau fallback default)
const OLT_CONFIG = {
    'olt1': {
        host: process.env.OLT_HOST || '192.168.220.22',
        port: parseInt(process.env.OLT_PORT || '23'),
        username: process.env.OLT_USER || 'zte',
        password: process.env.OLT_PASSWORD || 'zte',
        timeout: 10000,
        loginPrompt: /Username:/i,
        passwordPrompt: /Password:/i,
        shellPrompt: /(?:>|#)/,
        pageSeparator: /--More--/
    }
};

/**
 * Sanitasi string input agar tidak bisa menyisipkan command injection Telnet (misal karakter \r, \n, ;)
 */
export function sanitizeOltInput(val) {
    if (val === null || val === undefined) return '';
    return String(val).replace(/[\r\n;]/g, '').trim();
}

export async function executeOltCommands(oltKey, commands) {
    const config = OLT_CONFIG[oltKey];
    if (!config) {
        throw new Error(`OLT configuration for key '${oltKey}' not found.`);
    }

    const connection = new Telnet();
    const params = {
        host: config.host,
        port: config.port,
        shellPrompt: config.shellPrompt,
        timeout: config.timeout,
        loginPrompt: config.loginPrompt,
        passwordPrompt: config.passwordPrompt,
        username: config.username,
        password: config.password,
        pageSeparator: config.pageSeparator,
        execTimeout: 10000,
        sendTimeout: 2000,
        maxBufferLength: 5000000,
        stripControlCharacters: true
    };

    try {
        await connection.connect(params);
        
        // Masuk ke mode enable
        try {
            await connection.exec('enable');
        } catch (e) {
            // Abaikan jika sudah enable
        }

        const results = [];
        let combinedOutput = '';

        for (const cmd of commands) {
            try {
                const res = await connection.exec(cmd);
                results.push({ command: cmd, output: res });
                combinedOutput += res + '\n';
            } catch (cmdError) {
                console.error(`Error executing command ${cmd}:`, cmdError);
                results.push({ command: cmd, error: cmdError.message });
            }
        }

        return { success: true, results, combinedOutput };

    } catch (error) {
        console.error('Telnet connection error:', error);
        throw error;
    } finally {
        try {
            await connection.end();
        } catch (closeErr) {
            try { connection.destroy(); } catch (_) {}
        }
    }
}
