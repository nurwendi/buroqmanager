'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiClient } from '@/lib/apiClient';
import { Eye, EyeOff, User, Lock, Loader2 } from 'lucide-react';

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
            className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-slate-950 transition-colors"
            style={loginBgUrl
                ? { backgroundImage: `url(${loginBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : {}
            }
        >
            {/* Animated Background Orbs for Premium Mesh Gradient Effect (only if no custom background image) */}
            {!loginBgUrl && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse duration-[6000ms]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse duration-[8000ms]" />
                    <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] rounded-full bg-violet-600/15 blur-[100px] animate-pulse duration-[7000ms]" />
                </div>
            )}

            {loginBgUrl && <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />}

            <div 
                className="relative z-10 w-full max-w-md bg-white/[0.04] dark:bg-slate-900/40 backdrop-blur-xl p-8 md:p-10 rounded-3xl border border-white/10 transition-all duration-300"
                style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="relative p-4 bg-white/5 rounded-2xl border border-white/5 mb-4 shadow-inner">
                        <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain max-w-[200px]" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight text-center">
                        Buroq Billing System
                    </h2>
                    <p className="text-sm text-slate-400 mt-1 text-center">
                        Masukkan akun Anda untuk melanjutkan
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Username / ID Pelanggan
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <User size={18} />
                            </span>
                            <input
                                type="text"
                                required
                                placeholder="Username atau ID Pelanggan"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-500 backdrop-blur-sm transition-all text-sm font-medium"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            {t('login.password')}
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <Lock size={18} />
                            </span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                placeholder="Masukkan password Anda"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-500 backdrop-blur-sm transition-all text-sm font-medium"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-500/10 text-red-200 rounded-2xl text-xs border border-red-500/20 backdrop-blur-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 px-4 rounded-2xl transition-all duration-200 disabled:opacity-50 shadow-lg shadow-blue-500/10 mt-6 tracking-wide text-sm active:scale-[0.99]"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Memproses...</span>
                            </>
                        ) : (
                            <span>{t('login.loginButton')}</span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

