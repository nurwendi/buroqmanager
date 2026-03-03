'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Users, ArrowLeft, Printer, Download, Calendar, TrendingUp, AlertCircle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function FinancialReportPage() {
    const { t, resolvedLanguage } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [appSettings, setAppSettings] = useState({ appName: 'Buroq Manager', logoUrl: '' });

    const months = resolvedLanguage === 'id' ?
        ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'] :
        ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    useEffect(() => {
        fetchReport();
        fetchAppSettings();
    }, [selectedMonth, selectedYear]);

    const fetchAppSettings = async () => {
        try {
            const res = await fetch('/api/app-settings');
            if (res.ok) {
                setAppSettings(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch app settings');
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/financial?month=${selectedMonth}&year=${selectedYear}`);
            if (res.ok) {
                setData(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch report:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat(resolvedLanguage === 'id' ? 'id-ID' : 'en-US', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(resolvedLanguage === 'id' ? 'id-ID' : 'en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const handlePrint = () => {
        const yy = selectedYear.toString().slice(-2);
        const mm = (selectedMonth + 1).toString().padStart(2, '0');
        const monthName = months[selectedMonth];
        const ownerName = data?.ownerName || 'Owner';

        const originalTitle = document.title;
        document.title = `${yy}${mm} ${monthName} ${ownerName} Buroq Sarana Informatika`;
        window.print();
        document.title = originalTitle;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-4 pb-20 print:p-0 print:m-0 print:space-y-0">
            {/* Header Controls */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/billing" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
                    </Link>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{t('billing.reports.title')}</h1>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-accent text-white px-4 py-1.5 rounded-lg hover:bg-accent/90 transition-all font-medium text-sm"
                    >
                        <Printer size={16} />
                        <span>{t('billing.reports.printReport')}</span>
                    </button>
                </div>
            </div>

            {/* Print Header (Only visible on print) */}
            <div className="hidden print:flex flex-col items-center text-center border-b-2 border-black pb-4 mb-4">
                {appSettings.logoUrl && <img src={appSettings.logoUrl} alt="Logo" className="h-10 mb-2" />}
                <h1 className="text-base font-bold uppercase">{appSettings.appName}</h1>
                <p className="text-[10px] text-gray-600 font-medium">{t('billing.reports.title')} - {months[selectedMonth]} {selectedYear}</p>
                <div className="w-full flex justify-between mt-2 text-[8px]">
                    <p>{t('billing.reports.printedAt')}: {new Date().toLocaleString()}</p>
                    <p>{t('billing.reports.statusFinal')}</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                </div>
            ) : data ? (
                <div className="space-y-6 print:space-y-4">
                    {/* Summary Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-100 print:shadow-none print:border-black/10">
                            <p className="text-[10px] font-medium text-gray-500 uppercase">{t('billing.reports.revenue')}</p>
                            <h3 className="text-lg font-bold text-blue-600">{formatCurrency(data.summary.totalRevenue)}</h3>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-100 print:shadow-none print:border-black/10">
                            <p className="text-[10px] font-medium text-gray-500 uppercase">{t('billing.reports.unpaid')}</p>
                            <h3 className="text-lg font-bold text-orange-600">{formatCurrency(data.summary.totalUnpaid)}</h3>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-gray-100 print:shadow-none print:border-black/10">
                            <p className="text-[10px] font-medium text-gray-500 uppercase">{t('billing.reports.expenses')}</p>
                            <h3 className="text-lg font-bold text-red-600">{formatCurrency(data.summary.totalCommissions)}</h3>
                        </div>
                        <div className="bg-accent/10 dark:bg-accent/20 p-3 rounded-lg shadow border border-accent/20 print:shadow-none print:border-black/10">
                            <p className="text-[10px] font-medium text-accent uppercase">{t('billing.reports.netIncome')}</p>
                            <h3 className="text-lg text-accent dark:text-accent " style={{ fontWeight: '400' }}>{formatCurrency(data.summary.netIncome)}</h3>
                        </div>
                    </div>

                    {/* Staff Performance Table (Compact) */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 overflow-hidden print:shadow-none print:border-black/10">
                        <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-b border-gray-100">
                            <h3 className="text-xs font-bold uppercase tracking-wider">{t('billing.reports.staffPerformance')}</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs">
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-gray-500">{t('billing.reports.staff')}</th>
                                        <th className="px-4 py-2 text-center text-gray-500">{t('billing.reports.transactionsCount')}</th>
                                        <th className="px-4 py-2 text-right text-gray-500">{t('billing.reports.gross')}</th>
                                        <th className="px-4 py-2 text-right text-gray-500">{t('billing.reports.commission')}</th>
                                        <th className="px-4 py-2 text-right text-gray-500">{t('billing.reports.netProfit')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {data.staffBreakdown.map((s, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-1.5 font-medium">{s.name}</td>
                                            <td className="px-4 py-1.5 text-center">{s.count}</td>
                                            <td className="px-4 py-1.5 text-right">{formatCurrency(s.revenue)}</td>
                                            <td className="px-4 py-1.5 text-right text-red-500">-{formatCurrency(s.commission)}</td>
                                            <td className="px-4 py-1.5 text-right font-bold text-green-600">{formatCurrency(s.revenue - s.commission)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* All Payments Table (Detail) */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 overflow-hidden print:shadow-none print:border-black/10">
                        <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-b border-gray-100">
                            <h3 className="text-xs font-bold uppercase tracking-wider">{t('billing.reports.allPayments')}</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs print:text-[10px]">
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-gray-500">{t('billing.reports.no')}</th>
                                        <th className="px-3 py-2 text-left text-gray-500">{t('billing.reports.customerId')}</th>
                                        <th className="px-3 py-2 text-left text-gray-500">{t('billing.reports.customerName')}</th>
                                        <th className="px-3 py-2 text-left text-gray-500 font-bold">{t('billing.reports.agent')}</th>
                                        <th className="px-3 py-2 text-left text-gray-500">{t('billing.reports.paymentDate')}</th>
                                        <th className="px-3 py-2 text-right text-gray-500">{t('billing.reports.amount')}</th>
                                        <th className="px-3 py-2 text-left text-gray-500">{t('billing.reports.description')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {data.allPayments.map((p, i) => (
                                        <tr key={i} className={`
                                            ${p.status !== 'completed' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 print:bg-red-100 print:text-red-700' : ''}
                                        `}>
                                            <td className="px-3 py-1 font-mono text-gray-400 print:text-black">{i + 1}</td>
                                            <td className={`px-3 py-1 ${p.status === 'completed' ? 'text-accent print:text-black' : ''}`} style={{ fontWeight: '400' }}>{p.customerNumber}</td>
                                            <td className="px-3 py-1 font-medium">{p.customerName}</td>
                                            <td className="px-3 py-1 font-medium">{p.agentName}</td>
                                            <td className="px-3 py-1">{formatDate(p.date)}</td>
                                            <td className="px-3 py-1 text-right font-bold">{formatCurrency(p.amount)}</td>
                                            <td className="px-3 py-1 truncate max-w-[150px]">{p.description || '-'}</td>
                                        </tr>
                                    ))}
                                    {data.allPayments.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic font-medium">{t('billing.reports.noData')}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 flex items-center gap-3 text-red-600">
                    <AlertCircle size={20} />
                    <span>{t('messages.failedToLoadReport')}</span>
                </div>
            )}

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 1cm;
                        size: portrait;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    * {
                        color: black !important;
                        text-shadow: none !important;
                        box-shadow: none !important;
                    }
                    .text-red-600, .text-red-700, .bg-red-100 {
                        color: #b91c1c !important; /* Force dark red for visibility */
                    }
                    .bg-red-100 {
                        background-color: #fee2e2 !important;
                    }
                    h1, h2, h3, th {
                        font-weight: 900 !important;
                        color: black !important;
                    }
                    table {
                        page-break-inside: auto;
                        border-collapse: collapse !important;
                    }
                    tr {
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }
                    nav, .fixed, .print\\:hidden {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
