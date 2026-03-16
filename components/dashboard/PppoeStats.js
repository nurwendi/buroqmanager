'use client';

import { Users, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import StatCard from './StatCard';

export default function PppoeStats({ stats }) {
    const { t } = useLanguage();
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
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/20 rounded-lg shadow-lg shadow-blue-500/20 text-blue-600 dark:text-blue-400">
                    <Users size={20} />
                </div>
                {t('dashboard.pppoeUsers')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                <Link href="/users?status=online" className="block">
                    <StatCard
                        icon={Wifi}
                        title={t('dashboard.pppoeActive')}
                        value={stats.pppoeActive}
                        subtitle={t('dashboard.usersOnline')}
                        color="green"
                    />
                </Link>
                <Link href="/users?status=offline" className="block">
                    <StatCard
                        icon={WifiOff}
                        title={t('dashboard.pppoeOffline')}
                        value={stats.pppoeOffline}
                        subtitle={t('dashboard.usersOffline')}
                        color="red"
                    />
                </Link>
            </div>
        </motion.div>
    );
}
