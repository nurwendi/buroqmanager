'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Phone, AlertTriangle, Loader2 } from 'lucide-react';

export default function IsolirPage() {
    const [contact, setContact] = useState(null);
    const [settings, setSettings] = useState({ logoUrl: '/logo.png', appName: 'Buroq Billing', loginBgUrl: '', loginBgUseBing: false });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/isolir/contact').then(res => res.json()).catch(() => null),
            fetch('/api/app-settings').then(res => res.json()).catch(() => null)
        ])
            .then(([contactData, settingsData]) => {
                if (contactData) setContact(contactData);
                if (settingsData && !settingsData.error) {
                    setSettings(prev => ({
                        ...prev,
                        ...settingsData,
                        logoUrl: settingsData.logoUrl || '/logo.png'
                    }));
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch data", err);
                setLoading(false);
            });
    }, []);

    let bgUrl = '';
    if (settings.loginBgUseBing) {
        bgUrl = '/api/bing-wallpaper';
    } else if (settings.loginBgUrl) {
        bgUrl = settings.loginBgUrl;
    }

    const targetName = contact?.name || (contact?.role ? contact.role : 'Admin');
    const defaultMsg = encodeURIComponent(`Halo ${targetName}, layanan internet saya (${contact?.user || contact?.ip || 'pelanggan'}) terisolir. Mohon info rincian tagihan.`);
    const whatsappLink = contact?.phone
        ? `https://wa.me/${contact.phone}?text=${defaultMsg}`
        : 'https://wa.me/628123456789';

    return (
        <div
            className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-slate-950 transition-colors"
            style={bgUrl ? { backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
            {/* Ambient Background Glowing Orbs for Modern Mesh Glow */}
            {!bgUrl && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-red-600/20 blur-[130px] animate-pulse duration-[6000ms]" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-orange-600/20 blur-[130px] animate-pulse duration-[8000ms]" />
                    <div className="absolute top-[40%] right-[20%] w-[35vw] h-[35vw] rounded-full bg-indigo-600/15 blur-[100px] animate-pulse duration-[7000ms]" />
                </div>
            )}

            {bgUrl && <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[6px]" />}

            {/* Glassmorphic Container Card */}
            <div
                className="relative z-10 w-full max-w-md bg-white/[0.05] dark:bg-slate-900/40 backdrop-blur-2xl p-7 md:p-9 rounded-[28px] border border-white/10 text-center transition-all duration-300 shadow-2xl"
                style={{
                    boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                }}
            >
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={settings.logoUrl}
                        alt={settings.appName || "Logo"}
                        className="h-14 w-auto object-contain max-w-[180px] drop-shadow-md"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                </div>

                {/* Animated Status Icon */}
                <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-red-500/20 border border-red-500/40 animate-ping opacity-30" />
                    <div className="relative w-20 h-20 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.3)]">
                        <WifiOff size={38} className="text-red-400" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
                    Layanan Terisolir
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                    Mohon maaf, layanan internet Anda dinonaktifkan sementara karena ada tagihan yang belum terselesaikan.
                </p>

                {contact?.user && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 mb-5">
                        <span>ID / User:</span>
                        <span className="font-semibold text-slate-200">{contact.user}</span>
                    </div>
                )}

                {/* Alert Warning Box */}
                <div className="bg-orange-500/10 border border-orange-500/25 rounded-2xl p-4 mb-6 text-left flex items-start gap-3">
                    <AlertTriangle className="text-orange-400 shrink-0 mt-0.5" size={18} />
                    <div>
                        <h3 className="font-semibold text-orange-300 text-xs uppercase tracking-wider">Aktivasi Otomatis</h3>
                        <p className="text-xs text-orange-200/90 mt-0.5 leading-relaxed">
                            Setelah konfirmasi atau pembayaran tagihan diverifikasi, koneksi internet Anda akan pulih secara otomatis.
                        </p>
                    </div>
                </div>

                {/* WhatsApp Action Button */}
                <div className="space-y-3">
                    <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white py-3.5 px-5 rounded-2xl font-semibold flex items-center justify-center gap-2.5 transition-all shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_15px_30px_-5px_rgba(16,185,129,0.55)] hover:-translate-y-0.5 border border-white/15"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Phone size={20} />}
                        <span className="text-sm">
                            {loading ? 'Memuat Kontak Bantuan...' : `Hubungi ${targetName} via WhatsApp`}
                        </span>
                    </a>

                    <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
                        Sudah menyelesaikan tagihan? Silakan <strong>restart modem / router</strong> Anda untuk memulihkan koneksi.
                    </p>
                </div>
            </div>
        </div>
    );
}
