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
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Shield className="text-blue-600" size={24} />
                {t('dashboard.systemOverview')}
            </h2>

            {/* Server Specification & Usage - Consolidated */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Specs */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                            <Server size={20} className="text-blue-600 dark:text-blue-400" />
                            {t('dashboard.serverSpec')}
                        </h3>
                        {systemInfo ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-start gap-4 hover:border-blue-400/50 transition-colors group">
                                    <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <Server size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Operating System</p>
                                        <div className="font-black text-gray-900 dark:text-white flex items-center gap-2 truncate">
                                            {systemInfo.type === 'Windows_NT' ? 'Windows' : 'Linux'} {systemInfo.release}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 capitalize truncate">{systemInfo.hostname} • {systemInfo.arch}</p>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-start gap-4 hover:border-emerald-400/50 transition-colors group">
                                    <div className="p-3 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                        <Cpu size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Processor</p>
                                        <div className="font-black text-gray-900 dark:text-white text-sm truncate" title={systemInfo.cpu?.model}>
                                            {systemInfo.cpu?.model}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{systemInfo.cpu?.cores} Cores • {systemInfo.cpu?.speed} MHz</p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-start gap-4 hover:border-orange-400/50 transition-colors group">
                                    <div className="p-3 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                        <HardDrive size={24} />
                                    </div>
                                    <div className="w-full flex-1 min-w-0">
                                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">System Memory</p>
                                        <div className="font-black text-gray-900 dark:text-white truncate">
                                            {formatBytes(systemInfo.memory?.total)} Total
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-500 mt-1 w-full">
                                            <span className="truncate">Free: {formatBytes(systemInfo.memory?.free)}</span>
                                            {systemInfo.disk && (
                                                <span className="font-bold text-orange-500/80 dark:text-orange-400/80 ml-2 whitespace-nowrap" title={`Total: ${systemInfo.disk.total}, Free: ${systemInfo.disk.free}`}>
                                                    Disk: {systemInfo.disk.percent}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-start gap-4 hover:border-purple-400/50 transition-colors group">
                                    <div className="p-3 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                        <Activity size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">System Status</p>
                                        <div className="font-black text-gray-900 dark:text-white text-sm truncate">
                                            Uptime: {systemInfo.uptime ? `${Math.floor(systemInfo.uptime / 86400)}d ${Math.floor((systemInfo.uptime % 86400) / 3600)}h` : 'N/A'}
                                        </div>
                                        <p className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate" title={systemInfo.loadavg ? systemInfo.loadavg.map(n => n.toFixed(2)).join(', ') : 'N/A'}>
                                            Load: {systemInfo.loadavg ? systemInfo.loadavg.map(n => n.toFixed(2)).join(', ') : 'N/A'} • Node {systemInfo.nodeVersion || ''}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-pulse space-y-4">
                                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Real-time Usage */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-800 dark:text-white">
                        <Activity size={20} className="text-blue-600 dark:text-blue-400" />
                        {t('dashboard.realtimeUsage')}
                    </h3>

                    <div className="space-y-6">
                        {/* CPU */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-end mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-lg ${cpuLoad > 80 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 animate-pulse' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                        <Cpu size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">{t('dashboard.cpuLoad')} (Avg)</p>
                                        <p className="text-xl font-black text-gray-800 dark:text-white">{cpuLoad}%</p>
                                    </div>
                                </div>
                            </div>
                            
                                {/* Individual Cores Grid */}
                                {stats?.serverCpus && stats.serverCpus.length > 0 ? (
                                    (() => {
                                        const coreCount = stats.serverCpus.length;
                                        let gridClass = 'grid-cols-4';
                                        let wrapperClass = 'w-full';
                                        
                                        if (coreCount === 1) {
                                            gridClass = 'grid-cols-1';
                                            wrapperClass = 'w-1/3 mx-auto';
                                        } else if (coreCount === 2) {
                                            gridClass = 'grid-cols-2';
                                            wrapperClass = 'w-3/4 sm:w-1/2 mx-auto';
                                        } else if (coreCount === 3) {
                                            gridClass = 'grid-cols-3';
                                            wrapperClass = 'w-full sm:w-3/4 mx-auto';
                                        } else if (coreCount === 4) {
                                            gridClass = 'grid-cols-2'; // 2x2 grid
                                            wrapperClass = 'w-3/4 sm:w-1/2 mx-auto';
                                        } else if (coreCount > 4 && coreCount <= 8) {
                                            gridClass = 'grid-cols-4';
                                            wrapperClass = 'w-full';
                                        } else {
                                            gridClass = 'grid-cols-4 sm:grid-cols-8';
                                            wrapperClass = 'w-full';
                                        }

                                        return (
                                            <div className={`grid ${gridClass} gap-3 ${wrapperClass}`}>
                                                {stats.serverCpus.map((coreLoad, idx) => {
                                                    const isHigh = coreLoad > 80;
                                                    const isMed = coreLoad > 40 && !isHigh;
                                                    
                                                    // Background of the outer chip casing
                                                    const chipBgClass = isHigh ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100' 
                                                        : isMed ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100' 
                                                        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100';

                                                    // Inner processor die color
                                                    const dieBgClass = isHigh ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse' 
                                                        : isMed ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                                                        : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]';

                                                    return (
                                                        <div key={idx} className={`aspect-square rounded-xl border-2 ${chipBgClass} p-1.5 flex flex-col items-center justify-center relative overflow-hidden group shadow-sm hover:scale-105 transition-transform duration-300`}>
                                                            {/* Circuit board pattern background */}
                                                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, currentColor 1px, transparent 1px)', backgroundSize: '4px 4px' }}></div>
                                                            <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: 'linear-gradient(90deg, transparent 48%, currentColor 48%, currentColor 52%, transparent 52%), linear-gradient(0deg, transparent 48%, currentColor 48%, currentColor 52%, transparent 52%)', backgroundSize: '12px 12px' }}></div>
                                                            
                                                            {/* Inner CPU Die */}
                                                            <div className={`relative z-10 w-[70%] h-[70%] rounded border border-white/20 flex flex-col items-center justify-center text-white ${dieBgClass} transition-all duration-500 backdrop-blur-sm`}>
                                                                <span className="text-[9px] sm:text-[10px] font-bold tracking-wider opacity-90 mb-0.5">CORE {idx}</span>
                                                                <span className="text-sm sm:text-base font-black leading-none">{coreLoad}%</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()
                                ) : (
                                <div className="w-full bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${cpuLoad > 80 ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                                        style={{ width: `${cpuLoad}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* RAM */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-end mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                        <HardDrive size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">{t('dashboard.memoryUsage')}</p>
                                        <p className="text-xl font-black text-gray-800 dark:text-white">
                                            {formatBytes(memoryUsage)} <span className="text-sm font-medium text-gray-400">/ {formatBytes(memoryTotal)}</span>
                                        </p>
                                    </div>
                                </div>
                                <span className="text-lg font-black text-orange-500">
                                    {memoryPercent}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden shadow-inner relative">
                                <div
                                    className="h-full bg-gradient-to-r from-orange-400 to-rose-500 rounded-full transition-all duration-1000 relative"
                                    style={{ width: `${memoryPercent}%` }}
                                >
                                    <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)', backgroundSize: '1rem 1rem' }}></div>
                                </div>
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
                        className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden group h-full cursor-pointer hover:shadow-xl transition-shadow"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users size={64} className="text-blue-500" />
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm uppercase tracking-wider">{t('sidebar.systemUsers') || "System Users"}</p>
                            <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{systemUserCount}</h3>
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
                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Database size={64} className="text-purple-500" />
                    </div>
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm uppercase tracking-wider">{t('dashboard.totalEndUsers')}</p>
                        <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{totalCustomers}</h3>
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
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
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
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{t('dashboard.liveOwnerStats')}</h3>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.owner')}</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.userActive')}</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.offline')}</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.totalUser')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-transparent">
                                {statsLoading ? (
                                    <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">{t('dashboard.loadingStats')}</td></tr>
                                ) : ownerStats.length === 0 ? (
                                    <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">{t('dashboard.noStats')}</td></tr>
                                ) : (
                                    ownerStats.map((stat) => (
                                        <tr key={stat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-900 dark:text-white">{stat.owner}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">{stat.fullName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/10 rounded-lg">
                                                {stat.active}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-gray-500 dark:text-gray-400">
                                                {stat.offline}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/10 rounded-lg">
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
