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
    const [loginBgUrl, setLoginBgUrl] = useState('');

    useEffect(() => {
        fetch('/api/app-settings')
            .then(res => res.json())
            .then(data => {
                if (data.logoUrl) setLogoUrl(data.logoUrl);
                if (data.loginBgUrl) setLoginBgUrl(data.loginBgUrl);
            })
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
        <div
            className="relative min-h-screen flex items-center justify-center transition-colors p-4"
            style={loginBgUrl
                ? { backgroundImage: `url(${loginBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)' }
            }
        >
            {loginBgUrl && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />}
            <div className="relative z-10 bg-white/10 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-white/20" style={{boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'}}>

                <div className="flex justify-center mb-6">
                    <img src={logoUrl} alt="Logo" className="w-48 h-32 object-contain" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-white drop-shadow mb-1">
                            Username / ID Pelanggan
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Username atau ID Pelanggan"
                            className="w-full bg-white/10 border border-white/25 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/50 backdrop-blur-sm transition-all"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-white drop-shadow mb-1">
                            {t('login.password')}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                className="w-full bg-white/10 border border-white/25 rounded-xl px-4 py-3 pr-11 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 text-white placeholder-white/50 backdrop-blur-sm transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/20 text-red-100 rounded-xl text-sm border border-red-400/30 backdrop-blur-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 rounded-xl border border-white/30 hover:border-white/50 transition-all disabled:opacity-50 shadow-lg backdrop-blur-sm mt-2 tracking-wide"
                    >
                        {loading ? 'Memproses...' : t('login.loginButton')}
                    </button>
                </form>
            </div>
        </div>
    );
}
