'use client';

import { useState, useEffect } from 'react';
import { Activity, RefreshCw, ArrowUpDown, Search, ExternalLink, Power } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';

export default function ActiveConnectionsPage() {
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');

    const { preferences } = useDashboard();
    // Default to 25. Allow changing via UI.
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);

    const sortData = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedConnections = () => {
        let filtered = connections;
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = connections.filter(conn =>
                (conn.name && conn.name.toLowerCase().includes(lowerTerm)) ||
                (conn.address && conn.address.toLowerCase().includes(lowerTerm)) ||
                (conn['caller-id'] && conn['caller-id'].toLowerCase().includes(lowerTerm))
            );
        }

        if (!sortConfig.key) return filtered;

        const sorted = [...filtered].sort((a, b) => {
            const aVal = a[sortConfig.key] || '';
            const bVal = b[sortConfig.key] || '';

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    };

    const fetchConnections = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/pppoe/active');
            if (!res.ok) throw new Error('Failed to fetch connections');
            const data = await res.json();
            setConnections(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async (id, name) => {
        if (!confirm(`Are you sure you want to disconnect user ${name}?`)) return;

        try {
            const res = await fetch(`/api/pppoe/active/${encodeURIComponent(id)}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                // Refresh list
                fetchConnections();
            } else {
                const data = await res.json();
                alert(`Failed to disconnect: ${data.error}`);
            }
        } catch (error) {
            console.error('Error disconnecting:', error);
            alert('Failed to disconnect user');
        }
    };

    useEffect(() => {
        fetchConnections();
    }, []);

    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchConnections();
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [autoRefresh]);

    const formatUptime = (uptime) => {
        if (!uptime) return '-';
        // Mikrotik returns uptime as a string (e.g., "1w2d", "00:10:00")
        // We can display it directly as it's usually readable
        return uptime;
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-6">
                <div className="flex items-center space-x-2">
                    <Activity size={28} className="text-accent" />
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Active Connections</h1>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:space-x-4">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-auto pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                    </div>
                    <div className="flex items-center justify-between md:justify-start gap-4">
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm">Auto-refresh (5s)</span>
                        </label>
                        <button
                            onClick={fetchConnections}
                            className="flex items-center space-x-2 px-4 py-2 bg-accent text-white rounded hover:opacity-90 transition-all"
                        >
                            <RefreshCw size={16} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {loading && connections.length === 0 ? (
                <div className="text-center py-8 dark:text-gray-300">Loading...</div>
            ) : (
                <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl overflow-hidden border border-white/20 dark:border-white/5">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-black/5 dark:bg-white/5">

                                <tr>
                                    <th
                                        className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"

                                        onClick={() => sortData('name')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Username <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"

                                        onClick={() => sortData('address')}
                                    >
                                        <div className="flex items-center gap-1">
                                            IP Address <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"

                                        onClick={() => sortData('uptime')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Uptime <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"

                                        onClick={() => sortData('caller-id')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Caller ID <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"

                                        onClick={() => sortData('tx-byte')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Data Usage <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">

                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-transparent divide-y divide-gray-200/50 dark:divide-white/10">
                                {connections.length === 0 ? (

                                    <tr>
                                        <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                            No active connections
                                        </td>
                                    </tr>
                                ) : (
                                    getSortedConnections()
                                        .slice(
                                            (currentPage - 1) * (rowsPerPage === 'All' ? connections.length : rowsPerPage),
                                            rowsPerPage === 'All' ? connections.length : currentPage * rowsPerPage
                                        )
                                        .map((conn, index) => (
                                            <tr key={index} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-3 md:px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                                    {conn.name || 'N/A'}
                                                </td>
                                                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                    {conn.address || 'N/A'}
                                                </td>
                                                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                    {formatUptime(conn.uptime)}
                                                </td>
                                                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                    {conn['caller-id'] || '-'}
                                                </td>
                                                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 text-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-green-600 dark:text-green-400">↓ {formatBytes(conn['tx-byte'])}</span>
                                                        <span className="text-blue-600 dark:text-blue-400">↑ {formatBytes(conn['rx-byte'])}</span>
                                                    </div>
                                                </td>

                                                <td className="px-3 md:px-6 py-4 whitespace-nowrap text-gray-500">
                                                    {conn.address && (
                                                        <a
                                                            href={`http://${conn.address}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-2"
                                                        >
                                                            <ExternalLink size={14} className="mr-0 md:mr-1" />
                                                            <span className="hidden md:inline">Manage</span>
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => handleDisconnect(conn['.id'], conn.name)}
                                                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                    >
                                                        <Power size={14} className="mr-0 md:mr-1" />
                                                        <span className="hidden md:inline">Disconnect</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                Showing <span className="font-medium mx-1">
                                    {(currentPage - 1) * (rowsPerPage === 'All' ? connections.length : rowsPerPage) + 1}
                                </span>
                                to
                                <span className="font-medium mx-1">
                                    {rowsPerPage === 'All' ? getSortedConnections().length : Math.min(currentPage * rowsPerPage, getSortedConnections().length)}
                                </span>
                                of
                                <span className="font-medium mx-1">{getSortedConnections().length}</span> results
                            </div>

                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    const val = e.target.value === 'All' ? 'All' : parseInt(e.target.value);
                                    setRowsPerPage(val);
                                    setCurrentPage(1);
                                }}
                                className="text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value="All">All</option>
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => {
                                    const maxPage = rowsPerPage === 'All' ? 1 : Math.ceil(getSortedConnections().length / rowsPerPage);
                                    return Math.min(prev + 1, maxPage);
                                })}
                                disabled={rowsPerPage === 'All' || currentPage >= Math.ceil(getSortedConnections().length / rowsPerPage)}
                                className="px-3 py-1 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Total active connections: {connections.length}
            </div>

        </div>
    );
}
