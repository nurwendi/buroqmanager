'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import NativeBridge from '@/components/NativeBridge';
import { apiClient } from '@/lib/apiClient';



export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { t } = useLanguage();

    const [logoUrl, setLogoUrl] = useState('/logo.png');

    useEffect(() => {
        // Mobile: Auto-configure default server if not set
        import('@/lib/isMobile').then(({ isMobileApp }) => {
            if (isMobileApp() && !localStorage.getItem('buroq_server_url')) {
                localStorage.setItem('buroq_server_url', 'http://103.150.33.187');
                // Ensure page reloads or context updates if needed (for now, just setting it is enough for next fetch)
                // Optional: router.refresh() if needed, but apiClient reads localstorage on every call
            }
        });

        fetch('/api/app-settings')
            .then(res => res.json())
            .then(data => {
                if (data.logoUrl) setLogoUrl(data.logoUrl);
            })
            .catch(err => console.error('Failed to load logo', err));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await apiClient('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });

            if (res.ok) {
                router.push('/');
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error || t('login.loginFailed'));
            }
        } catch (err) {
            setError('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-black transition-colors">
            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-96 border border-white/20 dark:border-white/10">

                <div className="flex justify-center mb-2">
                    <img
                        src={logoUrl}
                        alt="Company Logo"
                        className="w-64 h-40 object-contain"
                    />
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('login.username')} / Customer ID</label>
                        <input
                            type="text"
                            required
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('login.password')}</label>
                        <input
                            type="password"
                            required
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50/30 dark:bg-red-900/30 backdrop-blur-xl text-red-700 dark:text-red-300 rounded-md text-sm border border-red-200/50 dark:border-red-800/50 shadow-lg">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg"
                    >
                        {loading ? t('common.loading') : t('login.loginButton')}
                    </button>

                    <NativeBridge onBiometricSuccess={() => {
                        // TODO: Auto-login logic would go here
                        // For now, let user know it worked
                    }} />
                </form>
            </div>
        </div>
    );
}
