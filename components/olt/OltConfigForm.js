'use client';

import { useState, useEffect } from 'react';
import { Save, Lock, Server, Globe } from 'lucide-react';
import { toast } from 'sonner';

export default function OltConfigForm() {
    const [config, setConfig] = useState({
        host: '',
        port: 23,
        username: '',
        password: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/settings/olt')
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    setConfig({
                        host: data.host || '',
                        port: data.port || 23,
                        username: data.username || '',
                        password: data.password || ''
                    });
                }
            })
            .catch(err => toast.error('Failed to load settings'))
            .finally(() => setLoading(false));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch('/api/settings/olt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (!res.ok) throw new Error('Failed to save');

            toast.success('OLT Configuration Saved');

            // Reload page to refresh connection pool with new settings
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 h-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400">
                    <Globe size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Connection Settings</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Configure OLT Access</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Host / IP Address</label>
                    <div className="relative">
                        <Server className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            name="host"
                            value={config.host}
                            onChange={handleChange}
                            placeholder="192.168.1.1"
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Telnet Port</label>
                    <input
                        type="number"
                        name="port"
                        value={config.port}
                        onChange={handleChange}
                        placeholder="23"
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                    <input
                        type="text"
                        name="username"
                        value={config.username}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input
                            type="password"
                            name="password"
                            value={config.password}
                            onChange={handleChange}
                            placeholder={config.password === '********' ? '********' : 'Enter password'}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="w-full mt-6 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl transition-all disabled:opacity-50 font-medium shadow-lg shadow-blue-500/20"
                >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </form>
        </div>
    );
}
