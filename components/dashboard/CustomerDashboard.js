'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wifi, RefreshCw, CreditCard, Activity, AlertCircle, CheckCircle, LogOut } from 'lucide-react';
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

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/customer/stats');

            if (res.ok) {
                const data = await res.json();
                setStats(data);
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
        // Auto-refresh interval
        const interval = setInterval(() => {
            fetchStats();
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

    // ... format helpers ...

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // ... other helpers ...

    const formatUptime = (uptime) => {
        if (!uptime || uptime === '-') return '-';
        return uptime
            .replace('w', ' minggu ')
            .replace('d', ' hari ')
            .replace('h', ' jam ')
            .replace('m', ' menit ')
            .replace('s', ' detik');
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
                </div>
            </motion.div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Connection Status */}
                <motion.div variants={itemVariants} className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-white/5 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <Wifi className="text-blue-600 dark:text-blue-400" size={24} />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Koneksi</h2>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${stats.session.active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                            {stats.session.active ? 'Terhubung' : 'Terputus'}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700/50">
                            <span className="text-gray-500 dark:text-gray-400">Total Penggunaan Bulan Ini</span>
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

                    <div className="mt-6 space-y-3">
                        {stats.session.ipAddress ? (
                            <button
                                onClick={() => window.open(`http://${stats.session.ipAddress}`, '_blank')}
                                className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                <Wifi size={16} />
                                Masuk Router
                            </button>
                        ) : null}

                        {!stats.session.active && (
                            <p className="text-xs text-center text-gray-400 italic">
                                Koneksi sedang offline.
                            </p>
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

                    <div className="flex flex-col items-center justify-center py-6">
                        {stats.billing.status === 'paid' ? (
                            <div className="text-center">
                                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                                    <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Lunas!</h3>
                                <p className="text-gray-500">Tidak ada tagihan tertunda.</p>
                            </div>
                        ) : stats.billing.status === 'unpaid' ? (
                            <div className="text-center w-full">
                                <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-3">
                                    <AlertCircle className="text-red-600 dark:text-red-400" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Menunggu Pembayaran</h3>
                                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl w-full">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-gray-600 dark:text-gray-300">Tagihan</span>
                                        <span className="font-medium">{stats.billing.invoice}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-300">Jumlah</span>
                                        <span className="font-bold text-red-600 dark:text-red-400">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(stats.billing.amount)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                <p className="text-gray-500">Memeriksa status tagihan...</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Logout Button */}
            <motion.div variants={itemVariants} className="pt-4">
                <button
                    onClick={handleLogout}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                >
                    <LogOut size={24} />
                    Keluar
                </button>
            </motion.div>
        </motion.div>
    );
}
