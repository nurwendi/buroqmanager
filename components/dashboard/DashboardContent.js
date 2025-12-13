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
import RealtimeTraffic from './RealtimeTraffic';
import SystemHealth from './SystemHealth';
// Charts removed
import SfpStats from './SfpStats';

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
        interfaces: [],
        billing: {
            totalRevenue: 0,
            thisMonthRevenue: 0,
            todaysRevenue: 0,
            totalUnpaid: 0,
            pendingCount: 0
        },
        agentStats: null
    });
    const [trafficData, setTrafficData] = useState([]);
    const [realtimeTraffic, setRealtimeTraffic] = useState({
        downloadRate: 0,
        uploadRate: 0,
        downloadBytes: 0,
        uploadBytes: 0
    });
    const [temperatureHistory, setTemperatureHistory] = useState([]);
    const [cpuHistory, setCpuHistory] = useState([]);
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
                setUsername(data.user.username);
            })
            .catch(err => console.error('Failed to fetch user role', err));
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const [dashboardRes, billingRes, agentStatsRes, trafficRes, realtimeRes, tempRes, cpuRes] = await Promise.all([
                fetch('/api/dashboard/stats'),
                fetch('/api/billing/stats'),
                fetch(`/api/billing/stats/agent?month=${new Date().getMonth()}&year=${new Date().getFullYear()}`),
                fetch('/api/traffic'),
                fetch('/api/traffic/realtime'),
                fetch('/api/dashboard/temperature'),
                fetch('/api/dashboard/cpu')
            ]);

            const newStats = { ...stats };

            if (trafficRes.ok) {
                const data = await trafficRes.json();
                const processedData = [];
                for (let i = 1; i < data.length; i++) {
                    const prev = data[i - 1];
                    const curr = data[i];
                    const timeDiffSeconds = (curr.timestamp - prev.timestamp) / 1000;

                    if (timeDiffSeconds > 0) {
                        const downloadBytesPerSec = (curr.rx - prev.rx) / timeDiffSeconds;
                        const uploadBytesPerSec = (curr.tx - prev.tx) / timeDiffSeconds;
                        const downloadMbps = Math.max(0, (downloadBytesPerSec * 8) / 1000000);
                        const uploadMbps = Math.max(0, (uploadBytesPerSec * 8) / 1000000);

                        processedData.push({
                            timestamp: curr.timestamp,
                            date: new Date(curr.timestamp).toLocaleString(),
                            download: parseFloat(downloadMbps.toFixed(2)),
                            upload: parseFloat(uploadMbps.toFixed(2))
                        });
                    }
                }
                setTrafficData(processedData);
            }

            if (dashboardRes.ok) {
                const data = await dashboardRes.json();
                newStats.pppoeActive = data.pppoeActive;
                newStats.pppoeOffline = data.pppoeOffline;
                newStats.cpuLoad = data.cpuLoad;
                newStats.memoryUsed = data.memoryUsed;
                newStats.memoryTotal = data.memoryTotal;
                newStats.temperature = data.temperature;
                newStats.voltage = data.voltage; // Add this line
                newStats.sfpData = data.sfpData; // Ensure this is also mapped if not already
                newStats.interfaces = data.interfaces;
            }

            if (billingRes.ok) {
                const data = await billingRes.json();
                newStats.billing = data;
            }

            if (agentStatsRes.ok) {
                const data = await agentStatsRes.json();
                if (data.role === 'staff') {
                    newStats.agentStats = data.stats;
                }
            }

            if (realtimeRes.ok) {
                const data = await realtimeRes.json();
                setRealtimeTraffic({
                    downloadRate: data.downloadRate || 0,
                    uploadRate: data.uploadRate || 0,
                    downloadBytes: data.downloadBytes || 0,
                    uploadBytes: data.uploadBytes || 0
                });
            }

            if (tempRes.ok) {
                const data = await tempRes.json();
                if (data.history && data.history.length > 0) setTemperatureHistory(data.history);
            }

            if (cpuRes.ok) {
                const data = await cpuRes.json();
                if (data.history && data.history.length > 0) setCpuHistory(data.history);
            }

            setStats(newStats);
            setLastUpdate(new Date());

        } catch (error) {
            console.error('Failed to fetch stats', error);
        } finally {
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

    // Monitoring & Notifications
    const [lastAlerts, setLastAlerts] = useState({ cpu: 0, sfp: 0, voltage: 0 });

    useEffect(() => {
        if (!notifications?.enabled) return;
        const { highCpu, cpuThreshold, sfpCritical, voltageLow } = notifications;
        const now = Date.now();
        const COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown

        // Check CPU
        if (highCpu && stats.cpuLoad > (cpuThreshold || 80)) {
            if (now - lastAlerts.cpu > COOLDOWN) {
                sendNotification('High CPU Warning', `CPU Usage is at ${stats.cpuLoad}%`);
                setLastAlerts(prev => ({ ...prev, cpu: now }));
            }
        }

        // Check SFP
        if (sfpCritical && stats.sfpData && stats.sfpData.length > 0) {
            const criticalSfp = stats.sfpData.find(sfp => parseFloat(sfp.rxPower) < -27 && parseFloat(sfp.rxPower) > -50); // Filter out -99 or empty
            if (criticalSfp && now - lastAlerts.sfp > COOLDOWN) {
                sendNotification('SFP Critical Signal', `SFP ${criticalSfp.name} signal is weak: ${criticalSfp.rxPower} dBm`);
                setLastAlerts(prev => ({ ...prev, sfp: now }));
            }
        }

        // Check Voltage (assuming 12V/24V system, alert if drops below logical threshold, say 11V)
        if (voltageLow && stats.voltage && parseFloat(stats.voltage) < 11 && parseFloat(stats.voltage) > 0) {
            if (now - lastAlerts.voltage > COOLDOWN) {
                sendNotification('System Voltage Low', `Input voltage dropped to ${stats.voltage}V`);
                setLastAlerts(prev => ({ ...prev, voltage: now }));
            }
        }

    }, [stats, notifications, lastAlerts]);


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


    if (loading) {
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
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t('dashboard.title')}</h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">
                        Selamat datang <span className="font-semibold text-blue-600 dark:text-blue-400 capitalize">{username}</span>
                    </p>
                </div>
                <div className="flex items-center gap-4">
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
                {visibleWidgets.financial && userRole !== 'staff' && (
                    <FinancialStats key="financial" stats={stats} formatCurrency={formatCurrency} />
                )}

                {visibleWidgets.pppoe && (
                    <PppoeStats key="pppoe" stats={stats} />
                )}

                {visibleWidgets.realtime && (
                    <RealtimeTraffic
                        key="realtime"
                        realtimeTraffic={realtimeTraffic}
                        formatBitsPerSecond={formatBitsPerSecond}
                        formatBytes={formatBytes}
                    />
                )}

                {/* System Health */}
                {visibleWidgets.system && (
                    <SystemHealth key="system" stats={stats} formatBytes={formatBytes} t={t} />
                )}

                {/* SFP Stats */}
                {visibleWidgets.sfp && stats.sfpData && stats.sfpData.length > 0 && (
                    <motion.div
                        key="sfp-stats"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, delay: 0.25 }}
                    >
                        <SfpStats data={stats.sfpData} />
                    </motion.div>
                )}


            </AnimatePresence>
        </motion.div>
    );
}
