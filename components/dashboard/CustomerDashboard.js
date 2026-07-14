'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Wifi, RefreshCw, CreditCard, Activity, AlertCircle, CheckCircle, LogOut, Signal, Lock, X, Router, MessageSquare, Send, Plus, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';

export default function CustomerDashboard() {
    const { t } = useLanguage();
    const router = useRouter();
    const [stats, setStats] = useState({
        name: '',
        usage: { download: 0, upload: 0 },
        billing: { status: 'loading', amount: 0, invoice: '' },
        session: { id: null, uptime: '', active: false, ipAddress: null, currentSpeed: null },
        avatar: '',
        profileName: '',
        profilePrice: 0
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [bgUrl, setBgUrl] = useState(null);

    // GenieACS State
    const [acsDevice, setAcsDevice] = useState(null);
    const [wifiModal, setWifiModal] = useState(false);
    const [wifiForm, setWifiForm] = useState({ ssid: '', password: '' });
    const [wifiLoading, setWifiLoading] = useState(false);

    // Support Tickets State
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatModal, setChatModal] = useState(false);
    const [createModal, setCreateModal] = useState(false);
    const [newTicket, setNewTicket] = useState({ title: '', category: 'teknis', description: '', priority: 'medium' });
    const [replyText, setReplyText] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef(null);
    const pollingIntervalRef = useRef(null);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/customer/stats');

            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }

            // Fetch Support Tickets
            fetchTickets();

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

    const fetchTickets = async () => {
        try {
            const res = await fetch('/api/tickets');
            if (res.ok) {
                const data = await res.json();
                setTickets(data);
            }
        } catch {}
    };

    const fetchMessages = async (ticketId, isSilent = false) => {
        if (!isSilent) setChatLoading(true);
        try {
            const res = await fetch(`/api/tickets/${ticketId}/messages`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch {} finally {
            if (!isSilent) setChatLoading(false);
        }
    };

    useEffect(() => {
        if (selectedTicket && chatModal) {
            fetchMessages(selectedTicket.id);
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = setInterval(() => fetchMessages(selectedTicket.id, true), 5000);
        } else {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        }
    }, [selectedTicket, chatModal]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTicket)
            });
            if (res.ok) {
                setCreateModal(false);
                setNewTicket({ title: '', category: 'teknis', description: '', priority: 'medium' });
                fetchTickets();
            } else {
                const data = await res.json();
                alert('Gagal membuat tiket: ' + data.error);
            }
        } catch {
            alert('Kesalahan jaringan.');
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedTicket) return;

        const text = replyText;
        setReplyText('');

        try {
            const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            if (res.ok) {
                const newMsg = await res.json();
                setMessages(prev => [...prev, newMsg]);
            }
        } catch {}
    };

    useEffect(() => {
        // Initial fetch
        fetchStats();

        // Fetch Theme Settings
        fetch('/api/app-settings')
            .then(res => res.json())
            .then(data => {
                if (data.dashboardBgUrl) {
                    setBgUrl(data.dashboardBgUrl);
                }
            })
            .catch(err => console.error('Failed to fetch app settings in CustomerDashboard', err));
    }, []);

    useEffect(() => {
        // Auto-refresh interval (stats only to save bandwidth on ACS)
        const interval = setInterval(() => {
            fetch('/api/customer/stats').then(res => res.ok && res.json()).then(data => setStats(prev => ({ ...prev, ...data })));
            fetchTickets();
        }, 8000);

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

            alert(t('customerDashboard.wifiSuccess'));
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
            {/* Premium Header with Banner & Overlapping Avatar */}
            <motion.div variants={itemVariants} className="relative mb-12 sm:mb-14 w-screen left-1/2 -translate-x-1/2 -mt-20 md:-mt-24">
                {/* Banner Area - Sharp Corners & Seamless Deep Curve */}
                <div className="relative h-44 sm:h-48 w-full overflow-hidden border-0 shadow-none bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900">
                    {bgUrl && (
                        <>
                            <img 
                                src={bgUrl} 
                                alt="Banner" 
                                className="w-full h-full object-cover scale-110"
                            />
                            <div className="absolute inset-0 bg-indigo-900/10 mix-blend-multiply"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-black/10 to-black/50"></div>
                        </>
                    )}
                    
                    {/* Header Actions (Refresh & Logout) - Absolute Positioned on Banner */}
                    <div className="absolute top-20 md:top-24 right-6 md:right-8 flex items-center gap-2 z-20">
                        <button
                            onClick={handleRefresh}
                            className={`p-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/40 transition-all ${refreshing ? 'animate-spin' : ''}`}
                            title={t('customerDashboard.refresh')}
                        >
                            <RefreshCw size={18} />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-100 hover:bg-red-500/40 transition-all"
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                {/* Overlapping Profile Section */}
                <div className="relative -mt-16 sm:-mt-20 flex flex-col items-center z-10">
                    <div className="relative group">
                        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-[5px] border-white dark:border-gray-900 shadow-xl bg-gradient-to-br from-indigo-500 to-blue-700 flex items-center justify-center overflow-hidden transition-transform duration-500">
                            {stats.avatar ? (
                                <img src={stats.avatar} alt={cleanName} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl sm:text-6xl font-black text-white uppercase drop-shadow-md">
                                    {cleanName.charAt(0)}
                                </span>
                            )}
                        </div>
                        {/* Status Pulse Indicator */}
                        <div className={`absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-[3px] border-white dark:border-gray-900 ${stats.session.active ? 'bg-green-500' : 'bg-red-500'} shadow-md`}>
                            {stats.session.active && <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>}
                        </div>
                    </div>

                    <div className="mt-4 text-center px-4">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                            {cleanName}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                            <span className="px-3 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                                {t('customerDashboard.customerRole') || 'PELANGGAN'}
                            </span>
                            <span className="text-[10px] sm:text-xs text-gray-500 font-medium">
                                IP: {stats.session.ipAddress || '-'} • {stats.profileName || 'Paket'} ({new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(stats.profilePrice || 0)})
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Status Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Connection Status */}
                <motion.div variants={itemVariants} className="bg-white/90 dark:bg-white/[0.04] backdrop-blur-xl rounded-3xl p-8 border border-black/5 dark:border-white/10 shadow-lg dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <Activity className="text-blue-600 dark:text-blue-400" size={24} />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{t('customerDashboard.connection')}</h2>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${stats.session.active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                            {stats.session.active ? t('customerDashboard.active') : t('customerDashboard.inactive')}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700/50">
                            <span className="text-gray-500 dark:text-gray-400">{t('customerDashboard.totalUsage')}</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatBytes((stats.usage.download || 0) + (stats.usage.upload || 0))}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 text-xs">
                             <span className="text-gray-400">Download: {formatBytes(stats.usage.download || 0)}</span>
                             <span className="text-gray-400">Upload: {formatBytes(stats.usage.upload || 0)}</span>
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
                <motion.div variants={itemVariants} className="bg-white/90 dark:bg-white/[0.04] backdrop-blur-xl rounded-3xl p-8 border border-black/5 dark:border-white/10 shadow-lg dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                                <CreditCard className="text-green-600 dark:text-green-400" size={24} />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{t('customerDashboard.billing')}</h2>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center py-2 h-full">
                        {stats.billing.status === 'paid' ? (
                            <div className="text-center w-full">
                                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                                    <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('customerDashboard.paid')}</h3>
                                <p className="text-sm text-gray-500">{t('customerDashboard.thanksPaying')}</p>
                            </div>
                        ) : stats.billing.status === 'unpaid' ? (
                            <div className="text-center w-full">
                                <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-2">
                                    <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('customerDashboard.billingAvailable')}</h3>
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl w-full text-left mb-4">
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

                                <button
                                    onClick={async () => {
                                        // Payment Logic
                                        try {
                                            const btn = document.getElementById('pay-btn');
                                            if (btn) { btn.disabled = true; btn.innerText = 'Memproses...'; }

                                            const res = await fetch('/api/billing/pay', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    invoiceNumber: stats.billing.invoice,
                                                    amount: stats.billing.amount
                                                })
                                            });

                                            if (res.ok) {
                                                const data = await res.json();
                                                if (data.redirect_url) {
                                                    window.location.href = data.redirect_url; // Redirect to Midtrans
                                                } else {
                                                    alert('Gagal mendapatkan link pembayaran.');
                                                }
                                            } else {
                                                const err = await res.json();
                                                alert('Gagal memproses pembayaran: ' + (err.error || 'Unknown error'));
                                            }
                                        } catch (e) {
                                            alert('Terjadi kesalahan koneksi.');
                                        } finally {
                                            const btn = document.getElementById('pay-btn');
                                            if (btn) { btn.disabled = false; btn.innerText = 'Bayar Sekarang'; }
                                        }
                                    }}
                                    id="pay-btn"
                                    className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-green-500/30 transition-all flex items-center justify-center gap-2"
                                >
                                    <CreditCard size={18} />
                                    {t('customerDashboard.payNow')}
                                </button>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">{t('customerDashboard.loadingBilling')}</p>
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
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('customerDashboard.myWifi')}</h2>
                                <p className="text-gray-600 dark:text-gray-400">{t('customerDashboard.manageWifiDesc')}</p>
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
                                    {t('customerDashboard.changeWifi')}
                                </button>
                            </div>
                        ) : (
                            <div className="text-center md:text-right p-6 bg-white/50 dark:bg-white/[0.04] rounded-2xl border border-dashed border-black/10 dark:border-white/20">
                                <p className="text-gray-500 text-sm">{t('customerDashboard.routerNotFound')}</p>
                                <p className="text-xs text-gray-400 mt-1">{t('customerDashboard.contactAdmin')}</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Support Tickets Section */}
                <motion.div variants={itemVariants} className="md:col-span-2 bg-white/90 dark:bg-white/[0.04] backdrop-blur-xl rounded-3xl p-8 border border-black/5 dark:border-white/10 shadow-lg dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                                <MessageSquare className="text-red-600 dark:text-red-400" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Tiket Bantuan & Komplain</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Hubungi teknisi (masalah teknis) atau agen (masalah tagihan)</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setCreateModal(true)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
                        >
                            <Plus size={14} />
                            Buat Aduan
                        </button>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {tickets.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm italic">
                                Belum ada riwayat pengaduan.
                            </div>
                        ) : (
                            tickets.map(ticket => (
                                <button
                                    key={ticket.id}
                                    onClick={() => {
                                        setSelectedTicket(ticket);
                                        setChatModal(true);
                                    }}
                                    className="w-full py-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-700/20 px-2 rounded-xl transition-all"
                                >
                                    <div className="text-left space-y-1 pr-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-bold text-gray-400">{ticket.ticketId}</span>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                                ticket.category === 'teknis' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {ticket.category}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-sm text-gray-800 dark:text-white truncate">{ticket.title}</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                            ticket.status === 'open' ? 'bg-blue-100 text-blue-700' :
                                            ticket.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                                            'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {ticket.status === 'open' ? 'Baru' : ticket.status === 'in_progress' ? 'Diproses' : 'Selesai'}
                                        </span>
                                        <ChevronRight size={16} className="text-gray-400" />
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </motion.div>

            </div>

            {/* Wi-Fi Edit Modal */}
            {wifiModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('customerDashboard.editWifiTitle')}</h3>
                            <button onClick={() => setWifiModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveWifi} className="p-6 space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-sm text-blue-700 dark:text-blue-300 mb-4 flex gap-2">
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <div>
                                    {t('customerDashboard.wifiWarning')}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customerDashboard.ssidLabel')}</label>
                                <input
                                    type="text"
                                    value={wifiForm.ssid}
                                    onChange={e => setWifiForm({ ...wifiForm, ssid: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customerDashboard.newPasswordLabel')}</label>
                                <input
                                    type="text"
                                    placeholder="Kosongkan jika tidak ingin mengubah"
                                    value={wifiForm.password}
                                    onChange={e => setWifiForm({ ...wifiForm, password: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    minLength={8}
                                />
                                <p className="text-xs text-gray-500 mt-1">{t('customerDashboard.passwordMinLength')}</p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setWifiModal(false)}
                                    className="flex-1 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium"
                                >
                                    {t('customerDashboard.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={wifiLoading}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {wifiLoading ? <RefreshCw size={18} className="animate-spin" /> : t('customerDashboard.saveChanges')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Ticket Modal */}
            {createModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Buat Aduan / Komplain</h3>
                            <button onClick={() => setCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Kategori Masalah</label>
                                <select
                                    value={newTicket.category}
                                    onChange={e => setNewTicket({ ...newTicket, category: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                >
                                    <option value="teknis">Masalah Teknis (Router, Kabel, Loss internet)</option>
                                    <option value="tagihan">Masalah Tagihan / Pembayaran (Billing)</option>
                                    <option value="umum">Lainnya (Umum)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Subjek Masalah</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Lampu Router Merah, Internet Lambat..."
                                    value={newTicket.title}
                                    onChange={e => setNewTicket({ ...newTicket, title: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Penjelasan Singkat</label>
                                <textarea
                                    rows={4}
                                    placeholder="Tulis kronologi atau kendala secara detail..."
                                    value={newTicket.description}
                                    onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCreateModal(false)}
                                    className="flex-1 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium"
                                >
                                    Kirim Aduan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Chat Modal */}
            {chatModal && selectedTicket && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[550px]">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-mono font-bold text-gray-400">{selectedTicket.ticketId}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded capitalize ${
                                        selectedTicket.status === 'open' ? 'bg-blue-100 text-blue-700' :
                                        selectedTicket.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                                        'bg-emerald-100 text-emerald-700'
                                    }`}>
                                        {selectedTicket.status === 'open' ? 'Baru' : selectedTicket.status === 'in_progress' ? 'Diproses' : 'Selesai'}
                                    </span>
                                </div>
                                <h3 className="font-bold text-sm text-gray-800 dark:text-white truncate max-w-[280px]">{selectedTicket.title}</h3>
                            </div>
                            <button onClick={() => setChatModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Description banner */}
                        <div className="bg-amber-50/50 dark:bg-amber-950/10 border-b border-amber-100/50 dark:border-amber-950/20 px-4 py-2 text-[10px] text-amber-800 dark:text-amber-300">
                            <span className="font-bold">Deskripsi:</span> {selectedTicket.description}
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/30">
                            {chatLoading ? (
                                <div className="text-center text-xs text-gray-400 pt-8">Memuat obrolan...</div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-xs text-gray-400 pt-8">Mulai obrolan baru dengan staf di bawah.</div>
                            ) : (
                                messages.map(msg => {
                                    const isMe = msg.senderType === 'customer';
                                    const isSupervisor = msg.senderType === 'admin';
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <span className="text-[8px] text-gray-400 mb-0.5">
                                                {msg.senderName} {isSupervisor && '(Supervisor)'}
                                            </span>
                                            <div className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-xs shadow-sm ${
                                                isMe 
                                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                                    : isSupervisor
                                                        ? 'bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 rounded-tl-none font-medium'
                                                        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-tl-none'
                                            }`}>
                                                {msg.message}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Footer */}
                        {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' ? (
                            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Tulis balasan Anda..."
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-xs focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow transition-all"
                                >
                                    <Send size={14} />
                                </button>
                            </form>
                        ) : (
                            <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t text-center text-xs text-gray-400 italic">
                                Tiket ini telah ditutup / terselesaikan.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
