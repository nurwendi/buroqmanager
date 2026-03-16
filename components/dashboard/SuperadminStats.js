'use client';

import { useState, useEffect } from 'react';
import { Users, AlertCircle, Server, Database, Shield, Activity, Cpu, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import RouterStatusCard from './RouterStatusCard';

export default function SuperadminStats({ stats }) {
    const { t } = useLanguage();
    const [ownerStats, setOwnerStats] = useState([]);
    const [statsLoading, setStatsLoading] = useState(true);

    const [systemInfo, setSystemInfo] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [ownersRes, systemRes] = await Promise.all([
                    fetch('/api/admin/stats/owners'),
                    fetch('/api/system/info')
                ]);

                const ownersData = await ownersRes.json();
                if (Array.isArray(ownersData)) {
                    setOwnerStats(ownersData);
                }

                const systemData = await systemRes.json();
                if (!systemData.error) {
                    setSystemInfo(systemData);
                }
            } catch (error) {
                console.error('Failed to fetch stats', error);
            } finally {
                setStatsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Stats from API
    // Combine adminCount and systemUserCount for Superadmin if they want to see all system users
    // Or just use systemUserCount which we now pass from the API. Let's use systemUserCount.
    const systemUserCount = stats?.systemUserCount || stats?.adminCount || 0;
    const totalCustomers = stats?.totalCustomers || 0;

    // Server Stats (Fallback to Router stats if server stats missing for some reason)
    const cpuLoad = stats?.serverCpuLoad ?? stats?.cpuLoad ?? 0;
    const memoryUsage = stats?.serverMemoryUsed ?? stats?.memoryUsage ?? 0;
    const memoryTotal = stats?.serverMemoryTotal ?? stats?.memoryTotal ?? 1;
    const memoryPercent = Math.round((memoryUsage / memoryTotal) * 100) || 0;

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

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Shield className="text-blue-600" size={24} />
                {t('dashboard.systemOverview')}
            </h2>

            {/* Server Specification & Usage - Consolidated */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Specs */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
                            <Server size={20} className="text-blue-600" />
                            {t('dashboard.serverSpec')}
                        </h3>
                        {systemInfo ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <p className="text-xs text-gray-500 mb-1">{t('dashboard.os')}</p>
                                        <div className="font-semibold text-sm truncate flex items-center gap-2 text-gray-900">
                                            {systemInfo.type === 'Windows_NT' ? 'Windows' : 'Linux'}
                                            <span className="opacity-50 text-[10px]">({systemInfo.platform})</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 truncate">{systemInfo.release}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <p className="text-xs text-gray-500 mb-1">{t('dashboard.totalMemory')}</p>
                                        <div className="font-semibold text-sm flex items-center gap-2 text-gray-900">
                                            {formatBytes(systemInfo.memory?.total)}
                                            <HardDrive size={12} className="text-orange-500" />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{t('dashboard.free')}: {formatBytes(systemInfo.memory?.free)}</p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <p className="text-xs text-gray-500 mb-1">{t('dashboard.processor')}</p>
                                    <div className="font-semibold text-sm text-gray-900">{systemInfo.cpu?.model}</div>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Cpu size={12} className="text-green-600" />
                                            {systemInfo.cpu?.cores} {t('dashboard.cores')}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Activity size={12} className="text-blue-600" />
                                            {systemInfo.cpu?.speed} MHz
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-pulse space-y-4">
                                <div className="h-20 bg-gray-200 rounded-lg"></div>
                                <div className="h-16 bg-gray-200 rounded-lg"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Real-time Usage */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
                        <Activity size={20} className="text-green-600" />
                        {t('dashboard.realtimeUsage')}
                    </h3>

                    <div className="space-y-6">
                        {/* CPU */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                    <Cpu size={16} /> {t('dashboard.cpuLoad')}
                                </span>
                                <span className={`text-sm font-bold ${cpuLoad > 80 ? 'text-red-500' : 'text-green-600'}`}>
                                    {cpuLoad}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${cpuLoad > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                                    style={{ width: `${cpuLoad}%` }}
                                />
                            </div>
                        </div>

                        {/* RAM */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                    <HardDrive size={16} /> {t('dashboard.memoryUsage')}
                                </span>
                                <span className="text-sm font-bold text-orange-600">
                                    {memoryPercent}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${memoryPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Total Admins (Owners) */}
                <Link href="/system-users" className="block">
                    <motion.div
                        variants={itemVariants}
                        className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden group h-full cursor-pointer hover:shadow-xl transition-shadow"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users size={64} className="text-blue-500" />
                        </div>
                        <div>
                            <p className="text-gray-500 font-medium text-sm uppercase tracking-wider">{t('sidebar.systemUsers') || "System Users"}</p>
                            <h3 className="text-3xl font-bold text-gray-800 mt-2">{systemUserCount}</h3>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-sm text-blue-500 font-medium">
                            <Shield size={16} />
                            <span>{t('dashboard.registeredAdmins') || "Registered Users"}</span>
                        </div>
                        {/* Decorative gradient bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                    </motion.div>
                </Link>

                {/* Total Customers (Global) */}
                <motion.div
                    variants={itemVariants}
                    className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Database size={64} className="text-purple-500" />
                    </div>
                    <div>
                        <p className="text-gray-500 font-medium text-sm uppercase tracking-wider">{t('dashboard.totalEndUsers')}</p>
                        <h3 className="text-3xl font-bold text-gray-800 mt-2">{totalCustomers}</h3>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-purple-500 font-medium">
                        <Users size={16} />
                        <span>{t('dashboard.acrossPartners')}</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                </motion.div>
            </motion.div>
            {/* Router Status Section for Superadmin */}
            {stats?.routers && stats.routers.length > 0 && (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="mt-8"
                >
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Server className="text-blue-600" size={24} />
                        {t('routers.mikrotikConnections') || "Router Connections"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.routers.map((router) => (
                            <RouterStatusCard key={router.id} router={router} />
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Owner Statistics Table */}
            <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">{t('dashboard.liveOwnerStats')}</h3>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard.owner')}</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard.userActive')}</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard.offline')}</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('dashboard.totalUser')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-transparent">
                                {statsLoading ? (
                                    <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">{t('dashboard.loadingStats')}</td></tr>
                                ) : ownerStats.length === 0 ? (
                                    <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">{t('dashboard.noStats')}</td></tr>
                                ) : (
                                    ownerStats.map((stat) => (
                                        <tr key={stat.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-900">{stat.owner}</span>
                                                    <span className="text-xs text-gray-500">{stat.fullName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-green-600 font-bold bg-green-50 rounded-lg">
                                                {stat.active}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                                                {stat.offline}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-blue-600 font-bold bg-blue-50 rounded-lg">
                                                {stat.total}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
