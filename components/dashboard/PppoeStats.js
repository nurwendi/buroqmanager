'use client';

import { Users, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import StatCard from './StatCard';

export default function PppoeStats({ stats }) {
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" }
        }
    };

    return (
        <motion.div variants={itemVariants}>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/20 rounded-lg shadow-lg shadow-blue-500/20 text-blue-600 dark:text-blue-400">
                    <Users size={20} />
                </div>
                PPPoE Users
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                <Link href="/active" className="block">
                    <StatCard
                        icon={Wifi}
                        title="PPPoE Active"
                        value={stats.pppoeActive}
                        subtitle="Users currently online"
                        color="green"
                    />
                </Link>
                <Link href="/offline" className="block">
                    <StatCard
                        icon={WifiOff}
                        title="PPPoE Offline"
                        value={stats.pppoeOffline}
                        subtitle="Users currently offline"
                        color="red"
                    />
                </Link>
            </div>
        </motion.div>
    );
}
