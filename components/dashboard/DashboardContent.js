"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Users,
  Wifi,
  DollarSign,
  CreditCard,
  Activity,
  WifiOff,
  Server,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDashboard } from "@/contexts/DashboardContext";
import { sendLog } from "@/components/LogManager";
import StaffBillingPage from "@/app/billing/staff/page";

// Widgets
import FinancialStats from "./FinancialStats";
import PppoeStats from "./PppoeStats";
import SuperadminStats from "./SuperadminStats";
import PendingRegistrationStats from "./PendingRegistrationStats";
import PppoePieChart from "./PppoePieChart";
import UnifiedFinancialStats from "./UnifiedFinancialStats";
import RevenueChart from "./RevenueChart";
import RecentTransactions from "./RecentTransactions";
import RouterStatusCard from "./RouterStatusCard";

export default function DashboardContent() {
  const { t, resolvedLanguage } = useLanguage();
  const { preferences } = useDashboard();
  const { dashboard = {}, logsPreferences = {} } = preferences || {};
  const { visibleWidgets = {}, refreshInterval } = dashboard;

  const [stats, setStats] = useState({
    pppoeActive: 0,
    pppoeOffline: 0,
    cpuLoad: 0,
    memoryUsed: 0,
    memoryTotal: 0,
    temperature: 0,
    voltage: 0,
    adminCount: 0,
    totalCustomers: 0,
    systemUserCount: 0,
    interfaces: [],
    billing: {
      totalRevenue: 0,
      thisMonthRevenue: 0,
      todaysRevenue: 0,
      totalUnpaid: 0,
      pendingCount: 0,
      monthlyRevenue: [],
      recentTransactions: [],
    },
    agentStats: null,
    pendingRegistrations: 0,
    routers: [],
  });
  const [userRole, setUserRole] = useState(null);
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [bgUrl, setBgUrl] = useState("/dashboard-bg.png");
  const [loginBgUrl, setLoginBgUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch User Role and Name
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUserRole(data.user.role);
          setUsername(data.user.fullName || data.user.username);
          setAvatar(data.user.avatar || null);
        }
      })
      .catch((err) => console.error("Failed to fetch user role", err));

    // Fetch Theme Settings
    fetch("/api/app-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.loginBgUrl) {
          setLoginBgUrl(data.loginBgUrl);
          // If no specific dashboard background, use the login one for the banner too
          if (!data.dashboardBgUrl) {
            setBgUrl(data.loginBgUrl);
          }
        }
        if (data.dashboardBgUrl) {
          setBgUrl(data.dashboardBgUrl);
        }
      })
      .catch((err) => console.error("Failed to fetch app settings", err));
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      // 1. Fetch Fast/Local Data (Billing, Agents, Registrations) - Unblock UI ASAP
      const fetchLocalData = async () => {
        try {
          const [billingRes, agentStatsRes, regsRes] = await Promise.all([
            fetch("/api/billing/stats"),
            fetch(
              `/api/billing/stats/agent?month=${new Date().getMonth()}&year=${new Date().getFullYear()}`
            ),
            fetch("/api/registrations"),
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
            newStats.pendingRegistrations = Array.isArray(data)
              ? data.length
              : 0;
          }

          setStats((prev) => ({ ...prev, ...newStats }));
        } catch (e) {
          console.error("Failed to fetch local stats", e);
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
              setTimeout(
                () => reject(new Error(`Timeout fetching ${url}`)),
                timeout
              )
            ),
          ]);
        };

        // Individual fetches so one failure doesn't stop others

        // Dashboard System Stats (CPU, PPPoE Active)
        fetchWithTimeout("/api/dashboard/stats")
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              setStats((prev) => ({
                ...prev,
                pppoeActive: data.pppoeActive,
                pppoeOffline: data.pppoeOffline,
                cpuLoad: data.cpuLoad,
                memoryUsed: data.memoryUsed,
                memoryTotal: data.memoryTotal,
                temperature: data.temperature,
                voltage: data.voltage,
                adminCount: data.adminCount,
                totalCustomers: data.totalCustomers,
                systemUserCount: data.systemUserCount || 0,
                serverCpuLoad: data.serverCpuLoad,
                serverMemoryUsed: data.serverMemoryUsed,
                serverMemoryTotal: data.serverMemoryTotal,
                routers: data.routers || []
              }));
              console.log("Dashboard Stats Routers Updated:", data.routers);
            }
          })
          .catch((e) => console.warn("Dashboard stats fetch error:", e));
      };

      // Execute
      await fetchLocalData(); // Wait for local data
      fetchExternalData(); // Fire and forget external data
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch stats", error);
      setLoading(false);
    }
  }, []); // Stability fix: remove stats dependency

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
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

    // Check preference
    if (display.memoryUnit && display.memoryUnit !== "auto") {
      const unitIndex = sizes.indexOf(display.memoryUnit.toUpperCase());
      if (unitIndex !== -1) {
        return (
          parseFloat((bytes / Math.pow(k, unitIndex)).toFixed(2)) +
          " " +
          sizes[unitIndex]
        );
      }
    }

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const formatBitsPerSecond = (bps) => {
    if (!bps || bps === 0) return "0 bps";
    const k = 1000;
    const sizes = ["bps", "Kbps", "Mbps", "Gbps"];

    // Check preference
    if (display.bandwidthUnit && display.bandwidthUnit !== "auto") {
      // bandwidthUnit might be 'mbps', 'kbps' etc.
      // Map to index?
      // sizes: 0=bps, 1=Kbps, 2=Mbps, 3=Gbps
      const unitMap = { bps: 0, kbps: 1, mbps: 2, gbps: 3 };
      const targetIndex = unitMap[display.bandwidthUnit.toLowerCase()];

      if (targetIndex !== undefined) {
        return (
          parseFloat((bps / Math.pow(k, targetIndex)).toFixed(2)) +
          " " +
          sizes[targetIndex]
        );
      }
    }

    const i = Math.floor(Math.log(bps) / Math.log(k));
    return parseFloat((bps / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading || userRole === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  // Show Staff Dashboard for non-admin roles
  if (
    userRole === "staff" ||
    userRole === "agent" ||
    userRole === "technician" ||
    userRole === "editor"
  ) {
    return <StaffBillingPage />;
  }

  if (userRole === "customer") {
    const CustomerDashboard = require("./CustomerDashboard").default;
    return <CustomerDashboard />;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="space-y-4 md:space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Premium Header with Banner & Overlapping Avatar */}
      <motion.div variants={itemVariants} className="relative mb-8 sm:mb-12 -mx-4 md:-mx-8 -mt-4 md:-mt-8">
        {/* Banner Area - Sharp Corners & Seamless Deep Curve */}
        <div className="relative h-48 sm:h-64 w-full overflow-hidden border-0 shadow-none outline-none">
          <img 
            src={bgUrl} 
            alt="Dashboard Background" 
            className="absolute inset-0 w-full h-full object-cover object-center scale-110"
            style={{ imageRendering: "high-quality" }}
          />
          <div className="absolute inset-0 bg-blue-900/10 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
          
          {/* Header Action: Refresh */}
          <div className="absolute top-6 right-6 z-20">
            <button
              onClick={fetchStats}
              className="p-2.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/40 transition-all shadow-lg group"
              title={t("common.refresh")}
            >
              <RefreshCw size={18} className="group-active:rotate-180 transition-transform duration-500" />
            </button>
          </div>
        </div>

        {/* Overlapping Profile Section */}
        <div className="relative -mt-20 sm:-mt-24 flex flex-col items-center z-10 px-4">
          <div className="relative group">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-[6px] border-white shadow-xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:scale-105">
              {avatar ? (
                <img
                  src={avatar}
                  alt={username}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-5xl sm:text-7xl font-bold text-white drop-shadow-lg uppercase">
                  {username ? username.charAt(0) : "U"}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 text-center">
            <h1 className="text-[10px] sm:text-xs tracking-[0.4em] uppercase text-indigo-600 font-bold mb-1 opacity-70">
              {t("dashboard.title")}
            </h1>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">
              {t("dashboard.welcome")},{" "}
              <span className="text-indigo-600 capitalize">
                {username}
              </span>
              !
            </h2>
            <div className="mt-2 flex items-center justify-center gap-3">
               <span className="px-3 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-100">
                  {userRole}
               </span>
               <p className="text-[10px] sm:text-xs text-gray-400 font-medium flex items-center gap-1">
                 <Activity size={12} className="text-green-500" />
                 {lastUpdate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
               </p>
            </div>
          </div>
        </div>
      </motion.div>
      {/* Unified General Overview */}
      <AnimatePresence>
        {userRole === "superadmin" ? (
          <SuperadminStats key="superadmin" stats={stats} />
        ) : (
          <div className="space-y-6">
            {/* Admin/Agent Stats Section (Restored) */}
            {stats.agentStats && stats.agentStats.role === "admin" && (
              <motion.div variants={itemVariants} className="w-full">
                <UnifiedFinancialStats
                  gross={stats.agentStats.grandTotal?.revenue || 0}
                  commission={stats.agentStats.grandTotal?.commission || 0}
                  net={stats.agentStats.grandTotal?.netRevenue || 0}
                />
              </motion.div>
            )}

            <PendingRegistrationStats key="pending" stats={stats} />

            {/* New Unified Top Cards */}
            <motion.div variants={itemVariants}>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Activity
                  size={20}
                  className="text-indigo-600"
                />
                {t("dashboard.systemOverview") || "General Overview"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PPPoE Pie Chart (Active/Offline) */}
                <PppoePieChart
                  active={stats.pppoeActive}
                  offline={stats.pppoeOffline}
                  total={stats.totalCustomers}
                />

                {/* System Users */}
                <Link href="/system-users" className="block">
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow h-full cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-gray-500 text-sm font-semibold uppercase">
                        {t("sidebar.systemUsers") || "System Users"}
                      </h3>
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <Users size={20} />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-800">
                      {stats.systemUserCount}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {t("dashboard.registeredAdmins") || "Registered Users"}
                    </p>
                  </div>
                </Link>
              </div>
            </motion.div>

            {/* Router Status Section */}
            {stats.routers && stats.routers.length > 0 && (
              <motion.div 
                variants={itemVariants} 
                initial="hidden"
                animate="visible"
                className="mt-8"
              >
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Server
                    size={20}
                    className="text-blue-600"
                  />
                  {t("routers.title") || "Status Router / NAS"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.routers.map((router) => (
                    <RouterStatusCard key={router.id} router={router} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Visual Charts & Recent Activities Grid */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6"
            >
              <RevenueChart data={stats.billing.monthlyRevenue} />
              <RecentTransactions
                transactions={stats.billing.recentTransactions}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
