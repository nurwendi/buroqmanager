'use client';

import { UserPlus, Clock } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import StatCard from './StatCard';

export default function PendingRegistrationStats({ stats }) {
    const { t } = useLanguage();
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" }
        }
    };

    // If no pending registrations, we might want to hide it or show 0.
    // Displaying 0 is fine, or conditional rendering handled by parent.
    // Let's show it always so they know where to look.

    return (
        <motion.div variants={itemVariants}>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 drop-shadow-md">
                <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg text-orange-400">
                    <UserPlus size={20} />
                </div>
                {t('dashboard.registration')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                <Link href="/users" className="block">
                    <StatCard
                        icon={Clock}
                        title={t('dashboard.pendingApprovals')}
                        value={stats.pendingRegistrations || 0}
                        subtitle={t('dashboard.awaitingValidation')}
                        color="orange"
                    />
                </Link>
            </div>
        </motion.div>
    );
}
