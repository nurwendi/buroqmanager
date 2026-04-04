'use client';

import { useState, useEffect } from 'react';
import { Server, Plus, Trash2, Edit2, CheckCircle, Power, X, Settings, Copy, Check, Save, AlertTriangle, Loader2, WifiOff, Shield, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SettingsPage() {
    const { t } = useLanguage();
    const [settings, setSettings] = useState({
        connections: [],
        activeConnectionId: null,
        wanInterface: '',
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [interfaces, setInterfaces] = useState([]);
    const [identities, setIdentities] = useState({});
    const [checkingStatus, setCheckingStatus] = useState({});

    // Modal/Form state for connection
    const [isEditing, setIsEditing] = useState(false);
    const [currentConnection, setCurrentConnection] = useState(null); // null = adding new
    const [connForm, setConnForm] = useState({
        name: '',
        host: '',
        port: '8728',
        user: '',
        password: '',
    });

    // Isolir Config State
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [config, setConfig] = useState({
        poolName: 'DROPPOOL',
        poolRange: '10.100.1.2-10.100.254',
        gatewayIp: '10.100.1.1',
        networkCidr: '10.100.1.0/24',
        billingIp: '192.168.1.100',
        appPort: '80'
    });
    const [savingConfig, setSavingConfig] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [copied, setCopied] = useState(false);

    // Radius NAS State
    const [nasList, setNasList] = useState([]);
    const [showNasModal, setShowNasModal] = useState(false);
    const [nasForm, setNasForm] = useState({ nasname: '', secret: '', description: '' });
    const [syncingNas, setSyncingNas] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchInterfaces();
        fetchConfig();
        fetchNasList();
    }, []);

    const fetchNasList = async () => {
        try {
            const res = await fetch('/api/radius/nas');
            if (res.ok) setNasList(await res.json());
        } catch (e) {
            console.error("Failed to fetch NAS list", e);
        }
    };

    const handleSaveNas = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/radius/nas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nasForm)
            });
            if (res.ok) {
                setMessage({ type: 'success', text: t('routers.radiusClientAdded') });
                setShowNasModal(false);
                setNasForm({ nasname: '', secret: '', description: '' });
                fetchNasList();
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error || t('routers.failedToAddNas') });
            }
        } catch (e) {
            setMessage({ type: 'error', text: t('routers.errorAddingNas') });
        }
    };

    const handleDeleteNas = async (id) => {
        if (!confirm(t('routers.deleteRadiusClientConfirm'))) return;
        try {
            await fetch(`/api/radius/nas?id=${id}`, { method: 'DELETE' });
            fetchNasList();
        } catch (e) { console.error(e); }
    };

    const handleSyncMikrotikToNas = async () => {
        if (!settings.connections || settings.connections.length === 0) {
            alert(t('routers.noConnectionsToSync'));
            return;
        }

        if (!confirm(t('routers.syncNasConfirm'))) return;

        setSyncingNas(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (const conn of settings.connections) {
                // Use Mikrotik IP/Host as NAS Name
                // We assumption secret is 'buroq-radius' or same as Mikrotik?
                // Usually Mikrotik connection is API port 8728, but NAS is for RADIUS (Port 1812/1813).
                // We just need to register the IP in the `nas` table.
                const res = await fetch('/api/radius/nas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nasname: conn.host,
                        secret: 'buroq-radius', // Default secret for auto-sync
                        shortname: conn.name,
                        description: `Auto-synced from Mikrotik Connection: ${conn.name}`
                    })
                });

                if (res.ok) successCount++;
                else failCount++;
            }

            alert(t('routers.syncNasComplete', { success: successCount, fail: failCount }));
            fetchNasList();
        } catch (error) {
            console.error("Sync NAS failed", error);
            alert(t('routers.syncNasError'));
        } finally {
            setSyncingNas(false);
        }
    };

    const fetchInterfaces = async () => {
        try {
            const res = await fetch('/api/interfaces');
            if (res.ok) {
                setInterfaces(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch interfaces', error);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            // Ensure connections is array
            if (!data.connections) data.connections = [];
            setSettings(data);
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRouterStatus = async (connections) => {
        connections.forEach(async (conn) => {
            setCheckingStatus(prev => ({ ...prev, [conn.id]: true }));
            try {
                const res = await fetch(`/api/routers/status?id=${conn.id}`);
                const data = await res.json();
                if (data.success) {
                    setIdentities(prev => ({ ...prev, [conn.id]: data.identity }));
                } else {
                    setIdentities(prev => ({ ...prev, [conn.id]: 'OFFLINE' }));
                }
            } catch (err) {
                setIdentities(prev => ({ ...prev, [conn.id]: 'OFFLINE' }));
            } finally {
                setCheckingStatus(prev => ({ ...prev, [conn.id]: false }));
            }
        });
    };

    useEffect(() => {
        if (settings.connections?.length > 0) {
            fetchRouterStatus(settings.connections);
        }
    }, [settings.connections]);

    const openEditModal = (conn = null) => {
        if (conn) {
            setCurrentConnection(conn);
            setConnForm({
                name: conn.name || '',
                host: conn.host,
                port: conn.port,
                user: conn.user,
                password: conn.password, // Will be '******'
            });
        } else {
            setCurrentConnection(null);
            setConnForm({ name: '', host: '', port: '8728', user: '', password: '' });
        }
        setIsEditing(true);
    };

    const handleSaveConnection = async (e) => {
        e.preventDefault();
        // Validation
        if (!connForm.host || !connForm.user || !connForm.port) {
            setMessage({ type: 'error', text: t('routers.validationError') });
            return;
        }

        let newConnections = [...settings.connections];
        if (currentConnection) {
            // Edit existing
            newConnections = newConnections.map(c =>
                c.id === currentConnection.id ? { ...connForm, id: currentConnection.id } : c
            );
        } else {
            // Add new
            newConnections.push({ ...connForm, id: Date.now().toString() });
        }

        // If it's the first connection, make it active automatically
        let newActiveId = settings.activeConnectionId;
        if (newConnections.length === 1) {
            newActiveId = newConnections[0].id;
        }

        await saveSettings({ connections: newConnections, activeConnectionId: newActiveId });
        setIsEditing(false);
    };

    const handleDeleteConnection = async (id) => {
        if (!confirm(t('routers.deleteConnectionConfirm'))) return;
        const newConnections = settings.connections.filter(c => c.id !== id);

        // If we deleted the active connection, unset active ID
        let newActiveId = settings.activeConnectionId;
        if (id === settings.activeConnectionId) {
            newActiveId = null;
        }

        await saveSettings({ connections: newConnections, activeConnectionId: newActiveId });
    };

    const handleConnect = async (id) => {
        await saveSettings({ activeConnectionId: id });
    };

    const saveSettings = async (newSettingsPart) => {
        const payload = { ...settings, ...newSettingsPart };
        // Optimistic update
        setSettings(payload);
        setMessage(null);

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                if (payload.title) document.title = payload.title;
                fetchSettings(); // Refresh to get clean state
            } else {
                setMessage({ type: 'error', text: data.error || t('routers.failedToSaveSettings') });
                fetchSettings(); // Revert on error
            }
        } catch (error) {
            setMessage({ type: 'error', text: t('routers.errorSavingSettings') });
            fetchSettings();
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/billing/settings');
            if (res.ok) {
                const data = await res.json();
                if (data.isolir && data.isolir.billingIp && data.isolir.billingIp !== '192.168.1.100') {
                    setConfig(prev => ({ ...prev, ...data.isolir }));
                } else {
                    // Auto-detect if no saved config or if saved config is default
                    const detectedIp = window.location.hostname;
                    const detectedPort = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');

                    setConfig(prev => ({
                        ...prev,
                        ...(data.isolir || {}), // Keep other saved settings if any
                        billingIp: detectedIp,
                        appPort: detectedPort
                    }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch config', error);
        }
    };

    const handleSaveConfig = async () => {
        setSavingConfig(true);
        try {
            // Get current full settings first to avoid overwriting
            const settingsRes = await fetch('/api/billing/settings');
            const currentSettings = await settingsRes.json();

            const res = await fetch('/api/billing/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...currentSettings,
                    isolir: config
                }),
            });

            if (res.ok) {
                setShowConfigModal(false);
                setMessage({ type: 'success', text: t('routers.isolirSettingsSaved') });
                fetchConfig();
            } else {
                setMessage({ type: 'error', text: t('routers.failedToSaveSettings') });
            }
        } catch (error) {
            console.error('Error saving config:', error);
            setMessage({ type: 'error', text: t('routers.errorSavingSettings') });
        } finally {
            setSavingConfig(false);
        }
    };

    const generateScript = () => {
        return `/ip pool add name="${config.poolName}" ranges=${config.poolRange}
/ppp profile add name="DROP" local-address=${config.gatewayIp} remote-address="${config.poolName}" dns-server=8.8.8.8,8.8.4.4 on-up="Buroq Autoisolir"

# Firewall Rules
/ip firewall filter add chain=forward protocol=udp dst-port=53 src-address=${config.networkCidr} action=accept comment="Buroq Autoisolir - Allow DNS ID-${config.poolName}" place-before=0
/ip firewall filter add chain=forward src-address=${config.networkCidr} dst-address=${config.billingIp} action=accept comment="Buroq Autoisolir - Allow to Billing"
/ip firewall nat add chain=dstnat protocol=tcp dst-port=80 src-address=${config.networkCidr} action=dst-nat to-addresses=${config.billingIp} to-ports=1500 comment="Buroq Autoisolir - Redirect HTTP to Isolir (Port 1500)"
/ip firewall filter add chain=forward protocol=tcp dst-port=443 src-address=${config.networkCidr} action=reject reject-with=icmp-network-unreachable comment="Buroq Autoisolir - Reject HTTPS Isolir"
/ip firewall filter add chain=forward src-address=${config.networkCidr} action=drop comment="Buroq Autoisolir - Drop All Other Traffic Isolir"`;
    };

    const copyScript = () => {
        navigator.clipboard.writeText(generateScript());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return <div className="p-8 text-gray-800">{t('common.loading')}</div>;

    const runAutoDrop = async () => {
        if (!confirm(t('routers.autoIsolirConfirm'))) return;

        setSavingConfig(true);
        try {
            const res = await fetch('/api/billing/auto-drop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check-and-drop' })
            });
            const data = await res.json();

            if (res.ok) {
                if (data.isEarly) {
                    setMessage({ type: 'warning', text: data.message });
                    alert(data.message);
                } else {
                    setMessage({ type: 'success', text: data.message });
                    if (data.droppedUsers?.length > 0) {
                        alert(t('routers.autoIsolirSuccess', { count: data.droppedUsers.length, users: data.droppedUsers.join(', ') }));
                    } else {
                        alert(data.message);
                    }
                }
            } else {
                setMessage({ type: 'error', text: data.error || t('routers.autoIsolirFailed') });
            }
        } catch (err) {
            setMessage({ type: 'error', text: t('routers.systemError') });
        } finally {
            setSavingConfig(false);
        }
    };

    const handleSyncAll = async () => {
        if (!confirm(t('routers.syncConfirm'))) return;
        setSyncing(true);
        try {
            const res = await fetch('/api/system/sync-ownership');
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: t('routers.syncSuccess') });
                // We could show more details from data.results if needed
                alert(t('routers.syncSuccess'));
            } else {
                setMessage({ type: 'error', text: data.error || t('routers.syncError') });
            }
        } catch (err) {
            setMessage({ type: 'error', text: t('routers.syncError') });
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="w-full space-y-8">
            <div className="flex items-center gap-3 mb-8">
                <Server className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('routers.title')}</h1>
            </div>

            {/* Connections Management */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                {/* ... existing connections content ... */}
                <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{t('routers.mikrotikConnections')}</h2>
                    <div className="flex flex-col md:flex-row gap-2">
                        <button
                            onClick={handleSyncAll}
                            disabled={syncing}
                            className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
                        >
                            {syncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                            {syncing ? t('routers.syncing') : t('routers.syncAll')}
                        </button>
                        <button
                            onClick={() => openEditModal()}
                            className="w-full md:w-auto flex items-center justify-center gap-2 bg-accent text-white px-4 py-2 rounded-md hover:opacity-90 transition-all shadow-lg shadow-accent/30"
                        >
                            <Plus size={18} /> {t('routers.addConnection')}
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {settings.connections.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">{t('routers.noConnections')}</p>
                    ) : (
                        <div className="grid gap-4">
                            {settings.connections.map(conn => (
                                <div key={conn.id} className={`border rounded-lg p-4 flex items-center justify-between ${settings.activeConnectionId === conn.id ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${settings.activeConnectionId === conn.id ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}>
                                            <Power size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                                                {conn.name || t('routers.unnamedConnection')}
                                                {identities[conn.id] && identities[conn.id] !== 'OFFLINE' && (
                                                    <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold">
                                                        {identities[conn.id]}
                                                    </span>
                                                )}
                                                {identities[conn.id] === 'OFFLINE' && (
                                                    <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                                                        Offline
                                                    </span>
                                                )}
                                                {checkingStatus[conn.id] && (
                                                    <Loader2 size={12} className="animate-spin text-gray-400" />
                                                )}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{conn.host}:{conn.port} ({conn.user})</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {settings.activeConnectionId !== conn.id && (
                                            <button
                                                onClick={() => handleConnect(conn.id)}
                                                className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-md transition-colors"
                                            >
                                                {t('routers.connect')}
                                            </button>
                                        )}
                                        {settings.activeConnectionId === conn.id && (
                                            <span className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md flex items-center gap-1">
                                                <CheckCircle size={14} /> {t('routers.active')}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => openEditModal(conn)}
                                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                                            title={t('common.edit')}
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteConnection(conn.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                                            title={t('common.delete')}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Radius Client (NAS) Management */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{t('routers.radiusClients')}</h2>
                        <p className="text-sm text-gray-500">{t('routers.radiusClientsDesc')}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSyncMikrotikToNas}
                            disabled={syncingNas}
                            className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
                        >
                            {syncingNas ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                            {syncingNas ? t('routers.syncing') : t('routers.syncFromMikrotik')}
                        </button>
                        <button
                            onClick={() => setShowNasModal(true)}
                            className="w-full md:w-auto flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/30"
                        >
                            <Plus size={18} /> {t('routers.addRadiusClient')}
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {nasList.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">{t('routers.noRadiusClients')}</p>
                    ) : (
                        <div className="grid gap-4">
                            {nasList.map(nas => (
                                <div key={nas.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-800 dark:text-white">{nas.nasname}</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('routers.radiusSecret')}: <span className="font-mono bg-gray-100 dark:bg-gray-900 px-1 rounded">{nas.secret}</span></p>
                                            {nas.description && <p className="text-xs text-gray-400 italic">{nas.description}</p>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteNas(nas.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                                        title={t('common.delete')}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>



            {/* Isolir Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{t('routers.isolirConfig')}</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={runAutoDrop}
                            disabled={savingConfig}
                            className="flex items-center gap-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-4 py-2 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-all font-medium text-sm"
                        >
                            {savingConfig ? <Loader2 className="animate-spin" size={18} /> : <AlertTriangle size={18} />}
                            {t('routers.runAutoIsolir')}
                        </button>
                        <button
                            onClick={() => setShowConfigModal(true)}
                            className="flex items-center gap-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-4 py-2 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all font-medium text-sm"
                        >
                            <Settings size={18} /> {t('routers.configureGenerate')}
                        </button>
                    </div>
                </div>
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        {t('routers.isolirDesc')}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                            <span className="text-gray-500 dark:text-gray-400 block mb-1">{t('routers.ipPoolName')}</span>
                            <span className="font-mono font-medium text-gray-800 dark:text-gray-200">{config.poolName} ({config.poolRange})</span>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                            <span className="text-gray-500 dark:text-gray-400 block mb-1">{t('routers.targetNetwork')}</span>
                            <span className="font-mono font-medium text-gray-800 dark:text-gray-200">{config.networkCidr}</span>
                        </div>
                    </div>
                </div>
            </div>

            {
                message && (
                    <div className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg z-50 ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                        {message.text}
                    </div>
                )
            }

            {/* Edit/Add Modal */}
            {
                isEditing && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{currentConnection ? t('routers.editConnection') : t('routers.addConnection')}</h3>
                                <button onClick={() => setIsEditing(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveConnection}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('routers.connectionName')}</label>
                                        <input
                                            type="text"
                                            placeholder={t('routers.connectionNamePlaceholder')}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            value={connForm.name}
                                            onChange={(e) => setConnForm({ ...connForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('routers.ipAddress')}</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder={t('routers.ipAddressPlaceholder')}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            value={connForm.host}
                                            onChange={(e) => setConnForm({ ...connForm, host: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('routers.apiPort')}</label>
                                        <input
                                            type="number"
                                            required
                                            placeholder={t('routers.portPlaceholder')}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            value={connForm.port}
                                            onChange={(e) => setConnForm({ ...connForm, port: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('routers.username')}</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder={t('routers.usernamePlaceholder')}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            value={connForm.user}
                                            onChange={(e) => setConnForm({ ...connForm, user: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('routers.password')}</label>
                                        <input
                                            type="password"
                                            placeholder={currentConnection ? t('routers.keepBlank') : ""}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            value={connForm.password}
                                            onChange={(e) => setConnForm({ ...connForm, password: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-accent text-white rounded-md hover:opacity-90"
                                    >
                                        {t('common.save')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }


            {/* Isolir Config Modal */}
            {
                showConfigModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700 flex flex-col">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                        <Settings className="text-blue-500" />
                                        {t('routers.isolirConfig')}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {t('routers.configureGenerate')}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowConfigModal(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Configuration Form */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2 mb-4">{t('routers.parameters')}</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('routers.ipPoolName')}</label>
                                            <input
                                                type="text"
                                                value={config.poolName}
                                                onChange={(e) => setConfig({ ...config, poolName: e.target.value })}
                                                className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('routers.gatewayIp')}</label>
                                            <input
                                                type="text"
                                                value={config.gatewayIp}
                                                onChange={(e) => setConfig({ ...config, gatewayIp: e.target.value })}
                                                className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('routers.ipPoolRange')}</label>
                                            <input
                                                type="text"
                                                value={config.poolRange}
                                                onChange={(e) => setConfig({ ...config, poolRange: e.target.value })}
                                                className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('routers.targetNetwork')}</label>
                                            <input
                                                type="text"
                                                value={config.networkCidr}
                                                onChange={(e) => setConfig({ ...config, networkCidr: e.target.value })}
                                                className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                                                placeholder="e.g. 10.100.1.0/24"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('routers.billingServerIp')}</label>
                                            <input
                                                type="text"
                                                value={config.billingIp}
                                                onChange={(e) => setConfig({ ...config, billingIp: e.target.value })}
                                                className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('routers.webAppPort')}</label>
                                            <input
                                                type="text"
                                                value={config.appPort}
                                                onChange={(e) => setConfig({ ...config, appPort: e.target.value })}
                                                className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Script Preview */}
                                <div className="flex flex-col h-full">
                                    <h3 className="font-semibold text-gray-700 dark:text-gray-200 border-b pb-2 mb-4 flex justify-between items-center">
                                        {t('routers.generatedScript')}
                                        <button
                                            onClick={copyScript}
                                            className="text-xs flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                        >
                                            {copied ? <Check size={12} /> : <Copy size={12} />}
                                            {copied ? t('routers.copied') : t('routers.copyToClipboard')}
                                        </button>
                                    </h3>
                                    <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 overflow-x-auto grow whitespace-pre shadow-inner">
                                        {generateScript()}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 italic">
                                        {t('routers.scriptNote')}
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowConfigModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    {t('common.close')}
                                </button>
                                <button
                                    onClick={handleSaveConfig}
                                    disabled={savingConfig}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {savingConfig ? t('routers.saving') : t('routers.saveConfiguration')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add NAS Modal */}
            {
                showNasModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('routers.addRadiusClient')}</h3>
                                <button onClick={() => setShowNasModal(false)} className="text-gray-500 hover:text-gray-700">
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSaveNas}>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('routers.routerIpAddress')}</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder={t('routers.ipAddressPlaceholder')}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            value={nasForm.nasname}
                                            onChange={(e) => setNasForm({ ...nasForm, nasname: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('routers.radiusSecret')}</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder={t('routers.radiusSecretPlaceholder')}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            value={nasForm.secret}
                                            onChange={(e) => setNasForm({ ...nasForm, secret: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('routers.description')}</label>
                                        <input
                                            type="text"
                                            placeholder={t('routers.descriptionPlaceholder')}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            value={nasForm.description}
                                            onChange={(e) => setNasForm({ ...nasForm, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowNasModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                                    >
                                        {t('routers.saveClient')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
