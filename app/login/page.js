'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiClient } from '@/lib/apiClient';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
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
            .then(data => { if (data.logoUrl) setLogoUrl(data.logoUrl); })
            .catch(() => {});
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
        } catch {
            setError(t('login.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-black transition-colors p-4">
            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-white/20 dark:border-white/10">

                <div className="flex justify-center mb-6">
                    <img src={logoUrl} alt="Logo" className="w-48 h-32 object-contain" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Username / ID Pelanggan
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Username atau ID Pelanggan"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('login.password')}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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

                    {error && (
                        <div className="p-3 bg-red-50/30 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200/50 dark:border-red-800/50">
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
