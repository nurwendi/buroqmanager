'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Server, User, WifiOff, Wifi } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SuperadminUsersPage() {
    const { t } = useLanguage();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/pppoe/users?mode=all');
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(data);
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
        return (
            user.name?.toLowerCase().includes(term) ||
            user._sourceRouterName?.toLowerCase().includes(term) ||
            user.service?.toLowerCase().includes(term)
        );
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
        <div className="p-6 max-h-screen overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white mb-2">{t('sidebar.allUsers')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {users.length} {t('users.totalUsers')} | {users.filter(u => u._sourceRouterName).length} {t('sidebar.routers')}
                    </p>
                </div>
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder={t('users.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
                                    Customer ID
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    User ID
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {t('users.profile')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Usage (Mnth)
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center text-gray-500">
                                        <Loader2 className="animate-spin mx-auto mb-2" />
                                        Loading users from all routers...
                                    </td>
                                </tr>
                            ) : paginatedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center text-gray-500">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map((user, idx) => (
                                    <tr key={user.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                                    <User size={14} className="text-blue-500" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                        {user.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{user.password}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Server size={14} className="text-purple-500" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        {user._sourceRouterName || 'Unknown'}
                                                    </p>
                                                    <p className="text-xs text-gray-400 truncate w-32" title={user._ownerName}>
                                                        {user._ownerName || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                                            {user._customerId || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono">
                                            {user['.id']}
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
                                            {/* Note: Active status is harder to aggregate without fetching active connections everywhere. 
                                                For now we just show basic status if disabled */}
                                            {user.disabled === 'true' || user.disabled === true ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                                    <WifiOff size={12} />
                                                    Disabled
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                                                    <Wifi size={12} />
                                                    Enabled
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
                    <p className="text-xs text-gray-500">
                        Showing {paginatedUsers.length} of {filteredUsers.length} users
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(c => c - 1)}
                            className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(c => c + 1)}
                            className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
