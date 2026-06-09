'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Server, User, WifiOff, Wifi, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import HeaderBanner from '@/components/HeaderBanner';

export default function SuperadminUsersPage() {
    const { t } = useLanguage();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'online', 'offline'

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/pppoe/users?mode=all');
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter Logic
    const filteredUsers = users.filter(user => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = (
            (user.name || '').toLowerCase().includes(term) ||
            (user._sourceRouterName || '').toLowerCase().includes(term) ||
            (user.service || '').toLowerCase().includes(term)
        );

        if (!matchesSearch) return false;

        if (filterStatus === 'online' && !user._active) return false;
        if (filterStatus === 'offline' && user._active) return false;

        return true;
    });

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6 max-h-screen overflow-hidden flex flex-col">
            <HeaderBanner
                title={t('sidebar.allUsers')}
                description={`${users.length} ${t('users.totalUsers')} | ${users.filter(u => u._sourceRouterName).length} ${t('sidebar.routers')}`}
                icon={Users}
            >
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex bg-black/40 backdrop-blur-md rounded-lg p-1 border border-white/20">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${filterStatus === 'all'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-white/60 hover:text-white'
                                }`}
                        >
                            <User size={14} />
                            {t('users.all')}
                        </button>
                        <button
                            onClick={() => setFilterStatus('online')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${filterStatus === 'online'
                                ? 'bg-white text-green-600 shadow-sm'
                                : 'text-white/60 hover:text-green-400'
                                }`}
                        >
                            <Wifi size={14} />
                            {t('users.online')}
                        </button>
                        <button
                            onClick={() => setFilterStatus('offline')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${filterStatus === 'offline'
                                ? 'bg-white text-gray-600 shadow-sm'
                                : 'text-white/60 hover:text-white'
                                }`}
                        >
                            <WifiOff size={14} />
                            {t('users.offline')}
                        </button>
                    </div>

                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={16} />
                        <input
                            type="text"
                            placeholder={t('users.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-white/30 bg-black/40 backdrop-blur-md text-xs text-white placeholder-white/60 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </HeaderBanner>

            {/* Mobile Controls Section */}
            <div className="flex flex-col gap-3 p-4 bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-xl border border-white/20 dark:border-white/5 md:hidden mb-6 print:hidden">
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${filterStatus === 'all'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400'
                            }`}
                    >
                        <User size={14} />
                        {t('users.all')}
                    </button>
                    <button
                        onClick={() => setFilterStatus('online')}
                        className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${filterStatus === 'online'
                            ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400'
                            }`}
                    >
                        <Wifi size={14} />
                        {t('users.online')}
                    </button>
                    <button
                        onClick={() => setFilterStatus('offline')}
                        className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${filterStatus === 'offline'
                            ? 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-305 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400'
                            }`}
                    >
                        <WifiOff size={14} />
                        {t('users.offline')}
                    </button>
                </div>
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder={t('users.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-805 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t('users.username')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t('sidebar.routers')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t('users.profile')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t('common.usageMonth')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t('common.status')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center text-gray-500">
                                        <Loader2 className="animate-spin mx-auto mb-2" />
                                        {t('common.loadingUsers')}
                                    </td>
                                </tr>
                            ) : paginatedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center text-gray-500">
                                        {t('common.noUsersFound')}
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map((user, idx) => (
                                    <tr key={user.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user._active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
                                                    <User size={14} className={user._active ? 'text-green-600' : 'text-blue-500'} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                        {user.name}
                                                    </p>
                                                    <div className="flex flex-col gap-0.5">
                                                        {user._customerId && user._customerId !== '-' && (
                                                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded-md inline-block w-fit">
                                                                {user._customerId}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Server size={14} className="text-purple-500" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        {user._sourceRouterName || t('common.unknown')}
                                                    </p>
                                                    <p className="text-xs text-gray-400 truncate w-32" title={user._ownerName}>
                                                        {user._ownerName || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                            <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs">
                                                {user.profile}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs">
                                                <p className="text-gray-900 dark:text-white font-medium">
                                                    {formatBytes(user.usage?.rx + user.usage?.tx)}
                                                </p>
                                                <p className="text-gray-400">
                                                    DL: {formatBytes(user.usage?.tx)}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user._active ? (
                                                <span className="inline-flex flex-col items-start gap-0.5">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                                                        <Wifi size={12} />
                                                        {t('users.online')}
                                                    </span>
                                                    {user._activeData?.address && (
                                                        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 pl-1">
                                                            {user._activeData.address}
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (user.disabled === 'true' || user.disabled === true) ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                                    <WifiOff size={12} />
                                                    {t('users.disabled')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                                    <WifiOff size={12} />
                                                    {t('users.offline')}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-4">
                        <p className="text-xs text-gray-500">
                            {t('common.showingOf', { count: paginatedUsers.length, total: filteredUsers.length })}
                        </p>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {t('common.pageOf', { current: currentPage, total: totalPages })}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(c => c - 1)}
                            className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                        >
                            {t('common.previous')}
                        </button>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(c => c + 1)}
                            className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                        >
                            {t('common.next')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
