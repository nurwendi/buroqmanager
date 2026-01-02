
'use client';
import { useState, useEffect } from 'react';
import { Router, Hourglass, Power, Search, Wifi } from 'lucide-react';

// ... lines 6-121 ...

<button
    type="button"
    onClick={() => { setSearch(''); fetchDevices(); }}
    className="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200"
    title="Refresh"
>
    <Hourglass size={20} className={loading ? 'animate-spin' : ''} />
</button>
                </form >
            </div >

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map(device => (
            <div key={device.id} className="bg-white p-4 rounded-xl shadow border border-gray-100 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-gray-800 flex items-center gap-2">
                            <Wifi size={16} className="text-green-500" />
                            {device.model || 'Unknown Model'}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${(Date.now() - new Date(device.lastInform).getTime()) < 300000
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                            }`}>
                            {new Date(device.lastInform).toLocaleTimeString()}
                        </span>
                    </div>

                    <div className="text-sm space-y-1 text-gray-600 mb-4">
                        <p><strong>Manuf:</strong> {device.manufacturer}</p>
                        <p><strong>SN:</strong> <span className="font-mono">{device.serial}</span></p>
                        <p><strong>User:</strong> {device.pppoe_user}</p>
                        <p><strong>IP:</strong> {device.ip}</p>
                        <div className="mt-2 pt-2 border-t border-dashed border-gray-200 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                            <span>SSID:</span> <span className="font-semibold text-right truncate">{device.ssid}</span>
                            <span>RX Pwr:</span> <span className={`font-semibold text-right ${parseFloat(device.rx_power) < -25 ? 'text-red-500' : 'text-green-600'}`}>
                                {device.rx_power !== '-' ? device.rx_power + ' dBm' : '-'}
                            </span>
                            <span>Temp:</span> <span className="font-semibold text-right">{device.temp !== '-' ? device.temp + '°C' : '-'}</span>
                        </div>
                    </div>
                </div>

                <div className="border-t pt-3 flex justify-between gap-2">
                    <button
                        onClick={() => openEditWifi(device)}
                        className="flex-1 flex justify-center items-center gap-2 text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors border border-blue-100"
                    >
                        <Wifi size={16} /> Edit Wi-Fi
                    </button>
                    <button
                        onClick={() => handleReboot(device.id, device.serial)}
                        className="flex-1 flex justify-center items-center gap-2 text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded transition-colors border border-red-100"
                    >
                        <Power size={16} /> Reboot
                    </button>
                </div>
            </div>
        ))}

        {!loading && devices.length === 0 && (
            <div className="col-span-full p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                No devices found. Try searching or check GenieACS connection.
            </div>
        )}
    </div>

{/* Edit Wi-Fi Modal */ }
{
    editingDevice && (
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
    )
}
        </div >
    );
}
