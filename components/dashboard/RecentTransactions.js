'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle2, DollarSign, Wallet } from 'lucide-react';

export default function RecentTransactions({ transactions = [] }) {
    const { t } = useLanguage();

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm col-span-1 flex flex-col h-full min-h-[350px]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-gray-800 dark:text-white font-bold text-lg">
                        {t('dashboard.recentInvoices') || "Recent Invoices"}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {t('dashboard.latestPaid') || "Latest paid transactions"}
                    </p>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                    <Wallet size={20} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
                {(!transactions || transactions.length === 0) ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                        <DollarSign size={32} className="mb-2 opacity-50" />
                        <p className="text-sm">{t('dashboard.noRecentTransactions') || "No recent transactions"}</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {transactions.map((tx, index) => (
                            <div key={tx.id || index} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <span className="font-bold text-sm">
                                            {tx.customerName ? tx.customerName.charAt(0).toUpperCase() : '?'}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate pr-2">
                                            {tx.customerName}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <CheckCircle2 size={12} className="text-green-500" />
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                                                {tx.method || 'CASH'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                                        Rp {tx.amount.toLocaleString('id-ID')}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {new Date(tx.date).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short'
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
