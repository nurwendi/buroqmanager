'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wifi, RefreshCw, CreditCard, Activity, AlertCircle, CheckCircle, LogOut, Signal, Lock, X, Router } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';

export default function CustomerDashboard() {
    const { t } = useLanguage();
    const router = useRouter();
    const [stats, setStats] = useState({
        name: '',
        usage: { download: 0, upload: 0 },
        billing: { status: 'loading', amount: 0, invoice: '' },
        session: { id: null, uptime: '', active: false, ipAddress: null, currentSpeed: null }
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // GenieACS State
    const [acsDevice, setAcsDevice] = useState(null);
    const [wifiModal, setWifiModal] = useState(false);
    const [wifiForm, setWifiForm] = useState({ ssid: '', password: '' });
    const [wifiLoading, setWifiLoading] = useState(false);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/customer/stats');

            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }

            // Also fetch GenieACS Device
            const acsRes = await fetch('/api/genieacs/devices'); // Backend handles filtering for customer
            if (acsRes.ok) {
                const devices = await acsRes.json();
                if (devices.length > 0) {
                    setAcsDevice(devices[0]);
                    setWifiForm({ ssid: devices[0].ssid || '', password: '' });
                }
            }
        } catch (error) {
            console.error('Failed to fetch customer stats', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchStats();
    }, []);

    useEffect(() => {
        // Auto-refresh interval (stats only to save bandwidth on ACS)
        const interval = setInterval(() => {
            fetch('/api/customer/stats').then(res => res.ok && res.json()).then(data => setStats(prev => ({ ...prev, ...data })));
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
            router.refresh(); // Ensure layout updates
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const handleSaveWifi = async (e) => {
        e.preventDefault();
        if (!acsDevice) return;
        setWifiLoading(true);

        try {
            const res = await fetch('/api/genieacs/wifi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId: acsDevice.id, // Using the ID from our parsed object (which is _id)
                    ssid: wifiForm.ssid,
                    password: wifiForm.password
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update Wi-Fi');

            alert('Wi-Fi settings updated successfully! Device will reboot/reconfigure shortly.');
            setWifiModal(false);
            setWifiForm(prev => ({ ...prev, password: '' })); // Clear password
            fetchStats(); // Refresh to see changes eventually
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setWifiLoading(false);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatBits = (bps) => {
        const val = parseFloat(bps);
        if (!val || val <= 0) return '0 bps';
        const k = 1000;
        const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
        const i = Math.floor(Math.log(val) / Math.log(k));
        return parseFloat((val / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    // Clean name from "Customer" suffix if present
    const cleanName = stats.name ? stats.name.replace(/\s*Customer$/i, '') : 'Pelanggan';

    return (
        <motion.div
            className="space-y-6 max-w-4xl mx-auto pb-24"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                        {t('dashboard.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Selamat datang, <span className="font-semibold text-blue-600 dark:text-blue-400">{cleanName}</span>!
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        className={`p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${refreshing ? 'animate-spin' : ''}`}
                        title="Refresh Data"
                    >
                        <RefreshCw size={20} className="text-blue-600" />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </motion.div>

            {/* Status Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Connection Status */}
                <motion.div variants={itemVariants} className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-white/5 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <Activity className="text-blue-600 dark:text-blue-400" size={24} />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Koneksi</h2>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${stats.session.active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                            {stats.session.active ? 'Online' : 'Offline'}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700/50">
                            <span className="text-gray-500 dark:text-gray-400">Total Penggunaan</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatBytes((stats.usage.download || 0) + (stats.usage.upload || 0))}</span>
                        </div>

                        {stats.session.currentSpeed && (
                            <div className="py-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-center">
                                        <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Download</div>
                                        <div className="font-bold text-gray-800 dark:text-white">
                                            {formatBits(stats.session.currentSpeed.tx)}
                                        </div>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-center">
                                        <div className="text-xs text-green-600 dark:text-green-400 mb-1">Upload</div>
                                        <div className="font-bold text-gray-800 dark:text-white">
                                            {formatBits(stats.session.currentSpeed.rx)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Billing Status */}
                <motion.div variants={itemVariants} className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-white/5 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                <CreditCard className="text-green-600 dark:text-green-400" size={24} />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Tagihan</h2>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center py-2 h-full">
                        {stats.billing.status === 'paid' ? (
                            <div className="text-center w-full">
                                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                                    <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Lunas!</h3>
                                <p className="text-sm text-gray-500">Terima kasih sudah membayar.</p>
                            </div>
                        ) : stats.billing.status === 'unpaid' ? (
                            <div className="text-center w-full">
                                <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-2">
                                    <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Tagihan Tersedia</h3>
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl w-full text-left">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs text-gray-600 dark:text-gray-300">Invoice</span>
                                        <span className="text-xs font-mono">{stats.billing.invoice}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm text-gray-600 dark:text-gray-300">Total</span>
                                        <span className="font-bold text-red-600 dark:text-red-400 text-lg">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(stats.billing.amount)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">Memuat tagihan...</p>
                        )}
                    </div>
                </motion.div>

                {/* Wi-Fi Management (GenieACS) */}
                <motion.div variants={itemVariants} className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 border border-indigo-100 dark:border-gray-700 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Wifi size={120} className="text-indigo-600 dark:text-indigo-400" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-white dark:bg-gray-700 rounded-2xl shadow-sm">
                                <Router className="text-indigo-600 dark:text-indigo-400" size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Wi-Fi Saya</h2>
                                <p className="text-gray-600 dark:text-gray-400">Kelola nama dan sandi Wi-Fi Anda</p>
                            </div>
                        </div>

                        {acsDevice ? (
                            <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
                                <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl border border-indigo-100 dark:border-gray-600 min-w-[200px]">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Wifi size={14} className="text-gray-500" />
                                        <span className="text-xs text-gray-500 uppercase tracking-wider">SSID (Nama Wi-Fi)</span>
                                    </div>
                                    <p className="font-bold text-indigo-900 dark:text-indigo-100 text-lg truncate">
                                        {acsDevice.ssid || '-'}
                                    </p>
                                </div>

                                <button
                                    onClick={() => setWifiModal(true)}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 w-full md:w-auto justify-center"
                                >
                                    <Lock size={18} />
                                    Ubah Sandi / Nama
                                </button>
                            </div>
                        ) : (
                            <div className="text-center md:text-right p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-500 text-sm">Router Wi-Fi belum terdeteksi sistem.</p>
                                <p className="text-xs text-gray-400 mt-1">Hubungi admin jika Anda menggunakan router kami.</p>
                            </div>
                        )}
                    </div>
                </motion.div>

            </div>

            {/* Wi-Fi Edit Modal */}
            {wifiModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Ubah Pengaturan Wi-Fi</h3>
                            <button onClick={() => setWifiModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveWifi} className="p-6 space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-sm text-blue-700 dark:text-blue-300 mb-4 flex gap-2">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <div>
                                    Perhatian: Mengubah SSID atau Password akan memutus koneksi perangkat ini. Anda perlu menyambungkan ulang dengan password baru.
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Wi-Fi (SSID)</label>
                                <input
                                    type="text"
                                    value={wifiForm.ssid}
                                    onChange={e => setWifiForm({ ...wifiForm, ssid: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password Baru</label>
                                <input
                                    type="text"
                                    placeholder="Kosongkan jika tidak ingin mengubah"
                                    value={wifiForm.password}
                                    onChange={e => setWifiForm({ ...wifiForm, password: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    minLength={8}
                                />
                                <p className="text-xs text-gray-500 mt-1">Minimal 8 karakter.</p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setWifiModal(false)}
                                    className="flex-1 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={wifiLoading}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {wifiLoading ? <RefreshCw size={18} className="animate-spin" /> : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
