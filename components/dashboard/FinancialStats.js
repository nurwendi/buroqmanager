'use client';

import { DollarSign, Activity, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import StatCard from './StatCard';

export default function FinancialStats({ stats, formatCurrency }) {
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
                <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 rounded-lg shadow-lg shadow-green-500/20 text-green-600 dark:text-green-400">
                    <DollarSign size={20} />
                </div>
                Financial Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
                <StatCard
                    icon={DollarSign}
                    title="Revenue This Month"
                    value={formatCurrency(stats.billing.thisMonthRevenue)}
                    subtitle={`Revenue for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`}
                    color="green"
                />
                <StatCard
                    icon={Activity}
                    title="Today's Revenue"
                    value={formatCurrency(stats.billing.todaysRevenue)}
                    subtitle="Income received today"
                    color="blue"
                />
                <StatCard
                    icon={CreditCard}
                    title="Unpaid Invoices"
                    value={formatCurrency(stats.billing.totalUnpaid)}
                    subtitle={`${stats.billing.pendingCount} pending invoices`}
                    color="orange"
                />
            </div>
        </motion.div>
    );
}
