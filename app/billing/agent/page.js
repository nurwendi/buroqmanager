'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Users, UserCheck, UserX, Calendar } from 'lucide-react';
import HeaderBanner from '@/components/HeaderBanner';

export default function AgentBillingPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchStats();
    }, [selectedMonth, selectedYear]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/billing/stats/agent?month=${selectedMonth}&year=${selectedYear}`);
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to fetch stats', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount || 0);
    };

    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return (
        <div className="space-y-6">
            <HeaderBanner
                title="Agent Dashboard"
                description="View your customer payments, revenue summaries, and commissions."
                icon={Users}
            >
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/30 text-white">
                    <Calendar size={16} className="text-white/80" />
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-transparent outline-none text-xs sm:text-sm font-semibold text-white cursor-pointer"
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i} className="text-gray-900">{m}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="bg-transparent outline-none text-xs sm:text-sm font-semibold text-white cursor-pointer ml-2"
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y} className="text-gray-900">{y}</option>
                        ))}
                    </select>
                </div>
            </HeaderBanner>

            {/* Mobile Controls Section (Visible only on mobile) */}
            <div className="flex flex-col gap-3 p-4 bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-xl border border-white/20 dark:border-white/5 md:hidden mb-6 print:hidden">
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                    <Calendar className="text-gray-500" size={16} />
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-transparent outline-none text-xs text-gray-700 dark:text-gray-300 font-medium flex-1 cursor-pointer"
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i} className="text-gray-900 dark:text-white">{m}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="bg-transparent outline-none text-xs text-gray-700 dark:text-gray-300 font-medium ml-2 cursor-pointer"
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y} className="text-gray-900 dark:text-white">{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading && !stats ? (
                <div className="p-8 text-center text-gray-500">Loading stats...</div>
            ) : stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Generated (Revenue) */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-50/30 dark:bg-blue-900/30 backdrop-blur-xl text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200/50 dark:border-blue-800/50 shadow-lg">
                                <DollarSign size={24} />
                            </div>
                            <span className="text-sm font-medium text-gray-400">Total Generated</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</h3>
                        <p className="text-sm text-gray-500 mt-1">Total pendapatan dari pelanggan Anda</p>
                    </div>

                    {/* Agent Commission */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-green-50/30 dark:bg-green-900/30 backdrop-blur-xl text-green-600 dark:text-green-400 rounded-lg border border-green-200/50 dark:border-green-800/50 shadow-lg">
                                <DollarSign size={24} />
                            </div>
                            <span className="text-sm font-medium text-gray-400">Komisi Agen</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.commission)}</h3>
                        <p className="text-sm text-gray-500 mt-1">Penghasilan bersih Anda</p>
                    </div>

                    {/* Paid Customers */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
                                <UserCheck size={24} />
                            </div>
                            <span className="text-sm font-medium text-gray-400">Sudah Bayar</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.paidCount}</h3>
                        <p className="text-sm text-gray-500 mt-1">Pelanggan lunas bulan ini</p>
                    </div>

                    {/* Unpaid Customers */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-red-50/30 dark:bg-red-900/30 backdrop-blur-xl text-red-600 dark:text-red-400 rounded-lg border border-red-200/50 dark:border-red-800/50 shadow-lg">
                                <UserX size={24} />
                            </div>
                            <span className="text-sm font-medium text-gray-400">Belum Bayar</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{stats.unpaidCount}</h3>
                        <p className="text-sm text-gray-500 mt-1">Pelanggan belum bayar</p>
                    </div>
                </div>
            )}
        </div>
    );
}
