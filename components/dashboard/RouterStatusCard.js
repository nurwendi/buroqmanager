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
            className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-2xl hover:bg-white/20 transition-all group overflow-hidden relative"
        >
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isOnline ? 'bg-blue-400/20 text-blue-300' : 'bg-red-400/20 text-red-300'}`}>
                        <Server size={22} />
                    </div>
                    <div>
                        <h4 className="font-bold text-white flex items-center gap-2 drop-shadow-md">
                            {router.name || 'Unnamed Router'}
                            {isOnline && router.identity && (
                                <span className="text-[10px] bg-white/10 text-blue-200 px-1.5 py-0.5 rounded font-mono font-bold border border-white/10">
                                    {router.identity}
                                </span>
                            )}
                        </h4>
                        <p className="text-[11px] text-white/40 font-mono">{router.host}</p>
                    </div>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'bg-green-400/20 text-green-300' : 'bg-red-400/20 text-red-300'}`}>
                    {isOnline ? <><Wifi size={10} /> Online</> : <><WifiOff size={10} /> Offline</>}
                </div>
            </div>

            {isOnline ? (
                <div className="space-y-4 relative z-10">
                    <div>
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight mb-1.5">
                            <span className="text-white/50 flex items-center gap-1"><Cpu size={12} /> CPU Load</span>
                            <span className={cpuLoad > 80 ? 'text-red-400' : 'text-blue-300'}>{cpuLoad}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${cpuLoad}%` }}
                                className={`h-full rounded-full ${cpuLoad > 80 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]'}`}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight mb-1.5">
                            <span className="text-white/50 flex items-center gap-1"><HardDrive size={12} /> RAM ({formatBytes(router.memoryUsed)})</span>
                            <span className="text-indigo-300">{memoryPercentage}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${memoryPercentage}%` }}
                                className="h-full bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.5)]"
                            />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-20 flex items-center justify-center opacity-40">
                    <p className="text-xs italic text-white/50">Router information unavailable</p>
                </div>
            )}

            {/* Subtle background decoration */}
            <div className="absolute -bottom-6 -right-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Server size={120} className="text-white" />
            </div>
            {isOnline && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
            )}
        </motion.div>
    );
}
