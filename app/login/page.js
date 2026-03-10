'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiClient } from '@/lib/apiClient';
import { User, Shield, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const [tab, setTab] = useState('customer'); // 'customer' | 'staff'
    const [customerId, setCustomerId] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { t } = useLanguage();

    const [logoUrl, setLogoUrl] = useState('/logo.png');

    useEffect(() => {
        fetch('/api/app-settings')
            .then(res => res.json())
            .then(data => {
                if (data.logoUrl) setLogoUrl(data.logoUrl);
            })
            .catch(() => {});
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // For customer tab: login with customerId as username
        const loginUsername = tab === 'customer' ? customerId : username;

        try {
            const res = await apiClient('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username: loginUsername, password }),
            });

            if (res.ok) {
                router.push('/');
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error || t('login.loginFailed'));
            }
        } catch (err) {
            setError(t('login.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (newTab) => {
        setTab(newTab);
        setError('');
        setPassword('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-black transition-colors p-4">
            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20 dark:border-white/10">

                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <img
                        src={logoUrl}
                        alt="Company Logo"
                        className="w-48 h-32 object-contain"
                    />
                </div>

                {/* Tabs */}
                <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-6 gap-1">
                    <button
                        type="button"
                        onClick={() => handleTabChange('customer')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                            tab === 'customer'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <User size={15} />
                        Pelanggan
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange('staff')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                            tab === 'staff'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <Shield size={15} />
                        Staff / Admin
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {tab === 'customer' ? (
                        <>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    ID Pelanggan
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: BRQ-0001"
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                    value={customerId}
                                    onChange={(e) => setCustomerId(e.target.value)}
                                />
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    ID Pelanggan tertera di invoice Anda
                                </p>
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Password PPPoE
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        placeholder="Password internet Anda"
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('login.username') || 'Username'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('login.password')}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-50/30 dark:bg-red-900/30 backdrop-blur-xl text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200/50 dark:border-red-800/50">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg font-medium"
                    >
                        {loading ? 'Memproses...' : t('login.loginButton')}
                    </button>
                </form>
            </div>
        </div>
    );
}
