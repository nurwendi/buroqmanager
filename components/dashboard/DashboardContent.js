'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboard } from '@/contexts/DashboardContext';
import { sendNotification } from '@/components/NotificationManager';
import StaffBillingPage from '@/app/billing/staff/page';

// Widgets
import FinancialStats from './FinancialStats';
import PppoeStats from './PppoeStats';
import SuperadminStats from './SuperadminStats';
import PendingRegistrationStats from './PendingRegistrationStats';





export default function DashboardContent() {
    const { t } = useLanguage();
    const { preferences } = useDashboard();
    const { dashboard = {}, notifications = {} } = preferences || {};
    const { visibleWidgets = {}, refreshInterval } = dashboard;

    const [stats, setStats] = useState({
        pppoeActive: 0,
        pppoeOffline: 0,
        cpuLoad: 0,
        memoryUsed: 0,
        memoryTotal: 0,
        memoryTotal: 0,
        temperature: 0,
        voltage: 0, // Add initial state
        adminCount: 0,
        totalCustomers: 0,
        interfaces: [],
        billing: {
            totalRevenue: 0,
            thisMonthRevenue: 0,
            todaysRevenue: 0,
            totalUnpaid: 0,
            pendingCount: 0
        },
        agentStats: null,
        pendingRegistrations: 0
    });
    const [userRole, setUserRole] = useState(null);
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // Fetch User Role and Name
    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                setUserRole(data.user.role);
                setUsername(data.user.fullName || data.user.username);
            })
            .catch(err => console.error('Failed to fetch user role', err));
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            // 1. Fetch Fast/Local Data (Billing, Agents, Registrations) - Unblock UI ASAP
            const fetchLocalData = async () => {
                try {
                    const [billingRes, agentStatsRes, regsRes] = await Promise.all([
                        fetch('/api/billing/stats'),
                        fetch(`/api/billing/stats/agent?month=${new Date().getMonth()}&year=${new Date().getFullYear()}`),
                        fetch('/api/registrations')
                    ]);

                    const newStats = {};

                    if (billingRes.ok) {
                        const data = await billingRes.json();
                        newStats.billing = data;
                    }

                    if (agentStatsRes.ok) {
                        const data = await agentStatsRes.json();
                        // Store agent stats for both admin (grandTotal) and staff (myStats)
                        newStats.agentStats = data;
                    }

                    if (regsRes.ok) {
                        const data = await regsRes.json();
                        // Assuming the API returns an array of pending registrations
                        newStats.pendingRegistrations = Array.isArray(data) ? data.length : 0;
                    }

                    setStats(prev => ({ ...prev, ...newStats }));
                } catch (e) {
                    console.error('Failed to fetch local stats', e);
                } finally {
                    setLoading(false); // Unblock UI immediately after local data
                }
            };

            // 2. Fetch Slow/External Data (Mikrotik, Traffic) - in parallel but doesn't block UI
            const fetchExternalData = async () => {
                const fetchWithTimeout = (url, timeout = 10000) => {
                    return Promise.race([
                        fetch(url),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error(`Timeout fetching ${url}`)), timeout)
                        )
                    ]);
                };

                // Individual fetches so one failure doesn't stop others

                // Dashboard System Stats (CPU, PPPoE Active)
                fetchWithTimeout('/api/dashboard/stats').then(async (res) => {
                    if (res.ok) {
                        const data = await res.json();
                        setStats(prev => ({
                            ...prev,
                            pppoeActive: data.pppoeActive,
                            pppoeOffline: data.pppoeOffline,
                            cpuLoad: data.cpuLoad,
                            memoryUsed: data.memoryUsed,
                            memoryTotal: data.memoryTotal,
                            temperature: data.temperature,
                            voltage: data.voltage,
                            interfaces: data.interfaces,
                            adminCount: data.adminCount,
                            totalCustomers: data.totalCustomers,
                            serverCpuLoad: data.serverCpuLoad,
                            serverMemoryUsed: data.serverMemoryUsed,
                            serverMemoryTotal: data.serverMemoryTotal
                        }));
                    }
                }).catch(e => console.warn('Dashboard stats fetch error:', e));

            };

            // Execute
            await fetchLocalData(); // Wait for local data
            fetchExternalData(); // Fire and forget external data
            setLastUpdate(new Date());

        } catch (error) {
            console.error('Failed to fetch stats', error);
            setLoading(false);
        }
    }, [stats]);

    useEffect(() => {
        fetchStats();
    }, []);

    // Refresh Interval Effect
    useEffect(() => {
        if (refreshInterval > 0) {
            const interval = setInterval(fetchStats, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [refreshInterval, fetchStats]);





    // Helpers
    const { display = {} } = preferences || {};

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

        // Check preference
        if (display.memoryUnit && display.memoryUnit !== 'auto') {
            const unitIndex = sizes.indexOf(display.memoryUnit.toUpperCase());
            if (unitIndex !== -1) {
                return parseFloat((bytes / Math.pow(k, unitIndex)).toFixed(2)) + ' ' + sizes[unitIndex];
            }
        }

        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    const formatBitsPerSecond = (bps) => {
        if (!bps || bps === 0) return '0 bps';
        const k = 1000;
        const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];

        // Check preference
        if (display.bandwidthUnit && display.bandwidthUnit !== 'auto') {
            // bandwidthUnit might be 'mbps', 'kbps' etc.
            // Map to index?
            // sizes: 0=bps, 1=Kbps, 2=Mbps, 3=Gbps
            const unitMap = { 'bps': 0, 'kbps': 1, 'mbps': 2, 'gbps': 3 };
            const targetIndex = unitMap[display.bandwidthUnit.toLowerCase()];

            if (targetIndex !== undefined) {
                return parseFloat((bps / Math.pow(k, targetIndex)).toFixed(2)) + ' ' + sizes[targetIndex];
            }
        }

        const i = Math.floor(Math.log(bps) / Math.log(k));
        return parseFloat((bps / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };


    if (loading || userRole === null) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600 dark:text-gray-300">{t('common.loading')}</div>
            </div>
        );
    }

    // Show Staff Dashboard for non-admin roles
    if (userRole === 'staff' || userRole === 'agent' || userRole === 'technician' || userRole === 'editor') {
        return <StaffBillingPage />;
    }

    if (userRole === 'customer') {
        const CustomerDashboard = require('./CustomerDashboard').default;
        return <CustomerDashboard />;
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            className="space-y-4 md:space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{t('dashboard.title')}</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">
                        Selamat datang <span className="font-semibold text-blue-600 dark:text-blue-400 capitalize">{username}</span>
                    </p>
                </div>
                <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400 sm:hidden">
                        Updated: {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                        Last update: {lastUpdate.toLocaleTimeString()}
                    </span>
                    <button
                        onClick={fetchStats}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                    >
                        <RefreshCw size={18} />
                        {t('common.refresh')}
                    </button>
                </div>
            </motion.div>

            {/* Widgets */}
            <AnimatePresence>
                {userRole === 'superadmin' ? (
                    <SuperadminStats key="superadmin" stats={stats} />
                ) : (
                    <>
                        {visibleWidgets.financial && userRole !== 'staff' && (
                            <FinancialStats key="financial" stats={stats} formatCurrency={formatCurrency} />
                        )}

                        <PendingRegistrationStats key="pending" stats={stats} />

                        {visibleWidgets.pppoe && (
                            <PppoeStats key="pppoe" stats={stats} />
                        )}
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
