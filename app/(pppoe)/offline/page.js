'use client';

import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, ArrowUpDown } from 'lucide-react';

export default function OfflineUsersPage() {
    const [users, setUsers] = useState([]);
    const [activeConnections, setActiveConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const sortData = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedOfflineUsers = () => {
        const offlineUsers = users.filter(user => !activeConnections.some(conn => conn.name === user.name));

        if (!sortConfig.key) return offlineUsers;

        return [...offlineUsers].sort((a, b) => {
            const aVal = a[sortConfig.key] || '';
            const bVal = b[sortConfig.key] || '';

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, activeRes] = await Promise.all([
                fetch('/api/pppoe/users'),
                fetch('/api/pppoe/active')
            ]);

            const usersData = await usersRes.json();
            const activeData = await activeRes.json();

            if (Array.isArray(usersData)) setUsers(usersData);
            if (Array.isArray(activeData)) setActiveConnections(activeData);

        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const offlineUsers = getSortedOfflineUsers();

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-2">
                    <WifiOff size={32} className="text-red-600 dark:text-red-500" />
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Offline Users</h1>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center space-x-2 px-4 py-2 bg-accent text-white rounded hover:opacity-90 shadow-lg shadow-accent/30 transition-all"
                >
                    <RefreshCw size={16} />
                    <span>Refresh</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border-l-4 border-red-500 border-y border-r border-white/20 dark:border-white/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Offline</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white">{offlineUsers.length}</p>
                        </div>
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <WifiOff size={24} className="text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl overflow-hidden border border-white/20 dark:border-white/5">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-black/5 dark:bg-white/5">
                        <tr>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                onClick={() => sortData('name')}
                            >
                                <div className="flex items-center gap-1">
                                    Name <ArrowUpDown size={14} />
                                </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Password</th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                onClick={() => sortData('profile')}
                            >
                                <div className="flex items-center gap-1">
                                    Profile <ArrowUpDown size={14} />
                                </div>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                onClick={() => sortData('service')}
                            >
                                <div className="flex items-center gap-1">
                                    Service <ArrowUpDown size={14} />
                                </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Known IP</th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                onClick={() => sortData('last-logged-out')}
                            >
                                <div className="flex items-center gap-1">
                                    Last Logout <ArrowUpDown size={14} />
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-transparent divide-y divide-gray-200/50 dark:divide-white/10">
                        {loading ? (
                            <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Loading...</td></tr>
                        ) : offlineUsers.length === 0 ? (
                            <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No offline users found</td></tr>
                        ) : (
                            offlineUsers.map((user) => (
                                <tr key={user['.id']} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">******</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{user.profile}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">{user.service}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 font-mono text-sm">
                                        {user['remote-address'] || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 text-sm">
                                        {user['last-logged-out'] || '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
