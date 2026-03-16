'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle2, DollarSign, Wallet } from 'lucide-react';

export default function RecentTransactions({ transactions = [] }) {
    const { t } = useLanguage();

    return (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl col-span-1 flex flex-col h-full min-h-[350px]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-white font-bold text-lg drop-shadow-md">
                        {t('dashboard.recentInvoices') || "Recent Invoices"}
                    </h3>
                    <p className="text-blue-100 text-sm">
                        {t('dashboard.latestPaid') || "Latest paid transactions"}
                    </p>
                </div>
                <div className="p-2 bg-white/10 rounded-lg text-green-300 border border-white/10">
                    <Wallet size={20} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
                {(!transactions || transactions.length === 0) ? (
                    <div className="h-full flex flex-col items-center justify-center text-blue-100/50">
                        <DollarSign size={32} className="mb-2 opacity-50" />
                        <p className="text-sm">{t('dashboard.noRecentTransactions') || "No recent transactions"}</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {transactions.map((tx, index) => (
                            <div key={tx.id || index} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-400/20 text-blue-300 flex items-center justify-center shrink-0 border border-white/10">
                                        <span className="font-bold text-sm">
                                            {tx.customerName ? String(tx.customerName).charAt(0).toUpperCase() : '?'}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-white truncate pr-2">
                                            {tx.customerName}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <CheckCircle2 size={12} className="text-green-400" />
                                            <p className="text-xs text-white/80 uppercase font-medium">
                                                {tx.method || 'CASH'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-white">
                                        Rp {tx.amount.toLocaleString('id-ID')}
                                    </p>
                                    <p className="text-xs text-blue-100 mt-0.5 font-medium">
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
