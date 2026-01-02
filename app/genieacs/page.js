
'use client';
import { useState, useEffect } from 'react';
import { Router, Hourglass, Power, Search, Wifi } from 'lucide-react';

export default function GenieAcsPage() {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchDevices();
    }, []);

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
        if (!confirm(`Are you sure you want to reboot device ${serial}?`)) return;

        try {
            const res = await fetch('/api/genieacs/reboot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId })
            });

            if (res.ok) {
                alert('Reboot task queued successfully.');
            } else {
                alert('Failed to queue reboot.');
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
        if (!confirm('This will update the device Wi-Fi settings. The device might reconnect. Continue?')) return;

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
                alert('Success: Wi-Fi update task queued.');
                setEditingDevice(null);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Router className="text-orange-500" /> GenieACS Devices
                </h1>

                <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64"
                            placeholder="Serial No / PPPoE User..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Search
                    </button>
                    <button
                        type="button"
                        onClick={() => { setSearch(''); fetchDevices(); }}
                        className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200"
                        title="Refresh"
                    >
                        <Hourglass size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {devices.map(device => {
                    // Dynamic background based on RX Power
                    let bgClass = "bg-white";
                    const rx = parseFloat(device.rx_power);
                    if (!isNaN(rx)) {
                        bgClass = rx < -25 ? "bg-red-50" : "bg-green-50";
                    }

                    return (
                    return (
                        <div key={device.id} className={`${bgClass} rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden`}>
                            {/* Card Header: Status & Model */}
                            <div className="p-4 border-b border-gray-100/50 bg-white/50 backdrop-blur-sm">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 text-orange-600">
                                            <Router size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-sm leading-tight">{device.model || 'Unknown Device'}</h3>
                                            <p className="text-xs text-gray-500">{device.manufacturer}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full border ${(Date.now() - new Date(device.lastInform).getTime()) < 300000
                                            ? 'bg-green-100 text-green-700 border-green-200'
                                            : 'bg-gray-100 text-gray-500 border-gray-200'
                                        }`}>
                                        {(Date.now() - new Date(device.lastInform).getTime()) < 300000 ? 'Online' : 'Offline'}
                                        <span className="block font-normal normal-case text-[9px] opacity-80">
                                            {new Date(device.lastInform).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            {/* Card Body: Info Grid */}
                            <div className="p-4 flex-1 space-y-3">
                                {/* User & IP */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-white/60 p-2 rounded border border-gray-100">
                                        <p className="text-gray-400 mb-0.5 flex items-center gap-1">User</p>
                                        <p className="font-medium text-gray-700 truncate" title={device.pppoe_user}>{device.pppoe_user}</p>
                                    </div>
                                    <div className="bg-white/60 p-2 rounded border border-gray-100">
                                        <p className="text-gray-400 mb-0.5">IP Address</p>
                                        <p className="font-mono font-medium text-gray-700 truncate" title={device.ip}>{device.ip}</p>
                                    </div>
                                </div>

                                {/* SN */}
                                <div className="text-xs flex items-center justify-between text-gray-500 px-1">
                                    <span>SN: <span className="font-mono select-all">{device.serial}</span></span>
                                </div>

                                {/* Metrics: SSID, Signal, Temp */}
                                <div className="bg-white/80 rounded-lg p-2 border border-gray-100 space-y-2">
                                    <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-100 border-dashed">
                                        <div className="flex items-center gap-1.5 text-gray-600">
                                            <Wifi size={14} className="text-blue-500" />
                                            <span className="font-medium truncate max-w-[120px]" title={device.ssid}>{device.ssid}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-col flex-col">
                                                <span className="text-[10px] text-gray-400">Signal</span>
                                                <span className={`font-bold ${parseFloat(device.rx_power) < -25 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {device.rx_power !== '-' ? device.rx_power + ' dBm' : '-'}
                                                </span>
                                            </div>
                                            <div className="flex items-col flex-col">
                                                <span className="text-[10px] text-gray-400">Temp</span>
                                                <span className="font-medium text-gray-700">
                                                    {device.temp !== '-' ? device.temp + '°C' : '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="p-3 bg-white/50 border-t border-gray-100 flex gap-2">
                                <button
                                    onClick={() => openEditWifi(device)}
                                    className="flex-1 flex justify-center items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg transition-colors border border-blue-100"
                                >
                                    <Wifi size={14} /> WiFi
                                </button>
                                <button
                                    onClick={() => handleReboot(device.id, device.serial)}
                                    className="flex-1 flex justify-center items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 py-2 rounded-lg transition-colors border border-red-100"
                                >
                                    <Power size={14} /> Reboot
                                </button>
                            </div>
                        </div>
                    );
                })}

                {!loading && devices.length === 0 && (
                    <div className="col-span-full p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                        No devices found. Try searching or check GenieACS connection.
                    </div>
                )}
            </div>

            {/* Edit Wi-Fi Modal */}
            {editingDevice && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Edit Wi-Fi Settings</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Device: {editingDevice.serial} <br />
                            Note: Changing SSID/Password may disconnect devices properly.
                        </p>

                        <form onSubmit={handleSaveWifi} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">SSID Name</label>
                                <input
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={wifiForm.ssid}
                                    onChange={e => setWifiForm({ ...wifiForm, ssid: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">New Password</label>
                                <input
                                    className="w-full border rounded-lg px-3 py-2"
                                    type="text"
                                    placeholder="Leave empty to keep current"
                                    value={wifiForm.password}
                                    onChange={e => setWifiForm({ ...wifiForm, password: e.target.value })}
                                    minLength={8}
                                />
                                <p className="text-xs text-gray-400 mt-1">Min 8 characters.</p>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditingDevice(null)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
