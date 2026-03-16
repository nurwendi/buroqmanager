'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Users, UserCheck, UserX, Calendar, TrendingUp, Wallet, ShieldCheck, BarChart2, FileText, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function StaffBillingPage() {
    const { t, resolvedLanguage } = useLanguage();
    const [stats, setStats] = useState(null);
    const [yearlyStats, setYearlyStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [payments, setPayments] = useState([]);
    const [filteredPayments, setFilteredPayments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [user, setUser] = useState({ name: '', avatar: '', role: '' });

    useEffect(() => {
        // Fetch User Info
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user) {
                    setUser({
                        name: data.user.fullName || data.user.username,
                        avatar: data.user.avatar || '',
                        role: data.user.role
                    });
                }
            })
            .catch(err => console.error('Failed to fetch user', err));

        fetchStats();
        fetchYearlyStats();
        fetchPayments();
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        if (payments) {
            const lowerTerm = searchTerm.toLowerCase();
            const filtered = payments.filter(p =>
                (p.username || '').toLowerCase().includes(lowerTerm) ||
                (p.invoiceNumber || '').toLowerCase().includes(lowerTerm)
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
        return new Intl.NumberFormat(resolvedLanguage === 'id' ? 'id-ID' : 'en-US', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);
    };

    const months = resolvedLanguage === 'id' ?
        ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'] :
        ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
        <div className="space-y-8 pb-12 min-h-screen">
            {/* Premium Header - Sharp Image & No Blur */}
            <div className="relative mb-12 sm:mb-14 -mx-6 -mt-6 rounded-none">
                {/* Banner Area - Sharp Image */}
                <div className="relative h-48 sm:h-64 w-full bg-black/20 border-b border-white/10 shadow-none outline-none rounded-none overflow-hidden">
                    <img 
                        src="/dashboard-bg.png" 
                        alt="Banner" 
                        className="w-full h-full object-cover scale-105"
                        style={{ imageRendering: "high-quality" }}
                    />
                    <div className="absolute inset-0 bg-black/30"></div>
                    
                    {/* Date Selector - Absolute Positioned on Banner */}
                    <div className="absolute top-6 right-6 z-20">
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 text-white p-2 rounded-xl shadow-lg">
                            <div className="p-1 px-2 text-xs font-bold uppercase tracking-widest opacity-80 border-r border-white/10 italic">
                                {selectedYear}
                            </div>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="bg-transparent outline-none font-bold cursor-pointer text-sm appearance-none pr-1"
                            >
                                {months.map((m, i) => (
                                    <option key={i} value={i} className="text-gray-900">{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Overlapping Profile Section */}
                <div className="relative -mt-20 sm:-mt-24 flex flex-col items-center z-10 px-4">
                    <div className="relative group">
                        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-[6px] border-white shadow-xl bg-gradient-to-br from-indigo-500 to-blue-700 flex items-center justify-center overflow-hidden transition-all duration-500 hover:scale-105">
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <span className="text-5xl sm:text-7xl font-bold text-white uppercase drop-shadow-lg">
                                    {user.name ? user.name.charAt(0) : 'S'}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 text-center">
                        <h1 className="text-[10px] sm:text-xs tracking-[0.4em] uppercase text-blue-100 font-bold mb-1">
                            {t('billing.staffDashboardTitle')}
                        </h1>
                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-md">
                            {t('dashboard.welcome') || 'Selamat Datang'},{' '}
                            <span className="text-blue-200 capitalize">
                                {user.name}
                            </span>
                            !
                        </h2>
                        <div className="mt-2 flex items-center justify-center gap-2">
                           <span className="px-3 py-0.5 bg-white/10 backdrop-blur-md text-white rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/20">
                              {user.role}
                           </span>
                        </div>
                    </div>
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
                                <span className="text-xs font-bold uppercase tracking-wider text-blue-100 bg-blue-800/30 px-2 py-1 rounded-lg">{t('common.revenue')}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-blue-100 text-sm font-medium">{t('billing.totalGross')}</p>
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
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-100 bg-emerald-800/30 px-2 py-1 rounded-lg">{t('billing.earnings')}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-emerald-100 text-sm font-medium">{t('billing.partnerCommission')}</p>
                                <h3 className="text-3xl font-bold tracking-tight">{formatCurrency(stats.commission)}</h3>
                            </div>
                        </div>
                    </motion.div>

                    {/* Paid Customers */}
                    <motion.div
                        variants={itemVariants}
                        className="relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl p-6 shadow-2xl border border-white/20 group hover:bg-white/20 transition-all"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 bg-violet-400/20 text-violet-300 rounded-xl border border-white/10">
                                <UserCheck size={24} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-100">{t('billing.paid')}</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-white/80 text-sm font-medium">{t('billing.paid')} {t('billing.customer')}</p>
                            <h3 className="text-3xl font-bold text-white drop-shadow-md">{stats.paidCount}</h3>
                        </div>
                        <div className="absolute bottom-0 right-0 h-1 w-full bg-gradient-to-r from-violet-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    </motion.div>
 
                    {/* Unpaid Customers */}
                    <motion.div
                        variants={itemVariants}
                        className="relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-xl p-6 shadow-2xl border border-white/20 group hover:bg-white/20 transition-all"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="p-3 bg-rose-400/20 text-rose-300 rounded-xl border border-white/10">
                                <UserX size={24} />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-100">{t('billing.unpaid')}</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-white/80 text-sm font-medium">{t('billing.unpaid')}</p>
                            <h3 className="text-3xl font-bold text-white drop-shadow-md">{stats.unpaidCount}</h3>
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
                className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/20"
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 drop-shadow-md">
                            <BarChart2 size={20} className="text-blue-400" />
                            {t('billing.performance')} {selectedYear}
                        </h2>
                        <p className="text-sm text-blue-100">{t('billing.performanceSub')}</p>
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
                                tick={{ fill: '#E5E7EB', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#E5E7EB', fontSize: 12 }}
                                tickFormatter={(value) => `Rp${(value / 1000).toFixed(0)}k`}
                            />
                             <Tooltip
                                formatter={(value) => formatCurrency(value)}
                                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            <Bar
                                dataKey="revenue"
                                name={t('common.revenue')}
                                fill="#3B82F6"
                                radius={[4, 4, 0, 0]}
                                barSize={20}
                            />
                            <Bar
                                dataKey="commission"
                                name={t('billing.commission')}
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
                className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/20"
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 drop-shadow-md">
                            <FileText size={20} className="text-blue-400" />
                            {t('billing.invoiceList')}
                        </h2>
                        <p className="text-sm text-blue-100">{t('billing.invoiceListSub')}</p>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" size={18} />
                        <input
                            type="text"
                            placeholder={t('billing.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-full md:w-64 text-white placeholder-white/30 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 uppercase tracking-wider">
                                <th className="p-4 text-xs font-semibold text-blue-100">{t('billing.invoice')}</th>
                                <th className="p-4 text-xs font-semibold text-blue-100">{t('billing.customer')}</th>
                                <th className="p-4 text-xs font-semibold text-blue-100">{t('common.date')}</th>
                                <th className="p-4 text-xs font-semibold text-blue-100">{t('common.status')}</th>
                                <th className="p-4 text-xs font-semibold text-blue-100 text-right">{t('common.amount')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredPayments.length > 0 ? (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <span className="font-mono text-xs text-white/80">{payment.invoiceNumber}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-white">{payment.username}</div>
                                        </td>
                                        <td className="p-4 text-xs text-white/80">
                                            {new Date(payment.date).toLocaleDateString(resolvedLanguage === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${payment.status === 'completed'
                                                ? 'bg-green-400/10 text-green-300 border-green-400/20'
                                                : 'bg-red-400/10 text-red-300 border-red-400/20'
                                                }`}>
                                                {payment.status === 'completed' ? t('billing.paid') : t('billing.unpaid')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-bold text-white">
                                            {formatCurrency(payment.amount)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500">
                                        {t('billing.noCommissions')}
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
                className="bg-black/20 backdrop-blur-xl rounded-2xl p-6 md:p-8 text-white shadow-2xl border border-white/10 relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-12 opacity-10 transform rotate-12">
                    <ShieldCheck size={120} />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <h3 className="text-xl font-bold mb-2 drop-shadow-md text-white">{t('billing.infoPartner')}</h3>
                    <p className="text-blue-100 mb-6 italic">
                        {t('billing.infoPartnerDesc')}
                    </p>
                    <div className="flex gap-4">
                        <div className="px-4 py-2 bg-white/5 rounded-xl backdrop-blur-md border border-white/10">
                            <span className="block text-[10px] text-blue-100 uppercase tracking-widest font-bold">{t('billing.agentRate')}</span>
                            <span className="text-lg font-bold text-blue-300">Variable</span>
                        </div>
                        <div className="px-4 py-2 bg-white/5 rounded-xl backdrop-blur-md border border-white/10">
                            <span className="block text-[10px] text-blue-100 uppercase tracking-widest font-bold">{t('common.status')}</span>
                            <span className="text-lg font-bold text-green-400 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span>
                                {t('billing.active')}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

        </div>
    );
}
