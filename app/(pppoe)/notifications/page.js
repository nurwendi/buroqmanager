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
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 pb-20 pt-20">
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <Bell className="text-accent" />
                            Notifikasi
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">Pusat pemberitahuan dan informasi sistem.</p>
                    </div>
                    {notifications.some(n => !n.isRead) && (
                        <button
                            onClick={markAllRead}
                            className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors text-sm font-medium"
                        >
                            <Check size={16} /> Tandai Semua Dibaca
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Cari notifikasi..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
                            />
                        </div>
                        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
                            {['all', 'unread', 'read'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === f 
                                        ? 'bg-white dark:bg-gray-800 text-accent shadow-sm' 
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20">
                        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Memuat notifikasi...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-20 text-center border border-dashed border-gray-200 dark:border-gray-700 shadow-sm">
                        <Bell className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Tidak Ada Notifikasi</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            {searchTerm ? 'Tidak ditemukan notifikasi yang cocok dengan pencarian Anda.' : 'Anda belum menerima pemberitahuan apa pun saat ini.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredNotifications.map((n) => (
                            <div
                                key={n.id}
                                className={`group bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md ${!n.isRead ? 'border-l-4 border-l-accent' : ''}`}
                            >
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 mt-1">
                                        {getTypeIcon(n.notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className={`font-semibold truncate ${!n.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                {n.notification.title}
                                            </h3>
                                            <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                                <Clock size={12} />
                                                {new Date(n.notification.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 whitespace-pre-line">
                                            {n.notification.message}
                                        </p>
                                        
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700/50">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                {n.notification.sender && (
                                                    <div className="flex items-center gap-2">
                                                        {n.notification.sender.avatar ? (
                                                            <img src={n.notification.sender.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-[10px] uppercase font-bold text-gray-500">
                                                                {n.notification.sender.fullName?.[0] || 'S'}
                                                            </div>
                                                        )}
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                            {n.notification.sender.fullName || 'Sistem'}
                                                        </span>
                                                    </div>
                                                )}
                                                <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                                                    n.notification.type === 'alert' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20' :
                                                    n.notification.type === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/20' :
                                                    n.notification.type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/20' :
                                                    'bg-blue-100 text-blue-600 dark:bg-blue-900/20'
                                                }`}>
                                                    {n.notification.type}
                                                </span>
                                            </div>

                                            {!n.isRead && (
                                                <button
                                                    onClick={() => markRead(n.id)}
                                                    className="text-xs text-accent font-semibold hover:underline"
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
