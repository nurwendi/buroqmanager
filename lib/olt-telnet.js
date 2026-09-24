import { Telnet } from 'telnet-client';

// OLT Configuration (hardcoded for now, bisa dipindah ke database atau env variables)
const OLT_CONFIG = {
    'olt1': {
        host: '192.168.220.22', // gunakan ip olt sesuaikan
        port: 23,
        username: 'zte',        // gunakan username
        password: 'zte',        // gunakan pass
        timeout: 10000,
        loginPrompt: /Username:/i,
        passwordPrompt: /Password:/i,
        shellPrompt: /(?:>|#)/,
        pageSeparator: /--More--/
    }
};

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
            // Abaikan
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

        await connection.end();
        return { success: true, results, combinedOutput };

    } catch (error) {
        console.error('Telnet connection error:', error);
        throw error;
    }
}
