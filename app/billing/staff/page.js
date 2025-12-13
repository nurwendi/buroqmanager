'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Users, UserCheck, UserX, Calendar, TrendingUp, Wallet, ShieldCheck, BarChart2, FileText, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function StaffBillingPage() {
    const [stats, setStats] = useState(null);
    const [yearlyStats, setYearlyStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [payments, setPayments] = useState([]);
    const [filteredPayments, setFilteredPayments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchStats();
        fetchYearlyStats();
        fetchPayments();
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        if (payments) {
            const lowerTerm = searchTerm.toLowerCase();
            const filtered = payments.filter(p =>
                p.username.toLowerCase().includes(lowerTerm) ||
                p.invoiceNumber?.toLowerCase().includes(lowerTerm)
            );
            setFilteredPayments(filtered);
        }
    }, [payments, searchTerm]);

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

    const fetchYearlyStats = async () => {
        try {
            const res = await fetch(`/api/billing/stats/agent?type=yearly&year=${selectedYear}`);
            if (res.ok) {
                const data = await res.json();
                setYearlyStats(data.yearlyStats);
            }
        } catch (error) {
            console.error('Failed to fetch yearly stats', error);
        }
    };

    const fetchPayments = async () => {
        try {
            const res = await fetch(`/api/billing/payments?month=${selectedMonth}&year=${selectedYear}`);
            if (res.ok) {
                const data = await res.json();
                setPayments(data);
                setFilteredPayments(data);
            }
        } catch (error) {
            console.error('Failed to fetch payments', error);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);
    };

    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1
        }
    };

    // Calculate dynamic year range (e.g. current year - 2 to current year + 1)
    const currentYear = new Date().getFullYear();
    const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

    if (loading && !stats) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6 bg-gray-50/50 min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                        Staff Dashboard
                    </h1>
                    <p className="text-gray-500 mt-1">Pantau performa dan komisi Anda</p>
                </div>

                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
                        <Calendar size={20} />
                    </div>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="bg-transparent outline-none text-gray-700 font-semibold cursor-pointer py-1"
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                        ))}
                    </select>
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="bg-transparent outline-none text-gray-700 font-semibold cursor-pointer py-1"
                    >
                        {availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {stats && (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                    {/* Total Generated (Revenue) */}
                    <motion.div
                        variants={itemVariants}
                        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-lg hover:shadow-xl transition-shadow"
                    >
                        <div className="absolute right-0 top-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-black/10 blur-xl"></div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <TrendingUp size={24} className="text-white" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider text-blue-100 bg-blue-800/30 px-2 py-1 rounded-lg">Revenue</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-blue-100 text-sm font-medium">Total Generated</p>
                                <h3 className="text-3xl font-bold tracking-tight">{formatCurrency(stats.totalRevenue)}</h3>
                            </div>
                        </div>
                    </motion.div>

                    {/* Partner Commission */}
                    <motion.div
                        variants={itemVariants}
                        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow"
                    >
                        <div className="absolute right-0 top-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <Wallet size={24} className="text-white" />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-100 bg-emerald-800/30 px-2 py-1 rounded-lg">Earnings</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-emerald-100 text-sm font-medium">Komisi Anda</p>
                                <h3 className="text-3xl font-bold tracking-tight">{formatCurrency(stats.commission)}</h3>
                            </div>
                        </div>
                    </motion.div>

                    {/* Paid Customers */}
                    <motion.div
                        variants={itemVariants}
                        className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-md border border-gray-100 group hover:border-violet-200 transition-colors"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 bg-violet-50 text-violet-600 rounded-xl group-hover:bg-violet-100 transition-colors">
                                <UserCheck size={24} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Paid</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-gray-500 text-sm font-medium">Pelanggan Lunas</p>
                            <h3 className="text-3xl font-bold text-gray-900">{stats.paidCount}</h3>
                        </div>
                        <div className="absolute bottom-0 right-0 h-1 w-full bg-gradient-to-r from-violet-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    </motion.div>

                    {/* Unpaid Customers */}
                    <motion.div
                        variants={itemVariants}
                        className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-md border border-gray-100 group hover:border-rose-200 transition-colors"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-100 transition-colors">
                                <UserX size={24} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Unpaid</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-gray-500 text-sm font-medium">Belum Bayar</p>
                            <h3 className="text-3xl font-bold text-gray-900">{stats.unpaidCount}</h3>
                        </div>
                        <div className="absolute bottom-0 right-0 h-1 w-full bg-gradient-to-r from-rose-500 to-red-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    </motion.div>
                </motion.div>
            )}

            {/* Performance Graph Section */}
            <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <BarChart2 size={20} className="text-blue-600" />
                            Performance {selectedYear}
                        </h2>
                        <p className="text-sm text-gray-500">Grafik pendapatan dan komisi bulanan</p>
                    </div>
                </div>

                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={yearlyStats}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                tickFormatter={(value) => `Rp${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                formatter={(value) => formatCurrency(value)}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Legend />
                            <Bar
                                dataKey="revenue"
                                name="Revenue"
                                fill="#3B82F6"
                                radius={[4, 4, 0, 0]}
                                barSize={20}
                            />
                            <Bar
                                dataKey="commission"
                                name="Commission"
                                fill="#10B981"
                                radius={[4, 4, 0, 0]}
                                barSize={20}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Invoices Table Section */}
            <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <FileText size={20} className="text-blue-600" />
                            Daftar Tagihan
                        </h2>
                        <p className="text-sm text-gray-500">List tagihan pelanggan Anda bulan ini</p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari pelanggan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pelanggan</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredPayments.length > 0 ? (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <span className="font-mono text-sm text-gray-600">{payment.invoiceNumber}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900">{payment.username}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {new Date(payment.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${payment.status === 'completed'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                {payment.status === 'completed' ? 'Lunas' : 'Belum Bayar'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-medium text-gray-900">
                                            {formatCurrency(payment.amount)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500">
                                        Tidak ada data tagihan untuk periode ini.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Additional Info / Instructions */}
            <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="bg-indigo-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-12 opacity-10 transform rotate-12">
                    <ShieldCheck size={120} />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <h3 className="text-xl font-bold mb-2">Info Partner</h3>
                    <p className="text-indigo-200 mb-6">
                        Komisi dihitung berdasarkan pembayaran yang statusnya "Completed".
                        Pastikan memverifikasi pembayaran dari pelanggan agar komisi masuk ke akun Anda.
                    </p>
                    <div className="flex gap-4">
                        <div className="px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
                            <span className="block text-xs text-indigo-300 uppercase tracking-widest">Rate Agen</span>
                            <span className="text-lg font-bold">Variable</span>
                        </div>
                        <div className="px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
                            <span className="block text-xs text-indigo-300 uppercase tracking-widest">Status</span>
                            <span className="text-lg font-bold text-green-400 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                Active
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

        </div>
    );
}
