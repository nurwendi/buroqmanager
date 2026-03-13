'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function NotificationPopover({ isBadgeOnly = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const popoverRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications?limit=10');
            const data = await res.json();
            if (Array.isArray(data)) {
                setNotifications(data);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const res = await fetch('/api/notifications/unread-count');
            const data = await res.json();
            setUnreadCount(data.count || 0);
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    };

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(() => {
            fetchUnreadCount();
            if (isOpen) fetchNotifications();
        }, 15000); // Check every 15s

        return () => clearInterval(interval);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    // Handle click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markRead = async (recipientId) => {
        try {
            await fetch('/api/notifications/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientId })
            });
            setNotifications(prev => prev.map(n => n.id === recipientId ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
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
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle className="text-green-500" size={18} />;
            case 'error': return <X className="text-red-500" size={18} />;
            case 'alert': return <AlertTriangle className="text-yellow-500" size={18} />;
            default: return <Info className="text-blue-500" size={18} />;
        }
    };

    if (isBadgeOnly) {
        if (unreadCount === 0) return null;
        return (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white dark:border-gray-800 scale-75 origin-top-right">
                {unreadCount > 9 ? '9+' : unreadCount}
            </span>
        );
    }

    return (
        <div className="relative" ref={popoverRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                title="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white dark:border-gray-800">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                        <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                            Pemberitahuan
                            {unreadCount > 0 && <span className="text-[10px] px-2 py-0.5 bg-accent/20 text-accent rounded-full">{unreadCount} baru</span>}
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-xs text-accent hover:underline flex items-center gap-1"
                            >
                                <Check size={12} /> Tandai semua dibaca
                            </button>
                        )}
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="mx-auto text-gray-300 dark:text-gray-600 mb-2" size={32} />
                                <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada notifikasi.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer ${!n.isRead ? 'bg-accent/5 dark:bg-accent/5' : ''}`}
                                        onClick={() => !n.isRead && markRead(n.id)}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-1 flex-shrink-0">
                                                {getTypeIcon(n.notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className={`text-sm font-medium truncate ${!n.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                        {n.notification.title}
                                                    </p>
                                                    <span className="text-[10px] text-gray-400 flex items-center gap-1 whitespace-nowrap">
                                                        <Clock size={10} />
                                                        {new Date(n.notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-1">
                                                    {n.notification.message}
                                                </p>
                                                {n.notification.sender && (
                                                    <p className="text-[10px] text-gray-400">
                                                        Oleh: {n.notification.sender.fullName || 'Sistem'}
                                                    </p>
                                                )}
                                            </div>
                                            {!n.isRead && (
                                                <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0"></div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Link
                        href="/notifications"
                        onClick={() => setIsOpen(false)}
                        className="block p-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-accent dark:hover:text-accent border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50"
                    >
                        Lihat Semua Notifikasi
                    </Link>
                </div>
            )}
        </div>
    );
}
