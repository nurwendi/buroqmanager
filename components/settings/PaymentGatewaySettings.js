'use client';

import { useState, useEffect } from 'react';
import { Save, Lock, CreditCard, RefreshCw } from 'lucide-react';

export default function PaymentGatewaySettings() {
    const [config, setConfig] = useState({
        provider: 'midtrans',
        merchantId: '',
        clientKey: '',
        serverKey: '',
        isSandbox: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/settings/payment-gateway');
            if (res.ok) {
                const data = await res.json();
                if (data.config) {
                    setConfig(prev => ({
                        ...prev,
                        ...data.config,
                        // If keys are masked, we keep them as is. Backend handles '***************' check on save usually, 
                        // or we just don't send them back if unchanged. 
                        // For simplicity in this edit, we assume basic behavior.
                    }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch gateway config', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/settings/payment-gateway', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Gateway settings saved successfully!' });
                fetchConfig(); // Refresh to ensure correct state
            } else {
                setMessage({ type: 'error', text: 'Failed to save settings' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error saving settings' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

    return (
        <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
            <div className="flex items-center gap-3 mb-6">
                <CreditCard className="text-pink-600 dark:text-pink-400" size={24} />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Payment Gateway Integration</h2>
            </div>

            {message.text && (
                <div className={`p-4 mb-6 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">

                {/* Provider Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Provider</label>
                    <select
                        value={config.provider}
                        onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="midtrans">Midtrans (GoPay, VA, QRIS)</option>
                        {/* <option value="xendit">Xendit (Coming Soon)</option> */}
                    </select>
                </div>

                {/* Mode Selection */}
                <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.isSandbox}
                            onChange={(e) => setConfig({ ...config, isSandbox: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">Sandbox Mode (Testing)</span>
                    </label>
                </div>

                {/* Credentials */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Merchant ID</label>
                        <input
                            type="text"
                            value={config.merchantId || ''}
                            onChange={(e) => setConfig({ ...config, merchantId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="G-12345678"
                        />
                    </div>
                    <div>
                        {/* Spacer */}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client Key</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                value={config.clientKey || ''}
                                onChange={(e) => setConfig({ ...config, clientKey: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                                placeholder="SB-Mid-client-..."
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Server Key</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="password"
                                value={config.serverKey || ''}
                                onChange={(e) => setConfig({ ...config, serverKey: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                                placeholder="SB-Mid-server-..."
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-all shadow-md"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                    <p className="mt-2 text-xs text-gray-500">
                        Changes to keys will take effect immediately for new transactions.
                    </p>
                </div>

            </form>
        </div>
    );
}
