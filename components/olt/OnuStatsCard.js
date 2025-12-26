'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react';

export default function OnuStatsCard() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/olt/stats')
            .then(res => res.json())
            .then(data => setStats(Array.isArray(data) ? data : []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const totalOnline = stats.reduce((acc, curr) => acc + curr.onu_online, 0);
    const totalOffline = stats.reduce((acc, curr) => acc + curr.onu_offline, 0);

    if (loading) return <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">ONU Statistics</h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                        <Wifi size={20} />
                        <span className="text-sm font-medium">Online</span>
                    </div>
                    <span className="text-2xl font-bold text-green-700 dark:text-green-300">{totalOnline}</span>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                        <WifiOff size={20} />
                        <span className="text-sm font-medium">Offline</span>
                    </div>
                    <span className="text-2xl font-bold text-red-700 dark:text-red-300">{totalOffline}</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-2">Port</th>
                            <th className="px-4 py-2 text-center">Online</th>
                            <th className="px-4 py-2 text-center">Offline</th>
                            <th className="px-4 py-2 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((port) => (
                            <tr key={port.port_id} className="border-b dark:border-gray-700">
                                <td className="px-4 py-3 font-medium">{port.port_id}</td>
                                <td className="px-4 py-3 text-center text-green-600 font-medium">{port.onu_online}</td>
                                <td className="px-4 py-3 text-center text-red-500 font-medium">{port.onu_offline}</td>
                                <td className="px-4 py-3 text-center">
                                    {port.status === 'healthy' && <CheckCircle size={16} className="mx-auto text-green-500" />}
                                    {port.status === 'partial' && <AlertTriangle size={16} className="mx-auto text-yellow-500" />}
                                    {port.status === 'down' && <AlertTriangle size={16} className="mx-auto text-red-500" />}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
