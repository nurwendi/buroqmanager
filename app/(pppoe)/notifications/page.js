'use client';

import { useState, useEffect } from 'react';
import { Bell, Clock, Check, CheckCircle, AlertTriangle, XCircle, Info, Trash2, Filter, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NotificationsPage() {
    const { t } = useLanguage();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/notifications?limit=100');
            const data = await res.json();
            if (Array.isArray(data)) {
                setNotifications(data);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markRead = async (recipientId) => {
        try {
            await fetch('/api/notifications/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientId })
            });
            setNotifications(prev => prev.map(n => n.id === recipientId ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllRead = async () => {
        try {
            await fetch('/api/notifications/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ all: true })
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle className="text-green-500" size={20} />;
            case 'error': return <XCircle className="text-red-500" size={20} />;
            case 'alert': return <AlertTriangle className="text-yellow-500" size={20} />;
            default: return <Info className="text-blue-500" size={20} />;
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread') return !n.isRead;
        if (filter === 'read') return n.isRead;
        return true;
    }).filter(n => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return n.notification.title.toLowerCase().includes(search) || 
               n.notification.message.toLowerCase().includes(search);
    });

    return (
        <div className="min-h-screen pb-20 pt-20">
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3 drop-shadow-md">
                            <Bell className="text-blue-400" />
                            Notifikasi
                        </h1>
                        <p className="text-blue-100 font-bold">Pusat pemberitahuan dan informasi sistem.</p>
                    </div>
                    {notifications.some(n => !n.isRead) && (
                        <button
                            onClick={markAllRead}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-colors text-sm font-bold shadow-lg backdrop-blur-md"
                        >
                            <Check size={16} className="text-green-400" /> Tandai Semua Dibaca
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 p-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-100" size={18} />
                            <input
                                type="text"
                                placeholder="Cari notifikasi..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/20 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
                            />
                        </div>
                        <div className="flex gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
                            {['all', 'unread', 'read'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filter === f 
                                        ? 'bg-blue-500 text-white shadow-lg' 
                                        : 'text-blue-100 hover:text-white hover:bg-white/10'}`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-blue-100 font-bold">Memuat notifikasi...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-xl p-20 text-center border border-dashed border-white/20 shadow-2xl">
                        <Bell className="mx-auto text-blue-100/50 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-white mb-2">Tidak Ada Notifikasi</h3>
                        <p className="text-blue-100/80 font-medium">
                            {searchTerm ? 'Tidak ditemukan notifikasi yang cocok dengan pencarian Anda.' : 'Anda belum menerima pemberitahuan apa pun saat ini.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredNotifications.map((n) => (
                            <div
                                key={n.id}
                                className={`group bg-white/10 dark:bg-black/40 backdrop-blur-xl rounded-xl p-5 shadow-2xl border border-white/20 transition-all hover:bg-white/20 ${!n.isRead ? 'border-l-4 border-l-blue-400' : ''}`}
                            >
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 mt-1">
                                        {getTypeIcon(n.notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className={`font-bold truncate ${!n.isRead ? 'text-white' : 'text-blue-100'}`}>
                                                {n.notification.title}
                                            </h3>
                                            <span className="text-xs text-blue-100 font-bold flex items-center gap-1">
                                                <Clock size={12} className="text-blue-400" />
                                                {new Date(n.notification.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className={`text-sm leading-relaxed mb-4 whitespace-pre-line ${!n.isRead ? 'text-white' : 'text-blue-100/80 font-medium'}`}>
                                            {n.notification.message}
                                        </p>
                                        
                                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                {n.notification.sender && (
                                                    <div className="flex items-center gap-2">
                                                        {n.notification.sender.avatar ? (
                                                            <img src={n.notification.sender.avatar} alt="" className="w-5 h-5 rounded-full object-cover border border-white/20" />
                                                        ) : (
                                                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px] uppercase font-bold text-white shadow-lg">
                                                                {n.notification.sender.fullName?.[0] || 'S'}
                                                            </div>
                                                        )}
                                                        <span className="text-xs text-blue-100 font-bold truncate">
                                                            {n.notification.sender.fullName || 'Sistem'}
                                                        </span>
                                                    </div>
                                                )}
                                                <span className="text-xs text-white/20">|</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold shadow-sm ${
                                                    n.notification.type === 'alert' ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30' :
                                                    n.notification.type === 'error' ? 'bg-red-400/20 text-red-300 border border-red-400/30' :
                                                    n.notification.type === 'success' ? 'bg-green-400/20 text-green-300 border border-green-400/30' :
                                                    'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                                                }`}>
                                                    {n.notification.type}
                                                </span>
                                            </div>

                                            {!n.isRead && (
                                                <button
                                                    onClick={() => markRead(n.id)}
                                                    className="text-xs text-blue-300 font-bold hover:text-white transition-colors"
                                                >
                                                    Tandai Dibaca
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
