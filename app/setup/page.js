'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Server, Save, CheckCircle2 } from 'lucide-react';

export default function SetupPage() {
    const [serverUrl, setServerUrl] = useState('http://103.150.33.187');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const router = useRouter();

    useEffect(() => {
        // Auto-configure and redirect immediately
        const defaultIp = 'http://103.150.33.187';
        localStorage.setItem('buroq_server_url', defaultIp);
        router.replace('/login');
    }, []);

    const testConnection = async (url) => {
        try {
            // Try to fetch a public endpoint or health check
            // We use standard fetch here because apiClient depends on the URL we are setting
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const cleanUrl = url.replace(/\/$/, '');
            const res = await fetch(`${cleanUrl}/api/health`, {
                method: 'HEAD',
                signal: controller.signal
            }).catch(() => {
                // If HEAD fails (Method Not Allowed), try GET root or login just to check connectivity
                return fetch(`${cleanUrl}/api/auth/login`, {
                    method: 'OPTIONS',
                    signal: controller.signal
                });
            });

            clearTimeout(timeoutId);
            return true; // For now assuming if we get any response (even 404/405/500) the server is reached. 
            // Ideally we want 200 OK.
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });

        let url = serverUrl.trim();
        if (!url.startsWith('http')) {
            url = `http://${url}`;
        }
        url = url.replace(/\/$/, '');

        // Test connection
        // const isConnected = await testConnection(url); 
        // Skipping strict test for now to allow flexible entry, but ideally we should verify.

        localStorage.setItem('buroq_server_url', url);
        setStatus({ type: 'success', message: 'Server URL saved!' });

        // Small delay then redirect
        setTimeout(() => {
            router.push('/login');
        }, 1000);

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                        <Server className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Connect to Server</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-center mt-2">
                        Configuring application...
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Server URL / IP Address
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                placeholder="http://192.168.1.100:3000"
                                value={serverUrl}
                                onChange={(e) => setServerUrl(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Example: 192.168.1.100, demo.example.com
                        </p>
                    </div>

                    {status.message && (
                        <div className={`p-4 rounded-lg flex items-center ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {status.type === 'success' && <CheckCircle2 className="w-5 h-5 mr-2" />}
                            {status.message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Connecting...' : 'Connect Server'}
                    </button>
                </form>
            </div>
        </div>
    );
}
