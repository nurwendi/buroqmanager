'use client';

import { UserPlus, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import StatCard from './StatCard';

export default function PendingRegistrationStats({ stats }) {
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
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20 rounded-lg shadow-lg shadow-orange-500/20 text-orange-600 dark:text-orange-400">
                    <UserPlus size={20} />
                </div>
                Registration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                <Link href="/users" className="block">
                    <StatCard
                        icon={Clock}
                        title="Pending Approvals"
                        value={stats.pendingRegistrations || 0}
                        subtitle="New users awaiting validation"
                        color="orange"
                    />
                </Link>
            </div>
        </motion.div>
    );
}
