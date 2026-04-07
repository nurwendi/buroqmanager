'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Server, RefreshCw, Wifi, WifiOff, Shield, Network, Cpu, MemoryStick, Clock, ChevronDown, ChevronRight, Activity, Globe, AlertTriangle, CheckCircle, XCircle, Info, Filter, ArrowLeftRight, Zap } from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

// Helpers
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatBps(bps) {
    if (!bps || bps === 0) return '0 bps';
    const k = 1000;
    const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    const i = Math.floor(Math.log(bps) / Math.log(k));
    return parseFloat((bps / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(uptime) {
    if (!uptime || uptime === 'N/A') return 'N/A';
    return uptime;
}

// Status Badge
function StatusBadge({ online }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${online
            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
        }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {online ? 'Online' : 'Offline'}
        </span>
    );
}

// NAT Rule Row
function NatRuleRow({ rule, index }) {
    return (
        <tr className={`border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${rule.disabled ? 'opacity-50' : ''}`}>
            <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{index + 1}</td>
            <td className="px-4 py-2.5">
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${rule.chain === 'srcnat' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'}`}>
                    {rule.chain}
                </span>
            </td>
            <td className="px-4 py-2.5">
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${rule.action === 'masquerade' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' : rule.action === 'dst-nat' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {rule.action}
                </span>
            </td>
            <td className="px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-300">{rule.protocol || 'any'}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-300">{rule.srcAddress || '-'}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-300">{rule.dstAddress || '-'}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-300">{rule.toAddresses || '-'}{rule.toPorts ? `:${rule.toPorts}` : ''}</td>
            <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">{rule.outInterface || rule.inInterface || '-'}</td>
            <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{formatBytes(rule.bytes)}</td>
            <td className="px-4 py-2.5">
                {rule.disabled
                    ? <XCircle size={14} className="text-red-400" />
                    : <CheckCircle size={14} className="text-green-500" />}
            </td>
        </tr>
    );
}

// Interface Card
function InterfaceCard({ iface, ipAddresses }) {
    const ip = ipAddresses.find(ip => ip.interface === iface.name);
    return (
        <div className={`p-4 rounded-xl border transition-all ${iface.running && !iface.disabled
            ? 'border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/10'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
        }`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${iface.running && !iface.disabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">{iface.name}</span>
                </div>
                <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">{iface.type}</span>
            </div>
            {ip && (
                <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mb-2">{ip.address}</div>
            )}
            <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                    <span className="text-green-500">▲</span> {formatBytes(iface.txBytes)}
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-blue-500">▼</span> {formatBytes(iface.rxBytes)}
                </div>
            </div>
            {iface.macAddress && (
                <div className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-1">{iface.macAddress}</div>
            )}
        </div>
    );
}

// Router Card (main)
function RouterCard({ router }) {
    const [expanded, setExpanded] = useState(true);
    const [activeTab, setActiveTab] = useState('nat');
    const isOnline = router.status === 'online';

    const tabs = [
        { id: 'nat', label: t('sidebar.tabNat'), icon: ArrowLeftRight, count: router.natRules?.length || 0 },
        { id: 'interfaces', label: t('sidebar.tabInterfaces'), icon: Network, count: router.interfaces?.length || 0 },
        { id: 'ip', label: t('sidebar.tabIp'), icon: Globe, count: router.ipAddresses?.length || 0 },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
        >
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOnline ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-gray-700'}`}>
                        <Server size={24} className={isOnline ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{router.identity}</h3>
                            <StatusBadge online={isOnline} />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{router.host}</span>
                            {router.resources?.version && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">· v{router.resources.version}</span>
                            )}
                            {router.resources?.boardName && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">· {router.resources.boardName}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Quick Stats */}
                    {isOnline && router.resources && (
                        <div className="hidden md:flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                                <Cpu size={15} className="text-orange-500" />
                                <span className="font-semibold">{router.resources.cpuLoad}%</span>
                                <span className="text-xs text-gray-400">CPU</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                                <MemoryStick size={15} className="text-purple-500" />
                                <span className="font-semibold">{Math.round((router.resources.memoryUsed / router.resources.memoryTotal) * 100)}%</span>
                                <span className="text-xs text-gray-400">RAM</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                                <Clock size={15} className="text-blue-500" />
                                <span className="text-xs text-gray-400 font-mono">{formatUptime(router.resources.uptime)}</span>
                            </div>
                        </div>
                    )}
                    <div className="hidden md:flex items-center gap-3 text-center">
                        <div>
                            <div className="text-lg font-bold text-gray-800 dark:text-white">{router.firewallStats?.nat || 0}</div>
                            <div className="text-[10px] text-gray-500 uppercase">NAT</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold text-gray-800 dark:text-white">{router.firewallStats?.filter || 0}</div>
                            <div className="text-[10px] text-gray-500 uppercase">Filter</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold text-gray-800 dark:text-white">{router.firewallStats?.mangle || 0}</div>
                            <div className="text-[10px] text-gray-500 uppercase">Mangle</div>
                        </div>
                    </div>
                    <ChevronDown size={20} className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
                {expanded && isOnline && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* Resource bars - mobile */}
                        {router.resources && (
                            <div className="px-5 pb-3 md:hidden grid grid-cols-3 gap-3">
                                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 text-center">
                                    <div className="text-lg font-bold text-orange-600">{router.resources.cpuLoad}%</div>
                                    <div className="text-xs text-gray-500">CPU</div>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 text-center">
                                    <div className="text-lg font-bold text-purple-600">{Math.round((router.resources.memoryUsed / router.resources.memoryTotal) * 100)}%</div>
                                    <div className="text-xs text-gray-500">RAM</div>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                                    <div className="text-xs font-mono font-semibold text-blue-600">{router.resources.uptime}</div>
                                    <div className="text-xs text-gray-500">Uptime</div>
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="border-t border-gray-100 dark:border-gray-700">
                            <div className="flex overflow-x-auto px-5 pt-2 gap-1">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                                            activeTab === tab.id
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <tab.icon size={15} />
                                        {tab.label}
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="p-5 pt-3">
                                {/* NAT Rules Tab */}
                                {activeTab === 'nat' && (
                                    <div>
                                        {router.natRules?.length > 0 ? (
                                            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                        <tr>
                                                            {['#', 'Chain', 'Action', 'Protocol', 'Src', 'Dst', 'To', 'Interface', 'Bytes', '✓'].map(h => (
                                                                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                                        {router.natRules.map((rule, idx) => (
                                                            <NatRuleRow key={rule.id || idx} rule={rule} index={idx} />
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-gray-400">
                                                <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-30" />
                                                <p className="text-sm">{t('sidebar.noNatRules')}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Interfaces Tab */}
                                {activeTab === 'interfaces' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {router.interfaces?.map((iface, idx) => (
                                            <InterfaceCard key={idx} iface={iface} ipAddresses={router.ipAddresses || []} />
                                        ))}
                                        {(!router.interfaces || router.interfaces.length === 0) && (
                                            <div className="col-span-full text-center py-12 text-gray-400">
                                                <Network size={40} className="mx-auto mb-3 opacity-30" />
                                                <p className="text-sm">No interfaces found</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* IP Addresses Tab */}
                                {activeTab === 'ip' && (
                                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                        {router.ipAddresses?.length > 0 ? (
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                    <tr>
                                                        {['IP Address', 'Network', 'Interface', 'Status'].map(h => (
                                                            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {router.ipAddresses.map((ip, idx) => (
                                                        <tr key={idx} className={`border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${ip.disabled ? 'opacity-50' : ''}`}>
                                                            <td className="px-4 py-2.5 font-mono text-sm text-blue-600 dark:text-blue-400">{ip.address}</td>
                                                            <td className="px-4 py-2.5 font-mono text-xs text-gray-600 dark:text-gray-300">{ip.network}</td>
                                                            <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-300">{ip.interface}</td>
                                                            <td className="px-4 py-2.5">
                                                                {ip.disabled
                                                                    ? <span className="text-xs text-red-500">Disabled</span>
                                                                    : <span className="text-xs text-green-500">Active</span>
                                                                }
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="text-center py-12 text-gray-400">
                                                <Globe size={40} className="mx-auto mb-3 opacity-30" />
                                                <p className="text-sm">No IP addresses found</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
                {expanded && !isOnline && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-5 pb-6 pt-2"
                    >
                        <div className="text-center py-10 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-800/30">
                            <WifiOff size={40} className="mx-auto mb-3 text-red-400 opacity-60" />
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">Router Offline</p>
                            {router.error && <p className="text-xs text-gray-500 mt-1">{router.error}</p>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Main Page
export default function NatPage() {
    const { t } = useLanguage();
    const router = useRouter();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/nat/data');
            if (res.status === 403) {
                router.push('/');
                return;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setData(json);
            setLastUpdate(new Date());
            setError(null);
        } catch (e) {
            setError(e.message);
            if (e.message.includes('403')) {
                router.push('/');
            }
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totalNatRules = data?.routers?.reduce((sum, r) => sum + (r.natRules?.length || 0), 0) || 0;
    const totalInterfaces = data?.routers?.reduce((sum, r) => sum + (r.interfaces?.length || 0), 0) || 0;
    const onlineRouters = data?.routers?.filter(r => r.status === 'online').length || 0;
    const totalRouters = data?.routers?.length || 0;

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                        <ArrowLeftRight size={20} className="text-white" />
                        </div>
                        {t('sidebar.networkTitle')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t('sidebar.networkDesc')}
                        {lastUpdate && <span className="ml-2 text-xs opacity-60">· Terakhir diperbarui: {lastUpdate.toLocaleTimeString()}</span>}
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-md disabled:opacity-60 text-sm"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Memperbarui...' : 'Perbarui'}
                </button>
            </div>

            {/* Summary Stats */}
            {data && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: t('sidebar.routerOnline'), value: `${onlineRouters}/${totalRouters}`, icon: Server, color: 'blue' },
                        { label: 'Total NAT Rules', value: totalNatRules, icon: ArrowLeftRight, color: 'orange' },
                        { label: t('sidebar.totalInterfaces'), value: totalInterfaces, icon: Network, color: 'purple' },
                        { label: t('sidebar.firewallFilter'), value: data.routers?.reduce((s, r) => s + (r.firewallStats?.filter || 0), 0), icon: Shield, color: 'green' },
                    ].map((stat, idx) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm"
                        >
                            <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-900/30 flex items-center justify-center mb-3`}>
                                <stat.icon size={20} className={`text-${stat.color}-600 dark:text-${stat.color}-400`} />
                            </div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</div>
                        </motion.div>
                    ))}
                </div>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={18} className="text-red-500" />
                        <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 pl-7 italic">
                        {t('sidebar.troubleshootOffline')}
                    </p>
                </div>
            )}

            {/* NAT vs NAS Info Card */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-2xl p-5"
            >
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg shrink-0">
                        <Info size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm">{t('sidebar.natNasDistinctionTitle')}</h4>
                        <p className="text-xs text-blue-700/70 dark:text-blue-400/60 mt-1 leading-relaxed">
                            {t('sidebar.natNasDistinctionDesc')}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Loading */}
            {loading && !data && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <RefreshCw size={28} className="text-blue-600 animate-spin" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">{t('sidebar.fetchingNat')}</p>
                </div>
            )}

            {/* Router Cards */}
            {data?.routers && (
                <div className="space-y-4">
                    {data.routers.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                            <Server size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Tidak ada router terhubung</p>
                            <p className="text-sm text-gray-400 mt-1">Tambahkan router di halaman Pengaturan Router</p>
                        </div>
                    ) : (
                        data.routers.map(router => (
                            <RouterCard key={router.id} router={router} />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
