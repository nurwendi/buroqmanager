'use client';

import { Server, Cpu, HardDrive, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RouterStatusCard({ router }) {
    if (!router) return null;

    const isOnline = router.status === 'online';
    const cpuLoad = router.cpuLoad || 0;
    const memoryPercentage = router.memoryTotal > 0 ? Math.round((router.memoryUsed / router.memoryTotal) * 100) : 0;

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
        >
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isOnline ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                        <Server size={22} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            {router.name || 'Unnamed Router'}
                            {isOnline && router.identity && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">
                                    {router.identity}
                                </span>
                            )}
                        </h4>
                        <p className="text-[11px] text-gray-500 font-mono">{router.host}</p>
                    </div>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isOnline ? <><Wifi size={10} /> Online</> : <><WifiOff size={10} /> Offline</>}
                </div>
            </div>

            {isOnline ? (
                <div className="space-y-4 relative z-10">
                    <div>
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight mb-1.5">
                            <span className="text-gray-500 flex items-center gap-1"><Cpu size={12} /> CPU Load</span>
                            <span className={cpuLoad > 80 ? 'text-red-500' : 'text-blue-600'}>{cpuLoad}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${cpuLoad}%` }}
                                className={`h-full rounded-full ${cpuLoad > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight mb-1.5">
                            <span className="text-gray-500 flex items-center gap-1"><HardDrive size={12} /> RAM ({formatBytes(router.memoryUsed)})</span>
                            <span className="text-indigo-600">{memoryPercentage}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${memoryPercentage}%` }}
                                className="h-full bg-indigo-500 rounded-full"
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-20 flex items-center justify-center opacity-40">
                    <p className="text-xs italic text-gray-500">Router information unavailable</p>
                </div>
            )}

            {/* Subtle background decoration */}
            <div className="absolute -bottom-6 -right-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Server size={120} className="text-gray-400" />
            </div>
            {isOnline && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
            )}
        </motion.div>
    );
}
