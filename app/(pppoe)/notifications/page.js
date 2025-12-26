'use client';

import { useState, useEffect } from 'react';
import { Bell, RefreshCw, Calendar, Clock, User, Wifi, WifiOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NotificationsPage() {
    const { t } = useLanguage();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchLogs, 10000);
        return () => clearInterval(interval);
    }, [autoRefresh]);

    // Helper to parse Mikrotik Time
    const parseTime = (timeStr) => {
        if (!timeStr) return { date: '', time: '' };

        // Handle YYYY-MM-DD HH:mm:ss (Standard format in our DB)
        if (timeStr.match(/^\d{4}-\d{2}-\d{2}/)) {
            const parts = timeStr.split(' ');
            return { date: parts[0], time: parts.slice(1).join(' ') };
        }

        // Handle Mikrotik "MMM/DD/YYYY HH:mm:ss"
        if (timeStr.includes('/')) {
            const parts = timeStr.split(' ');
            return { date: parts[0], time: parts.slice(1).join(' ') };
        }

        // Handle just time
        return { date: '', time: timeStr };
    };

    // Sort logs: Newest first
    // We try to parse dates, or string compare if format is consistent
    const sortedLogs = [...logs].sort((a, b) => {
        const timeA = new Date(a.time).getTime() || 0;
        const timeB = new Date(b.time).getTime() || 0;
        // If valid dates, compare values
        if (timeA && timeB) return timeB - timeA;
        // Fallback string comparison (works for ISO-like strings)
        return b.time.localeCompare(a.time);
    });

    // Check if we should show Date column (if at least one log has a date)
    const hasDate = sortedLogs.some(log => parseTime(log.time).date !== '');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white/30 dark:bg-gray-900/30 p-6 rounded-2xl backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent rounded-xl shadow-lg shadow-accent/30">
                        <Bell className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Log Koneksi PPPoE</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Riwayat koneksi user (Terakhir 100 log)</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={fetchLogs}
                        disabled={loading}
                        className="p-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm border border-gray-200 dark:border-gray-700"
                        title="Refresh"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                                {hasDate && (
                                    <th className="p-4 w-32 font-semibold">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} /> Tanggal
                                        </div>
                                    </th>
                                )}
                                <th className="p-4 w-32 font-semibold">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} /> Waktu
                                    </div>
                                </th>
                                <th className="p-4 font-semibold">
                                    <div className="flex items-center gap-2">
                                        <User size={14} /> User
                                    </div>
                                </th>
                                <th className="p-4 w-48 font-semibold">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={hasDate ? 4 : 3} className="p-8 text-center text-gray-500">Memuat data...</td>
                                </tr>
                            ) : sortedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={hasDate ? 4 : 3} className="p-12 text-center text-gray-500">
                                        Tidak ada data log.
                                    </td>
                                </tr>
                            ) : (
                                sortedLogs.map((log, index) => {
                                    const { date, time } = parseTime(log.time);
                                    const isConnected = log.status === 'connected';

                                    return (
                                        <tr
                                            key={log['.id'] || index}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                        >
                                            {hasDate && (
                                                <td className="p-4 text-sm font-mono text-gray-600 dark:text-gray-300">
                                                    {date}
                                                </td>
                                            )}
                                            <td className="p-4 text-sm font-mono text-gray-600 dark:text-gray-300">
                                                {time}
                                            </td>
                                            <td className="p-4 font-medium text-gray-900 dark:text-white">
                                                {log.username}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                                                    ${isConnected
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}
                                                >
                                                    {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                                                    {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
