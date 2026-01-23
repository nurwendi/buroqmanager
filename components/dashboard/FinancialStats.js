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

            <div className="space-y-4">
                {/* Admin/Agent Stats Section */}
                {stats.agentStats && stats.agentStats.role === 'admin' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
                            <p className="text-blue-100 font-medium text-xs md:text-sm mb-1">Total Gross</p>
                            <h3 className="text-xl md:text-2xl font-bold">{formatCurrency(stats.agentStats.grandTotal?.revenue || 0)}</h3>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
                            <p className="text-orange-100 font-medium text-xs md:text-sm mb-1">Komisi Staff</p>
                            <h3 className="text-xl md:text-2xl font-bold">{formatCurrency(stats.agentStats.grandTotal?.commission || 0)}</h3>
                        </div>
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
                            <p className="text-green-100 font-medium text-xs md:text-sm mb-1">Net Revenue</p>
                            <h3 className="text-xl md:text-2xl font-bold">{formatCurrency(stats.agentStats.grandTotal?.netRevenue || 0)}</h3>
                        </div>
                    </div>
                )}

                {/* General Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
                    <StatCard
                        icon={DollarSign}
                        title="Revenue (This Month)"
                        value={formatCurrency(stats.billing.thisMonthRevenue)}
                        subtitle={`Revenue for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`}
                        color="green"
                    />
                    <StatCard
                        icon={Activity}
                        title="Pending Invoices"
                        value={stats.billing.pendingCount}
                        subtitle="Invoices waiting payment"
                        color="blue"
                    />
                    <StatCard
                        icon={Activity}
                        title="Transactions"
                        value={stats.billing.totalTransactions}
                        subtitle="Total transactions this month"
                        color="purple"
                    />
                    <StatCard
                        icon={CreditCard}
                        title="Total Unpaid"
                        value={formatCurrency(stats.billing.totalUnpaid)}
                        subtitle="Total outstanding amount"
                        color="red"
                    />
                </div>
            </div>
        </motion.div>
    );
}
