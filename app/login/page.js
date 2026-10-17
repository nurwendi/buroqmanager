'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiClient } from '@/lib/apiClient';
import { Eye, EyeOff, User, Lock, Loader2, Mail, Phone, MapPin, CreditCard, CheckCircle, Navigation, ArrowLeft, ShieldCheck } from 'lucide-react';

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

    // First-Time Activation State
    const [activationStep, setActivationStep] = useState(false);
    const [activationSuccess, setActivationSuccess] = useState('');
    const [activationToken, setActivationToken] = useState('');
    const [staffList, setStaffList] = useState([]);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [activationForm, setActivationForm] = useState({
        customerId: '',
        name: '',
        email: '',
        phone: '',
        identityNumber: '',
        address: '',
        coordinates: '',
        comment: '',
        staffCode: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Real-time lookup for the entered Staff ID (Sales / Teknisi)
    const matchedStaff = activationForm.staffCode.trim()
        ? staffList.find(s =>
            (s.agentNumber && s.agentNumber.toLowerCase() === activationForm.staffCode.trim().toLowerCase()) ||
            (s.username && s.username.toLowerCase() === activationForm.staffCode.trim().toLowerCase()) ||
            s.id === activationForm.staffCode.trim()
        )
        : null;

    useEffect(() => {
        fetch('/api/app-settings')
            .then(res => res.json())
            .then(data => {
                if (data.logoUrl) setLogoUrl(data.logoUrl);
                if (data.loginBgUseBing) {
                    setLoginBgUrl('/api/bing-wallpaper');
                } else if (data.loginBgUrl) {
                    setLoginBgUrl(data.loginBgUrl);
                }
            })
            .catch(() => {});
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setActivationSuccess('');
        try {
            const res = await apiClient('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();

            if (res.ok && data.needsActivation) {
                setActivationToken(data.activationToken);
                const list = data.staffList || [];
                setStaffList(list);
                setActivationForm({
                    customerId: data.customer?.customerId || username,
                    name: data.customer?.name || '',
                    email: data.customer?.email || '',
                    phone: data.customer?.phone || '',
                    identityNumber: data.customer?.identityNumber || '',
                    address: data.customer?.address || '',
                    coordinates: data.customer?.coordinates || '',
                    comment: data.customer?.comment || '',
                    staffCode: data.customer?.staffCode || (list.length === 1 ? (list[0].agentNumber || list[0].username) : ''),
                    newPassword: '',
                    confirmPassword: ''
                });
                setActivationStep(true);
                return;
            }

            if (res.ok && data.success) {
                router.push('/');
                router.refresh();
            } else {
                setError(data.message || data.error || t('login.loginFailed'));
            }
        } catch {
            setError(t('login.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleGetCoordinates = () => {
        if (!navigator.geolocation) {
            setError('Browser Anda tidak mendukung fitur lokasi GPS.');
            return;
        }
        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
                setActivationForm(prev => ({ ...prev, coordinates: coords }));
                setGettingLocation(false);
            },
            () => {
                setError('Gagal mengambil lokasi GPS. Pastikan izin lokasi diaktifkan.');
                setGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleActivationSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!activationForm.staffCode || !activationForm.staffCode.trim()) {
            setError('ID Petugas (Sales / Teknisi) wajib diisi dan tidak boleh kosong.');
            return;
        }
        if (staffList.length > 0 && !matchedStaff) {
            setError(`ID Petugas "${activationForm.staffCode.trim()}" tidak ditemukan! Pastikan 5 digit ID Petugas (Sales / Teknisi) sudah benar.`);
            return;
        }
        if (activationForm.newPassword.trim().toLowerCase() === 'buroq') {
            setError('Password baru wajib diganti dan tidak boleh menggunakan "buroq".');
            return;
        }
        if (activationForm.newPassword.length < 4) {
            setError('Password baru minimal 4 karakter.');
            return;
        }
        if (activationForm.newPassword !== activationForm.confirmPassword) {
            setError('Konfirmasi password baru tidak cocok.');
            return;
        }

        setLoading(true);
        try {
            const res = await apiClient('/api/auth/activate', {
                method: 'POST',
                body: JSON.stringify({
                    activationToken,
                    name: activationForm.name,
                    email: activationForm.email,
                    phone: activationForm.phone,
                    identityNumber: activationForm.identityNumber,
                    address: activationForm.address,
                    coordinates: activationForm.coordinates,
                    comment: activationForm.comment,
                    staffCode: activationForm.staffCode.trim(),
                    newPassword: activationForm.newPassword
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setActivationSuccess(data.message);
                setActivationStep(false);
                setPassword('');
            } else {
                setError(data.error || 'Gagal mengirim data aktivasi.');
            }
        } catch {
            setError('Terjadi kesalahan saat mengirim pengajuan aktivasi.');
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
                className={`relative z-10 w-full ${activationStep ? 'max-w-xl' : 'max-w-md'} bg-white/[0.04] dark:bg-slate-900/40 backdrop-blur-xl p-6 md:p-9 rounded-3xl border border-white/10 transition-all duration-300 max-h-[92vh] overflow-y-auto`}
                style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
            >
                <div className="flex justify-center mb-6">
                    <img src={logoUrl} alt="Logo" className="h-14 w-auto object-contain max-w-[180px]" />
                </div>

                {!activationStep ? (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                Nomor Pelanggan / Email
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <User size={18} />
                                </span>
                                <input
                                    type="text"
                                    required
                                    placeholder="Nomor Pelanggan, Email, atau ID Staf"
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

                        {activationSuccess && (
                            <div className="p-4 bg-emerald-500/15 text-emerald-200 rounded-2xl text-xs border border-emerald-500/30 backdrop-blur-sm flex items-start gap-2.5">
                                <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span>{activationSuccess}</span>
                            </div>
                        )}

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
                ) : (
                    <form onSubmit={handleActivationSubmit} className="space-y-4">
                        <div className="text-center mb-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold mb-2">
                                <ShieldCheck size={14} /> Aktivasi Login Pertama Kali
                            </div>
                            <h2 className="text-lg font-bold text-white">Lengkapi Identitas & Ganti Password</h2>
                            <p className="text-xs text-slate-400 mt-1">
                                Demi keamanan akun <span className="text-blue-400 font-semibold">{activationForm.customerId}</span>, silakan lengkapi identitas Anda, masukkan ID Petugas, dan ganti password default.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                    Nomor Pelanggan
                                </label>
                                <input
                                    type="text"
                                    value={activationForm.customerId}
                                    readOnly
                                    disabled
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-slate-400 text-sm cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                    Nama Lengkap <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nama sesuai KTP"
                                        value={activationForm.name}
                                        onChange={(e) => setActivationForm({ ...activationForm, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                    Alamat Email <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="nama@email.com"
                                        value={activationForm.email}
                                        onChange={(e) => setActivationForm({ ...activationForm, email: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                    No. HP / WhatsApp <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="tel"
                                        required
                                        placeholder="0812xxxxxxxx"
                                        value={activationForm.phone}
                                        onChange={(e) => setActivationForm({ ...activationForm, phone: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                    Nomor Identitas (NIK KTP)
                                </label>
                                <div className="relative">
                                    <CreditCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="16 digit NIK KTP"
                                        value={activationForm.identityNumber}
                                        onChange={(e) => setActivationForm({ ...activationForm, identityNumber: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                    Alamat Lengkap Pemasangan <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    required
                                    rows="2"
                                    placeholder="Jl. Contoh No. 12, RT/RW, Kelurahan, Kecamatan"
                                    value={activationForm.address}
                                    onChange={(e) => setActivationForm({ ...activationForm, address: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                    Titik Koordinat Lokasi (GPS)
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="-6.123456, 106.123456"
                                            value={activationForm.coordinates}
                                            onChange={(e) => setActivationForm({ ...activationForm, coordinates: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGetCoordinates}
                                        disabled={gettingLocation}
                                        className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                                    >
                                        <Navigation size={14} className={gettingLocation ? 'animate-spin' : ''} />
                                        <span>{gettingLocation ? 'Mencari...' : 'Ambil GPS'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                    ID Petugas (Sales / Teknisi) <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <ShieldCheck size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Masukkan 5 digit ID Petugas (contoh: 01001)"
                                        value={activationForm.staffCode}
                                        onChange={(e) => setActivationForm({ ...activationForm, staffCode: e.target.value })}
                                        className={`w-full bg-white/5 border rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 text-sm font-mono focus:outline-none ${
                                            !activationForm.staffCode.trim()
                                                ? 'border-amber-500/40 focus:border-blue-500'
                                                : matchedStaff
                                                    ? 'border-emerald-500/60 focus:border-emerald-400'
                                                    : 'border-red-500/60 focus:border-red-400'
                                        }`}
                                    />
                                </div>
                                {!activationForm.staffCode.trim() ? (
                                    <p className="text-[11px] text-amber-300/90 mt-1.5 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                        <span>Wajib diisi. Silakan masukkan ID Petugas (Sales / Teknisi) yang menangani pemasangan Anda.</span>
                                    </p>
                                ) : matchedStaff ? (
                                    <p className="text-[11px] text-emerald-400 font-medium mt-1.5 flex items-center gap-1.5">
                                        <CheckCircle size={13} className="shrink-0" />
                                        <span>Petugas Terverifikasi: <strong>{matchedStaff.fullName || matchedStaff.username}</strong> ({matchedStaff.agentNumber || matchedStaff.username})</span>
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-red-400 font-medium mt-1.5 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                        <span>Peringatan: ID Petugas <strong>&quot;{activationForm.staffCode.trim()}&quot;</strong> tidak ditemukan! Periksa kembali ID Petugas Anda.</span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                    Password Baru <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        required
                                        placeholder="Buat password baru (bukan buroq)"
                                        value={activationForm.newPassword}
                                        onChange={(e) => setActivationForm({ ...activationForm, newPassword: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                    >
                                        {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                    Ulangi Password Baru <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        required
                                        placeholder="Konfirmasi password baru"
                                        value={activationForm.confirmPassword}
                                        onChange={(e) => setActivationForm({ ...activationForm, confirmPassword: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3.5 bg-red-500/10 text-red-200 rounded-xl text-xs border border-red-500/20 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => { setActivationStep(false); setError(''); }}
                                className="px-4 py-3 rounded-xl border border-white/15 text-slate-300 hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            >
                                <ArrowLeft size={15} /> Kembali
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !activationForm.staffCode.trim() || (staffList.length > 0 && !matchedStaff)}
                                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Mengirim...</span>
                                    </>
                                ) : (
                                    <span>Simpan & Ajukan Konfirmasi Petugas</span>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

