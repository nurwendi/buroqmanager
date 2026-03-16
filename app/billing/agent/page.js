'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Users, UserCheck, UserX, Calendar } from 'lucide-react';

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

    if (loading && !stats) {
        return <div className="p-8 text-center text-white/60 font-medium">{t('messages.loading')}</div>;
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-md">Agent Dashboard</h1>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-lg shadow-sm border border-white/20">
                    <Calendar className="text-blue-100" size={20} />
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-transparent outline-none text-white font-bold"
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="bg-transparent outline-none text-white font-bold ml-2"
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Generated (Revenue) */}
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 shadow-2xl border border-white/20">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-400/20 text-blue-300 rounded-lg border border-white/10 shadow-lg">
                                <DollarSign size={24} />
                            </div>
                            <span className="text-sm font-bold text-blue-100">Total Generated</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</h3>
                        <p className="text-sm text-blue-100/80 font-medium mt-1">Total pendapatan dari pelanggan Anda</p>
                    </div>

                    {/* Agent Commission */}
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 shadow-2xl border border-white/20">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-green-400/20 text-green-300 rounded-lg border border-white/10 shadow-lg">
                                <DollarSign size={24} />
                            </div>
                            <span className="text-sm font-bold text-blue-100">Komisi Agen</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white">{formatCurrency(stats.commission)}</h3>
                        <p className="text-sm text-green-300/80 font-medium mt-1">Penghasilan bersih Anda</p>
                    </div>

                    {/* Paid Customers */}
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 shadow-2xl border border-white/20">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-400/20 text-purple-300 rounded-lg border border-white/10 shadow-lg">
                                <UserCheck size={24} />
                            </div>
                            <span className="text-sm font-bold text-blue-100">Sudah Bayar</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white">{stats.paidCount}</h3>
                        <p className="text-sm text-blue-100/80 font-medium mt-1">Pelanggan lunas bulan ini</p>
                    </div>

                    {/* Unpaid Customers */}
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 shadow-2xl border border-white/20">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-red-400/20 text-red-300 rounded-lg border border-white/10 shadow-lg">
                                <UserX size={24} />
                            </div>
                            <span className="text-sm font-bold text-blue-100">Belum Bayar</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white">{stats.unpaidCount}</h3>
                        <p className="text-sm text-red-300/80 font-medium mt-1">Pelanggan belum bayar</p>
                    </div>
                </div>
            )}
        </div>
    );
}
