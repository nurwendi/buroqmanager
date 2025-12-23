'use client';

import { useState, useEffect } from 'react';
import { Users, AlertCircle, Server, Database, Shield, Activity, Cpu, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SuperadminStats({ stats }) {
    const { t } = useLanguage();
    const [ownerStats, setOwnerStats] = useState([]);
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        const fetchOwnerStats = async () => {
            try {
                const res = await fetch('/api/admin/stats/owners');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setOwnerStats(data);
                }
            } catch (error) {
                console.error('Failed to fetch owner stats', error);
            } finally {
                setStatsLoading(false);
            }
        };
        fetchOwnerStats();
    }, []);

    // Stats from API
    // Stats from API
    const adminCount = stats?.adminCount || 0;
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

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Shield className="text-blue-600" size={24} />
                System Overview
            </h2>

            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Total Admins (Owners) */}
                <motion.div
                    variants={itemVariants}
                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users size={64} className="text-blue-500" />
                    </div>
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm uppercase tracking-wider">Partners (Owners)</p>
                        <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{adminCount}</h3>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-blue-500 font-medium">
                        <Shield size={16} />
                        <span>Registered Admins</span>
                    </div>
                    {/* Decorative gradient bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                </motion.div>

                {/* Total Customers (Global) */}
                <motion.div
                    variants={itemVariants}
                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Database size={64} className="text-purple-500" />
                    </div>
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm uppercase tracking-wider">Total End Users</p>
                        <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{totalCustomers}</h3>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-purple-500 font-medium">
                        <Users size={16} />
                        <span>Across all partners</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                </motion.div>

                {/* Server CPU */}
                <motion.div
                    variants={itemVariants}
                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Cpu size={64} className={cpuLoad > 80 ? 'text-red-500' : 'text-green-500'} />
                    </div>
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm uppercase tracking-wider">Server CPU</p>
                        <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{cpuLoad}%</h3>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-green-500 font-medium">
                        <Activity size={16} />
                        <span>Real-time Load</span>
                    </div>
                    <div className={`absolute bottom-0 left-0 right-0 h-1 ${cpuLoad > 80 ? 'bg-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'}`} />
                </motion.div>

                {/* Server RAM */}
                <motion.div
                    variants={itemVariants}
                    className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <HardDrive size={64} className="text-orange-500" />
                    </div>
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm uppercase tracking-wider">Memory</p>
                        <h3 className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{memoryPercent}%</h3>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mt-5 overflow-hidden">
                        <div
                            className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                            style={{ width: `${memoryPercent}%` }}
                        />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
                </motion.div>
            </motion.div>

            {/* Additional Quick Actions or Info could go here */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-2">System Status</h3>
                        <p className="text-blue-100 mb-4">All systems are running normally. No critical issues detected.</p>
                        <div className="flex items-center gap-2 text-sm bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-md">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            Operational
                        </div>
                    </div>
                    <Server className="absolute -bottom-4 -right-4 text-white/10" size={120} />
                </div>
            </div>

            {/* Owner Statistics Table */}
            <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Live Owner Statistics</h3>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Owner</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User Active</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Offline</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total User</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-transparent">
                                {statsLoading ? (
                                    <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">Loading stats...</td></tr>
                                ) : ownerStats.length === 0 ? (
                                    <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No stats available</td></tr>
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
