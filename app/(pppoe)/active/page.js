'use client';

import { useState, useEffect } from 'react';
import { Activity, RefreshCw, ArrowUpDown, Search, ExternalLink, Power, Wifi, RotateCcw, MoreHorizontal, X } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ActiveConnectionsPage() {
    const { t } = useLanguage();
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
            // Handle ACS field sorting
            if (['ssid', 'rx_power', 'temp', 'serial'].includes(sortConfig.key)) {
                const acsA = getAcsData(a.name) || {};
                const acsB = getAcsData(b.name) || {};

                // Treat Signal (rx_power) as number for correct sorting
                if (sortConfig.key === 'rx_power') {
                    const valA = parseFloat(acsA.rx_power) || -999;
                    const valB = parseFloat(acsB.rx_power) || -999;
                    return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
                }

                // Treat Temp as number
                if (sortConfig.key === 'temp') {
                    const valA = parseFloat(acsA.temp) || -999;
                    const valB = parseFloat(acsB.temp) || -999;
                    return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
                }

                const valA = (acsA[sortConfig.key] || '').toString().toLowerCase();
                const valB = (acsB[sortConfig.key] || '').toString().toLowerCase();

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            }

            // Normal PPPoE field sorting
            const aVal = a[sortConfig.key] || '';
            const bVal = b[sortConfig.key] || '';

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    };

    const [acsDevices, setAcsDevices] = useState([]);

    const fetchConnections = async () => {
        try {
            setLoading(true);

            // Parallel fetch: Active Connections + GenieACS Devices
            // NOTE: GenieACS API uses the user's cookie, so it automatically filters devices by ownerId for admins!
            const [activesRes, acsRes] = await Promise.all([
                fetch('/api/pppoe/active'),
                fetch('/api/genieacs/devices')
            ]);

            if (!activesRes.ok) throw new Error('Failed to fetch connections');

            const activeData = await activesRes.json();

            let acsData = [];
            if (acsRes.ok) {
                acsData = await acsRes.json();
            }

            setConnections(activeData);
            setAcsDevices(acsData);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getAcsData = (username) => {
        if (!username || acsDevices.length === 0) return null;
        return acsDevices.find(d => d.pppoe_user === username);
    };

    const [editingDevice, setEditingDevice] = useState(null);
    const [detailsModal, setDetailsModal] = useState(null);
    const [wifiForm, setWifiForm] = useState({ ssid: '', password: '' });

    const openEditWifi = (device) => {
        setEditingDevice(device);
        setWifiForm({ ssid: device.ssid || '', password: '' });
    };

    const handleSaveWifi = async (e) => {
        e.preventDefault();
        if (!confirm(t('pppoe.wifiUpdateConfirm'))) return;

        try {
            const res = await fetch('/api/genieacs/wifi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId: editingDevice.id,
                    ssid: wifiForm.ssid,
                    password: wifiForm.password
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert(t('pppoe.wifiUpdateSuccess'));
                setEditingDevice(null);
                // Refresh ACS data after short delay
                setTimeout(() => fetchConnections(), 2000);
            } else {
                alert(t('pppoe.wifiUpdateFailed', { error: data.error }));
            }
        } catch (err) {
            alert(t('pppoe.wifiUpdateFailed', { error: err.message }));
        }
    };

    const handleDisconnect = async (id, name) => {
        if (!confirm(t('pppoe.disconnectConfirm', { name }))) return;

        try {
            const res = await fetch(`/api/pppoe/active/${encodeURIComponent(id)}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                // Refresh list
                fetchConnections();
            } else {
                const data = await res.json();
                alert(t('pppoe.disconnectFailed', { error: data.error }));
            }
        } catch (error) {
            console.error('Error disconnecting:', error);
            alert(t('pppoe.disconnectFailed', { error: error.message }));
        }
    };

    const handleReboot = async (deviceId, serial) => {
        if (!confirm(t('pppoe.rebootConfirm', { serial }))) return;

        try {
            const res = await fetch('/api/genieacs/reboot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId })
            });

            if (res.ok) {
                alert(t('pppoe.rebootQueued'));
            } else {
                alert(t('pppoe.rebootFailed'));
            }
        } catch (e) {
            alert(t('pppoe.rebootFailed'));
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
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{t('pppoe.activeConnections')}</h1>
                </div>

                <div className="flex flex-col gap-3 md:flex-row md:items-center md:space-x-4">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('pppoe.searchPlaceholder')}
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
                            <span className="text-sm">{t('pppoe.autoRefresh')}</span>
                        </label>
                        <button
                            onClick={fetchConnections}
                            className="flex items-center space-x-2 px-4 py-2 bg-accent text-white rounded hover:opacity-90 transition-all"
                        >
                            <RefreshCw size={16} />
                            <span>{t('common.refresh')}</span>
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
                <div className="text-center py-8 dark:text-gray-300">{t('common.loading')}</div>
            ) : (
                <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl overflow-hidden border border-white/20 dark:border-white/5">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-black/5 dark:bg-white/5">

                                <tr>
                                    <th className="md:hidden px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        {t('common.more')}
                                    </th>
                                    <th
                                        className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"

                                        onClick={() => sortData('name')}
                                    >
                                        <div className="flex items-center gap-1">
                                            {t('pppoe.username')} <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"

                                        onClick={() => sortData('address')}
                                    >
                                        <div className="flex items-center gap-1">
                                            {t('pppoe.ipAddress')} <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    {/* SSID Column */}
                                    <th
                                        className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                                        onClick={() => sortData('ssid')}
                                    >
                                        <div className="flex items-center gap-1">
                                            {t('pppoe.ssid')} <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    {/* Signal Column - Hidden on mobile, in More */}
                                    <th
                                        className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                                        onClick={() => sortData('rx_power')}
                                    >
                                        <div className="flex items-center gap-1">
                                            {t('pppoe.signal')} <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    {/* Temp Column */}
                                    <th
                                        className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                                        onClick={() => sortData('temp')}
                                    >
                                        <div className="flex items-center gap-1">
                                            {t('pppoe.temp')} <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    {/* SN Column */}
                                    <th
                                        className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                                        onClick={() => sortData('serial')}
                                    >
                                        <div className="flex items-center gap-1">
                                            {t('pppoe.sn')} <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"

                                        onClick={() => sortData('uptime')}
                                    >
                                        <div className="flex items-center gap-1">
                                            {t('pppoe.uptime')} <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"

                                        onClick={() => sortData('caller-id')}
                                    >
                                        <div className="flex items-center gap-1">
                                            {t('pppoe.callerId')} <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"

                                        onClick={() => sortData('tx-byte')}
                                    >
                                        <div className="flex items-center gap-1">
                                            {t('pppoe.data')} <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        {t('common.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-transparent divide-y divide-gray-200/50 dark:divide-white/10">
                                {connections.length === 0 ? (

                                    <tr>
                                        <td colSpan="11" className="px-6 py-4 text-center text-gray-500">
                                            {t('pppoe.noActiveConnections')}
                                        </td>
                                    </tr>
                                ) : (
                                    getSortedConnections()
                                        .slice(
                                            (currentPage - 1) * (rowsPerPage === 'All' ? connections.length : rowsPerPage),
                                            rowsPerPage === 'All' ? connections.length : currentPage * rowsPerPage
                                        )
                                        .map((conn, index) => {
                                            const acs = getAcsData(conn.name);
                                            return (
                                                <tr key={index} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                    <td className="md:hidden px-3 py-4 whitespace-nowrap">
                                                        <button
                                                            onClick={() => setDetailsModal({ ...conn, acs })}
                                                            className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                                        >
                                                            <MoreHorizontal size={18} />
                                                        </button>
                                                    </td>
                                                    <td className="px-3 md:px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                                        {conn.name || 'N/A'}
                                                    </td>
                                                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                        {conn.address || 'N/A'}
                                                    </td>
                                                    {/* ACS Columns */}
                                                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                                                        {acs ? <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[100px] block" title={acs.ssid}>{acs.ssid}</span> : '-'}
                                                    </td>
                                                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                                                        {acs ? (
                                                            <span className={`font-bold ${parseFloat(acs.rx_power) < -25 ? 'text-red-600' : 'text-green-600'}`}>
                                                                {acs.rx_power !== '-' ? acs.rx_power + ' dBm' : '-'}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                                                        {acs && acs.temp !== '-' ? acs.temp + '°C' : '-'}
                                                    </td>
                                                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-gray-500 text-xs font-mono">
                                                        {acs ? acs.serial : '-'}
                                                    </td>

                                                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                        {formatUptime(conn.uptime)}
                                                    </td>
                                                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                        {conn['caller-id'] || '-'}
                                                    </td>
                                                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs md:text-sm">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-green-600 dark:text-green-400">↓ {formatBytes(conn['tx-byte'])}</span>
                                                            <span className="text-blue-600 dark:text-blue-400">↑ {formatBytes(conn['rx-byte'])}</span>
                                                        </div>
                                                    </td>

                                                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-gray-500">
                                                        <div className="flex items-center gap-2">
                                                            {/* Group 1: Manage | Disconnect */}
                                                            <div className="flex items-center gap-1">
                                                                {conn.address && (
                                                                    <a
                                                                        href={`http://${conn.address}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:px-3 md:py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                                        title={t('pppoe.manageDeviceTitle')}
                                                                    >
                                                                        <ExternalLink size={14} className="md:mr-1" />
                                                                        <span className="hidden md:inline">{t('pppoe.manage')}</span>
                                                                    </a>
                                                                )}
                                                                <button
                                                                    onClick={() => handleDisconnect(conn['.id'], conn.name)}
                                                                    className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:px-3 md:py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                                    title={t('pppoe.disconnectUserTitle')}
                                                                >
                                                                    <Power size={14} className="md:mr-1" />
                                                                    <span className="hidden md:inline">{t('pppoe.disconnect')}</span>
                                                                </button>
                                                            </div>

                                                            {/* Divider */}
                                                            {acs && <div className="hidden md:block w-px h-5 bg-gray-300 mx-1"></div>}

                                                            {/* Group 2: WiFi | Reboot */}
                                                            {acs && (
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => openEditWifi(acs)}
                                                                        className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:px-3 md:py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                                                        title={t('pppoe.editWifiTitle')}
                                                                    >
                                                                        <Wifi size={14} className="md:mr-1" />
                                                                        <span className="hidden md:inline">{t('pppoe.wifi')}</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleReboot(acs.id, acs.serial)}
                                                                        className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:px-3 md:py-1 border border-transparent text-xs font-medium rounded text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                                                        title={t('pppoe.rebootDeviceTitle')}
                                                                    >
                                                                        <RotateCcw size={14} className="md:mr-1" />
                                                                        <span className="hidden md:inline">{t('pppoe.reboot')}</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between px-4 md:px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                {t('common.showing')} <span className="font-medium mx-1">
                                    {(currentPage - 1) * (rowsPerPage === 'All' ? connections.length : rowsPerPage) + 1}
                                </span>
                                {t('common.to')}
                                <span className="font-medium mx-1">
                                    {rowsPerPage === 'All' ? getSortedConnections().length : Math.min(currentPage * rowsPerPage, getSortedConnections().length)}
                                </span>
                                {t('common.of')}
                                <span className="font-medium mx-1">{getSortedConnections().length}</span> {t('common.results')}
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
                                {t('common.previous')}
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => {
                                    const maxPage = rowsPerPage === 'All' ? 1 : Math.ceil(getSortedConnections().length / rowsPerPage);
                                    return Math.min(prev + 1, maxPage);
                                })}
                                disabled={rowsPerPage === 'All' || currentPage >= Math.ceil(getSortedConnections().length / rowsPerPage)}
                                className="px-3 py-1 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('common.next')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                {t('pppoe.totalActive')} {connections.length}
            </div>

            {/* Edit Wi-Fi Modal */}
            {editingDevice && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-900">{t('pppoe.editWifiSettings')}</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            {t('pppoe.deviceSerial', { serial: editingDevice.serial })} <br />
                            {t('pppoe.wifiNote')}
                        </p>

                        <form onSubmit={handleSaveWifi} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">{t('pppoe.ssidName')}</label>
                                <input
                                    className="w-full border rounded-lg px-3 py-2 text-gray-900"
                                    value={wifiForm.ssid}
                                    onChange={e => setWifiForm({ ...wifiForm, ssid: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">{t('pppoe.newPassword')}</label>
                                <input
                                    className="w-full border rounded-lg px-3 py-2 text-gray-900"
                                    type="text"
                                    placeholder={t('pppoe.leaveEmpty')}
                                    value={wifiForm.password}
                                    onChange={e => setWifiForm({ ...wifiForm, password: e.target.value })}
                                    minLength={8}
                                />
                                <p className="text-xs text-gray-400 mt-1">{t('pppoe.min8Chars')}</p>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditingDevice(null)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Mobile Details Modal */}
            {
                detailsModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{detailsModal.name}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{detailsModal.address}</p>
                                </div>
                                <button
                                    onClick={() => setDetailsModal(null)}
                                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Body Scroller */}
                            <div className="p-5 overflow-y-auto space-y-4">
                                {/* Connection Stats */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                        <span className="text-xs text-blue-600 dark:text-blue-400 block mb-1">{t('pppoe.download')}</span>
                                        <span className="font-bold text-gray-800 dark:text-white">{formatBytes(detailsModal['tx-byte'])}</span>
                                    </div>
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                        <span className="text-xs text-green-600 dark:text-green-400 block mb-1">{t('pppoe.upload')}</span>
                                        <span className="font-bold text-gray-800 dark:text-white">{formatBytes(detailsModal['rx-byte'])}</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-sm text-gray-500">{t('pppoe.uptime')}</span>
                                        <span className="text-sm font-medium dark:text-gray-200">{formatUptime(detailsModal.uptime)}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-sm text-gray-500">{t('pppoe.callerId')}</span>
                                        <span className="text-sm font-medium dark:text-gray-200">{detailsModal['caller-id'] || '-'}</span>
                                    </div>

                                    {/* ACS Details Section */}
                                    {detailsModal.acs ? (
                                        <>
                                            <div className="pt-2">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">{t('pppoe.deviceInfo')}</span>
                                                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">{t('pppoe.ssid')}</span>
                                                        <span className="font-medium dark:text-gray-200">{detailsModal.acs.ssid || '-'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">{t('pppoe.signal')}</span>
                                                        <span className={`font-bold ${parseFloat(detailsModal.acs.rx_power) < -25 ? 'text-red-500' : 'text-green-500'}`}>
                                                            {detailsModal.acs.rx_power} dBm
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">{t('pppoe.temp')}</span>
                                                        <span className="font-medium dark:text-gray-200">{detailsModal.acs.temp}°C</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">{t('pppoe.sn')}</span>
                                                        <span className="font-mono text-xs dark:text-gray-200">{detailsModal.acs.serial}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg text-center text-sm text-gray-500 italic">
                                            {t('pppoe.noAcsLinked')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleDisconnect(detailsModal['.id'], detailsModal.name)}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors"
                                >
                                    <Power size={18} /> {t('pppoe.disconnect')}
                                </button>
                                {detailsModal.address && (
                                    <a
                                        href={`http://${detailsModal.address}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl font-medium hover:bg-blue-200 transition-colors"
                                    >
                                        <ExternalLink size={18} /> {t('pppoe.manage')}
                                    </a>
                                )}
                                {detailsModal.acs && (
                                    <>
                                        <button
                                            onClick={() => { setDetailsModal(null); openEditWifi(detailsModal.acs); }}
                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-100 text-indigo-700 rounded-xl font-medium hover:bg-indigo-200 transition-colors"
                                        >
                                            <Wifi size={18} /> {t('pppoe.wifi')}
                                        </button>
                                        <button
                                            onClick={() => handleReboot(detailsModal.acs.id, detailsModal.acs.serial)}
                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-100 text-orange-700 rounded-xl font-medium hover:bg-orange-200 transition-colors"
                                        >
                                            <RotateCcw size={18} /> {t('pppoe.reboot')}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
