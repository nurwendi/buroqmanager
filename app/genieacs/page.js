
'use client';
import { useState, useEffect } from 'react';
import { Router, Hourglass, Power, Search, Wifi } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function GenieAcsPage() {
    const { t } = useLanguage();
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        checkPermission();
    }, []);

    const checkPermission = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                const role = data.user?.role;
                // Allow superadmin and admin
                if (role !== 'superadmin' && role !== 'admin') {
                    setAccessDenied(true);
                    setLoading(false);
                    return;
                }
                fetchDevices();
            }
        } catch (e) {
            console.error('Auth check failed', e);
        }
    };

    const [accessDenied, setAccessDenied] = useState(false);

    const fetchDevices = async (query = '') => {
        setLoading(true);
        try {
            const url = query ? `/api/genieacs/devices?search=${query}` : '/api/genieacs/devices';
            const res = await fetch(url);
            if (res.ok) {
                setDevices(await res.json());
            } else {
                // console.warn("GenieACS unreachable or error."); // Suppress error for manual setup
                setDevices([]);
            }
        } catch (e) {
            // console.warn("GenieACS fetch error:", e); 
            setDevices([]);
        }
        setLoading(false);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchDevices(search);
    };

    const handleReboot = async (deviceId, serial) => {
        if (!confirm(t('genieacs.rebootConfirm', { sn: serial }))) return;

        try {
            const res = await fetch('/api/genieacs/reboot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId })
            });

            if (res.ok) {
                alert(t('genieacs.rebootSuccess'));
            } else {
                alert(t('genieacs.rebootError'));
            }
        } catch (e) {
            alert('Error: ' + e.message);
        }
    };

    const [editingDevice, setEditingDevice] = useState(null);
    const [wifiForm, setWifiForm] = useState({ ssid: '', password: '' });

    const openEditWifi = (device) => {
        setEditingDevice(device);
        setWifiForm({ ssid: device.ssid || '', password: '' });
    };

    const handleSaveWifi = async (e) => {
        e.preventDefault();
        if (!confirm(t('genieacs.wifiConfirm'))) return;

        try {
            const res = await fetch('/api/genieacs/wifi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId: editingDevice.id,
                    ssid: wifiForm.ssid,
                    password: wifiForm.password
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert(t('genieacs.wifiSuccess'));
                setEditingDevice(null);
            } else {
                alert(t('genieacs.wifiError'));
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    if (accessDenied) {
        return (
            <div className="p-8 text-center">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl inline-block border border-red-100 mb-4">
                    <Power size={48} className="mx-auto mb-2" />
                    <h2 className="text-xl font-bold">{t('genieacs.accessDenied')}</h2>
                    <p>{t('genieacs.restricted')}</p>
                </div>
            </div>
        );
    }

    return (


        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Router className="text-orange-500" /> {t('genieacs.title')}
                </h1>

                <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64"
                            placeholder={t('genieacs.placeholder')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        {t('common.search')}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setSearch(''); fetchDevices(); }}
                        className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200"
                        title={t('common.refresh')}
                    >
                        <Hourglass size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </form>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                                <th className="px-6 py-4 font-semibold">{t('common.status') || 'Status'}</th>
                                <th className="px-6 py-4 font-semibold">{t('genieacs.device') || 'Device'}</th>
                                <th className="px-6 py-4 font-semibold">User / IP / SN</th>
                                <th className="px-6 py-4 font-semibold">SSID</th>
                                <th className="px-6 py-4 font-semibold">Metrics</th>
                                <th className="px-6 py-4 font-semibold text-right">{t('common.actions') || 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {devices.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        {t('genieacs.noDevices')}
                                    </td>
                                </tr>
                            ) : (
                                devices.map(device => {
                                    const isOnline = (Date.now() - new Date(device.lastInform).getTime()) < 300000;
                                    const rx = parseFloat(device.rx_power);
                                    const rxColor = !isNaN(rx) && rx < -25 ? 'text-red-600' : 'text-green-600';
                                    
                                    return (
                                        <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${isOnline
                                                    ? 'bg-green-100 text-green-700 border-green-200'
                                                    : 'bg-gray-100 text-gray-500 border-gray-200'
                                                }`}>
                                                    {isOnline ? 'Online' : 'Offline'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-gray-50 rounded-lg text-orange-500">
                                                        <Router size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 dark:text-white text-sm">
                                                            {device.model || t('genieacs.unknownDevice')}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {device.manufacturer}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-0.5 text-xs">
                                                    <div className="flex items-center gap-1.5"><span className="text-gray-400 w-8">User:</span><span className="font-semibold">{device.pppoe_user}</span></div>
                                                    <div className="flex items-center gap-1.5"><span className="text-gray-400 w-8">IP:</span><span className="font-mono">{device.ip}</span></div>
                                                    <div className="flex items-center gap-1.5"><span className="text-gray-400 w-8">SN:</span><span className="font-mono">{device.serial}</span></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Wifi size={14} className="text-blue-500" />
                                                    <span className="font-bold text-gray-700 text-sm" title={device.ssid}>
                                                        {device.ssid || '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-gray-400 w-10">Signal:</span>
                                                        <span className={`font-bold ${rxColor}`}>
                                                            {device.rx_power !== '-' ? device.rx_power + ' dBm' : '-'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-gray-400 w-10">Temp:</span>
                                                        <span className="font-semibold">
                                                            {device.temp !== '-' ? device.temp + '°C' : '-'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditWifi(device)}
                                                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                                                        title={t('users.wifiSettingsShort') || 'WiFi'}
                                                    >
                                                        <Wifi size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReboot(device.id, device.serial)}
                                                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                                                        title={t('users.rebootShort') || 'Reboot'}
                                                    >
                                                        <Power size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {devices.map(device => {
                    // Dynamic background based on RX Power
                    let bgClass = "bg-white dark:bg-gray-800";
                    const rx = parseFloat(device.rx_power);
                    if (!isNaN(rx)) {
                        bgClass = rx < -25 ? "bg-red-50 dark:bg-red-900/10" : "bg-green-50 dark:bg-green-900/10";
                    }

                    return (
                        <div key={device.id} className={`${bgClass} rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden`}>
                            {/* Unified Header Area */}
                            <div className="p-4 border-b border-gray-100/50 dark:border-gray-700/50 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                                {/* Top Row: Icon, Model, Status */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600 text-orange-500">
                                            <Router size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 dark:text-white text-sm leading-tight">{device.model || t('genieacs.unknownDevice')}</h3>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{device.manufacturer}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide ${(Date.now() - new Date(device.lastInform).getTime()) < 300000
                                        ? 'bg-green-100 text-green-700 border-green-200'
                                        : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                                        }`}>
                                        {(Date.now() - new Date(device.lastInform).getTime()) < 300000 ? 'Online' : 'Offline'}
                                    </span>
                                </div>

                                {/* Metadata Row: User | IP | SN */}
                                <div className="flex flex-col gap-1.5 text-xs text-gray-600 mt-3 bg-white/50 dark:bg-gray-900/50 p-2.5 rounded-lg border border-gray-100/50 dark:border-gray-700/50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">User</span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">{device.pppoe_user}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">IP</span>
                                        <span className="font-mono text-gray-800 dark:text-gray-200">{device.ip}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">SN</span>
                                        <span className="font-mono text-gray-800 dark:text-gray-200">{device.serial}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Card Body: Single Line Metrics */}
                            <div className="px-4 py-3 flex-1 flex items-center">
                                <div className="w-full bg-white/70 dark:bg-gray-800/70 rounded-xl p-3 border border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs gap-2">
                                    {/* SSID */}
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <Wifi size={14} className="text-blue-500 flex-shrink-0" />
                                        <div className="flex flex-col truncate">
                                            <span className="text-[10px] text-gray-400 leading-none mb-0.5">SSID</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-200 truncate" title={device.ssid}>{device.ssid || '-'}</span>
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                                    {/* Signal */}
                                    <div className="flex flex-col items-center min-w-[50px]">
                                        <span className="text-[10px] text-gray-400 leading-none mb-0.5">Signal</span>
                                        <span className={`font-bold ${parseFloat(device.rx_power) < -25 ? 'text-red-500' : 'text-green-500'}`}>
                                            {device.rx_power !== '-' ? device.rx_power + ' dBm' : '-'}
                                        </span>
                                    </div>

                                    {/* Divider */}
                                    <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                                    {/* Temp */}
                                    <div className="flex flex-col items-end min-w-[40px]">
                                        <span className="text-[10px] text-gray-400 leading-none mb-0.5">Temp</span>
                                        <span className="font-bold text-gray-700 dark:text-gray-200">
                                            {device.temp !== '-' ? device.temp + '°C' : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="px-4 pb-4 pt-1 flex gap-3">
                                <button
                                    onClick={() => openEditWifi(device)}
                                    className="flex-1 flex justify-center items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 py-2.5 rounded-lg transition-colors border border-blue-100 dark:border-blue-800"
                                >
                                    <Wifi size={14} /> {t('users.wifiSettingsShort') || 'WiFi'}
                                </button>
                                <button
                                    onClick={() => handleReboot(device.id, device.serial)}
                                    className="flex-1 flex justify-center items-center gap-2 text-xs font-semibold text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 py-2.5 rounded-lg transition-colors border border-red-100 dark:border-red-800"
                                >
                                    <Power size={14} /> {t('users.rebootShort') || 'Reboot'}
                                </button>
                            </div>
                        </div>
                    );
                })}

                {!loading && devices.length === 0 && (
                    <div className="p-8 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed dark:border-gray-700">
                        {t('genieacs.noDevices')}
                    </div>
                )}
            </div>

            {/* Edit Wi-Fi Modal */}
            {editingDevice && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">{t('genieacs.editWifiTitle')}</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            {t('genieacs.deviceInfo')}: {editingDevice.serial} <br />
                            {t('genieacs.wifiNote')}
                        </p>

                        <form onSubmit={handleSaveWifi} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('genieacs.ssidName')}</label>
                                <input
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={wifiForm.ssid}
                                    onChange={e => setWifiForm({ ...wifiForm, ssid: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('genieacs.newPassword')}</label>
                                <input
                                    className="w-full border rounded-lg px-3 py-2"
                                    type="text"
                                    placeholder={t('genieacs.leaveEmpty')}
                                    value={wifiForm.password}
                                    onChange={e => setWifiForm({ ...wifiForm, password: e.target.value })}
                                    minLength={8}
                                />
                                <p className="text-xs text-gray-400 mt-1">{t('genieacs.minChars')}</p>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditingDevice(null)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {t('genieacs.saveChanges') || t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
