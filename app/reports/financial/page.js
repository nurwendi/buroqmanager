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
                        <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow-md">{t('billing.reports.title')}</h1>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="px-3 py-1.5 border border-white/20 rounded-lg bg-white/5 backdrop-blur-md text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-3 py-1.5 border border-white/20 rounded-lg bg-white/5 backdrop-blur-md text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
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
                        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl p-3 rounded-xl shadow-lg border border-white/20 print:shadow-none print:bg-white print:border-black/10">
                            <p className="text-[10px] font-bold text-blue-100 uppercase">{t('billing.reports.revenue')}</p>
                            <h3 className="text-lg font-bold text-blue-400 print:text-blue-600">{formatCurrency(data.summary.totalRevenue)}</h3>
                        </div>
                        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl p-3 rounded-xl shadow-lg border border-white/20 print:shadow-none print:bg-white print:border-black/10">
                            <p className="text-[10px] font-bold text-blue-100 uppercase">{t('billing.reports.unpaid')}</p>
                            <h3 className="text-lg font-bold text-orange-400 print:text-orange-600">{formatCurrency(data.summary.totalUnpaid)}</h3>
                        </div>
                        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl p-3 rounded-xl shadow-lg border border-white/20 print:shadow-none print:bg-white print:border-black/10">
                            <p className="text-[10px] font-bold text-blue-100 uppercase">{t('billing.reports.expenses')}</p>
                            <h3 className="text-lg font-bold text-red-400 print:text-red-600">{formatCurrency(data.summary.totalCommissions)}</h3>
                        </div>
                        <div className="bg-blue-600/20 backdrop-blur-xl p-3 rounded-xl shadow-lg border border-blue-500/30 print:shadow-none print:bg-blue-50 print:border-black/10">
                            <p className="text-[10px] font-bold text-white uppercase">{t('billing.reports.netIncome')}</p>
                            <h3 className="text-lg font-bold text-white print:text-black">{formatCurrency(data.summary.netIncome)}</h3>
                        </div>
                    </div>

                    {/* Staff Performance Table (Compact) */}
                    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 overflow-hidden print:shadow-none print:bg-white print:border-black/10">
                        <div className="bg-white/5 px-4 py-2 border-b border-white/10 print:bg-gray-50 print:border-gray-100">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white print:text-black">{t('billing.reports.staffPerformance')}</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs">
                                <thead className="bg-white/5 print:bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-bold text-blue-100 print:text-gray-500">{t('billing.reports.staff')}</th>
                                        <th className="px-4 py-2 text-center font-bold text-blue-100 print:text-gray-500">{t('billing.reports.transactionsCount')}</th>
                                        <th className="px-4 py-2 text-right font-bold text-blue-100 print:text-gray-500">{t('billing.reports.gross')}</th>
                                        <th className="px-4 py-2 text-right font-bold text-blue-100 print:text-gray-500">{t('billing.reports.commission')}</th>
                                        <th className="px-4 py-2 text-right font-bold text-blue-100 print:text-gray-500">{t('billing.reports.netProfit')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10 print:divide-gray-100">
                                    {data.staffBreakdown.map((s, i) => (
                                        <tr key={i} className="hover:bg-white/5 print:hover:bg-transparent">
                                            <td className="px-4 py-1.5 font-bold text-white print:text-black">{s.name}</td>
                                            <td className="px-4 py-1.5 text-center text-white font-medium print:text-black">{s.count}</td>
                                            <td className="px-4 py-1.5 text-right text-white font-medium print:text-black">{formatCurrency(s.revenue)}</td>
                                            <td className="px-4 py-1.5 text-right font-bold text-red-400 print:text-red-500">-{formatCurrency(s.commission)}</td>
                                            <td className="px-4 py-1.5 text-right font-bold text-green-400 print:text-green-600">{formatCurrency(s.revenue - s.commission)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* All Payments Table (Detail) */}
                    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 overflow-hidden print:shadow-none print:bg-white print:border-black/10">
                        <div className="bg-white/5 px-4 py-2 border-b border-white/10 print:bg-gray-50 print:border-gray-100">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-white print:text-black">{t('billing.reports.allPayments')}</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs print:text-[10px]">
                                <thead className="bg-white/5 print:bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-bold text-blue-100 print:text-gray-500">{t('billing.reports.no')}</th>
                                        <th className="px-3 py-2 text-left font-bold text-blue-100 print:text-gray-500">{t('billing.reports.customerId')}</th>
                                        <th className="px-3 py-2 text-left font-bold text-blue-100 print:text-gray-500">{t('billing.reports.customerName')}</th>
                                        <th className="px-3 py-2 text-left font-bold text-blue-100 print:text-gray-500">{t('billing.reports.agent')}</th>
                                        <th className="px-3 py-2 text-left font-bold text-blue-100 print:text-gray-500">{t('billing.reports.paymentDate')}</th>
                                        <th className="px-3 py-2 text-right font-bold text-blue-100 print:text-gray-500">{t('billing.reports.amount')}</th>
                                        <th className="px-3 py-2 text-left font-bold text-blue-100 print:text-gray-500">{t('billing.reports.description')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10 print:divide-gray-100">
                                    {data.allPayments.map((p, i) => (
                                        <tr key={i} className={`
                                            ${p.status !== 'completed' ? 'bg-red-500/10 text-red-400 print:bg-red-50 print:text-red-700 font-bold' : 'text-white font-medium hover:bg-white/5'}
                                        `}>
                                            <td className="px-3 py-1 font-mono text-white/80 font-bold print:text-black">{i + 1}</td>
                                            <td className={`px-3 py-1 ${p.status === 'completed' ? 'text-blue-200 print:text-black font-bold' : ''}`}>{p.customerNumber}</td>
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
                    /* Reset all possible parent containers that might cause blank pages */
                    html, body, 
                    div.relative.min-h-screen, 
                    div.min-h-screen,
                    div.overflow-x-auto,
                    div.space-y-6,
                    div.space-y-4 {
                        height: auto !important;
                        min-height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: visible !important;
                        display: block !important;
                        width: 100% !important;
                        max-width: none !important;
                        filter: none !important;
                        transform: none !important;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    * {
                        color: black !important;
                        background-color: transparent !important;
                        background-image: none !important;
                        text-shadow: none !important;
                        box-shadow: none !important;
                        backdrop-filter: none !important;
                        -webkit-backdrop-filter: none !important;
                        border-color: #000 !important;
                    }
                    .text-red-400, .text-red-500, .text-red-600, .text-red-700,
                    .text-green-400, .text-green-500, .text-green-600,
                    .text-blue-400, .text-blue-500, .text-blue-600,
                    .text-orange-400, .text-orange-600 {
                        color: black !important;
                    }
                    /* Small indicators can keep subtle gray if needed, but per request "full hitam putih" */
                    .text-white\/40, .text-white\/50, .text-white\/60, .text-gray-400, .text-gray-500 {
                        color: #000 !important;
                    }
                    /* Table and Divider borders */
                    .border, .border-b, .border-t, .divide-y > * {
                        border-color: #000 !important;
                        border-width: 1px !important;
                    }
                    .bg-white\/10, .bg-black\/20, .bg-blue-600\/20, .bg-white\/5, .bg-gray-50, .bg-red-500\/10 {
                        background: none !important;
                        background-color: transparent !important;
                    }
                    /* Ensure tables are strictly black and white */
                    table {
                        width: 100% !important;
                        border: 1px solid #000 !important;
                        page-break-inside: auto;
                        border-collapse: collapse !important;
                    }
                    th, td {
                        border: 1px solid #000 !important;
                        color: #000 !important;
                        padding: 4px 8px !important;
                        word-break: break-word !important;
                        max-width: none !important;
                        white-space: normal !important;
                    }
                    .truncate {
                        overflow: visible !important;
                        white-space: normal !important;
                        text-overflow: clip !important;
                        max-width: none !important;
                    }
                    tr {
                        page-break-inside: avoid !important;
                        page-break-after: auto !important;
                    }
                    /* Hide non-printable elements */
                    nav, .fixed, .print\:hidden {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
