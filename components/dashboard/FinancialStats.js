'use client';

import { DollarSign, Activity, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import StatCard from './StatCard';

export default function FinancialStats({ stats, formatCurrency, resolvedLanguage = 'id' }) {
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
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <div className="p-2 bg-green-50 rounded-lg shadow-sm text-green-600">
                    <DollarSign size={20} />
                </div>
                {t('dashboard.financialOverview')}
            </h2>

            <div className="space-y-4">
                {/* Admin/Agent Stats Section */}
                {stats.agentStats && stats.agentStats.role === 'admin' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                            <p className="text-gray-500 font-medium text-xs md:text-sm mb-1">{t('dashboard.totalGross')}</p>
                            <h3 className="text-xl md:text-2xl font-bold text-blue-600">{formatCurrency(stats.agentStats.grandTotal?.revenue || 0)}</h3>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                            <p className="text-gray-500 font-medium text-xs md:text-sm mb-1">{t('dashboard.komisiStaff')}</p>
                            <h3 className="text-xl md:text-2xl font-bold text-orange-600">{formatCurrency(stats.agentStats.grandTotal?.commission || 0)}</h3>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                            <p className="text-gray-500 font-medium text-xs md:text-sm mb-1">{t('dashboard.netRevenue')}</p>
                            <h3 className="text-xl md:text-2xl font-bold text-green-600">{formatCurrency(stats.agentStats.grandTotal?.netRevenue || 0)}</h3>
                        </div>
                    </div>
                )}

                {/* General Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
                    <StatCard
                        icon={DollarSign}
                        title={t('dashboard.revenueMonth')}
                        value={formatCurrency(stats.billing.thisMonthRevenue)}
                        subtitle={`${t('dashboard.revenueFor')} ${new Date().toLocaleString(resolvedLanguage, { month: 'long', year: 'numeric' })}`}
                        color="green"
                    />
                    <StatCard
                        icon={Activity}
                        title={t('dashboard.pendingPayments')}
                        value={stats.billing.pendingCount}
                        subtitle={t('dashboard.invoicesWaiting')}
                        color="blue"
                    />
                    <StatCard
                        icon={Activity}
                        title={t('dashboard.transactions')}
                        value={stats.billing.totalTransactions}
                        subtitle={t('dashboard.totalTransactionsMonth')}
                        color="purple"
                    />
                    <StatCard
                        icon={CreditCard}
                        title={t('dashboard.totalUnpaid')}
                        value={formatCurrency(stats.billing.totalUnpaid)}
                        subtitle={t('dashboard.totalOutstanding')}
                        color="red"
                    />
                </div>
            </div>
        </motion.div>
    );
}
