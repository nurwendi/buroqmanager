'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

// Custom SVG Pin Marker generator with status color coding & pulsing animations
const createCustomIcon = (statusColor) => {
  let colorClass = 'text-white fill-emerald-500';
  let pulseClass = 'bg-emerald-500';

  if (statusColor === 'rose') {
    colorClass = 'text-white fill-rose-500';
    pulseClass = 'bg-rose-500';
  } else if (statusColor === 'orange') {
    colorClass = 'text-white fill-orange-500';
    pulseClass = 'bg-orange-500';
  }
  
  const html = `
    <div class="relative flex items-center justify-center w-10 h-10">
      <!-- Outer pulsing ring -->
      <span class="absolute inline-flex h-full w-full rounded-full ${pulseClass} opacity-30 animate-ping" style="animation-duration: 2.5s;"></span>
      <!-- Middle ring shadow -->
      <span class="absolute inline-flex h-8 w-8 rounded-full ${pulseClass} opacity-10"></span>
      <!-- Core pin SVG -->
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" class="${colorClass} filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-300">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" stroke="currentColor" stroke-width="1.5"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'custom-leaflet-marker-wrapper',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

export default function CustomerMap() {
    const { t } = useLanguage();
    const { effectiveMode } = useTheme();
    const isDark = effectiveMode === 'dark';
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMapData = async () => {
            try {
                const [custRes, devRes, activeRes] = await Promise.all([
                    fetch('/api/customers'),
                    fetch('/api/genieacs/devices').catch(() => null),
                    fetch('/api/pppoe/active').catch(() => null)
                ]);

                let customersArray = [];
                let devices = [];
                let activeConnections = [];

                if (custRes && custRes.ok) {
                    const data = await custRes.json();
                    customersArray = Array.isArray(data) ? data : Object.values(data);
                }

                if (devRes && devRes.ok) {
                    devices = await devRes.json();
                }

                if (activeRes && activeRes.ok) {
                    activeConnections = await activeRes.json();
                }

                // Create a map of active PPPoE connections
                const activeSet = new Set(
                    (Array.isArray(activeConnections) ? activeConnections : []).map(conn => conn.name?.toLowerCase())
                );

                // Create a map of username -> rx_power from GenieACS devices
                const acsMap = {};
                if (Array.isArray(devices)) {
                    devices.forEach(dev => {
                        if (dev.pppoe_user) {
                            acsMap[dev.pppoe_user.toLowerCase()] = dev.rx_power;
                        }
                    });
                }

                const withCoords = customersArray
                    .filter(c => c.coordinates && c.coordinates.includes(','))
                    .map(c => {
                        const isOnline = activeSet.has(c.username?.toLowerCase());
                        let statusColor = 'emerald';
                        let statusText = 'Aktif';

                        if (c.disabled) {
                            statusColor = 'orange';
                            statusText = 'Isolir';
                        } else if (!isOnline) {
                            statusColor = 'rose';
                            statusText = 'Offline';
                        }

                        return {
                            ...c,
                            rx_power: acsMap[c.username.toLowerCase()] || '-',
                            statusColor,
                            statusText
                        };
                    });

                setCustomers(withCoords);
            } catch (error) {
                console.error("Failed to fetch data for map:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMapData();
    }, []);

    if (loading) {
        return (
            <div className="w-full h-[70vh] flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{t('maps.loading')}</span>
                </div>
            </div>
        );
    }

    if (customers.length === 0) {
        return (
            <div className="w-full h-[70vh] flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-slate-500 dark:text-slate-400">{t('maps.noData')}</p>
            </div>
        );
    }

    // Calculate center (average of all coordinates, or first customer)
    let centerLat = 0;
    let centerLng = 0;
    
    // Quick parse helper
    const parseCoord = (coordStr) => {
        const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return parts;
        }
        return null;
    };

    const validCustomers = customers.map(c => ({
        ...c,
        parsedCoords: parseCoord(c.coordinates)
    })).filter(c => c.parsedCoords);

    if (validCustomers.length > 0) {
        // Just center on the first one, or Indonesia default
        centerLat = validCustomers[0].parsedCoords[0];
        centerLng = validCustomers[0].parsedCoords[1];
    } else {
        // Center of Indonesia
        centerLat = -0.7893;
        centerLng = 113.9213;
    }

    return (
        <div className="w-full h-[70vh] rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md">
            <style>{`
                .leaflet-popup-content-wrapper, .leaflet-popup-tip {
                    background: ${isDark ? '#1e293b' : '#ffffff'} !important;
                    color: ${isDark ? '#f8fafc' : '#0f172a'} !important;
                    border: 1px solid ${isDark ? '#334155' : '#e2e8f0'};
                }
                .leaflet-popup-content-wrapper {
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
                }
                .leaflet-popup-content {
                    margin: 12px 16px !important;
                }
            `}</style>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <MapContainer 
                center={[centerLat, centerLng]} 
                zoom={12} 
                scrollWheelZoom={true} 
                style={{ height: '100%', width: '100%', zIndex: 0 }}
            >
                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Google Maps (Jalan)">
                        <TileLayer
                            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                            attribution="&copy; Google Maps"
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Google Maps (Satelit)">
                        <TileLayer
                            url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                            attribution="&copy; Google Maps"
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Google Maps (Hybrid)">
                        <TileLayer
                            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                            attribution="&copy; Google Maps"
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="OpenStreetMap">
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>
                
                {validCustomers.map((customer) => (
                    <Marker 
                        key={customer.id} 
                        position={customer.parsedCoords}
                        icon={createCustomIcon(customer.statusColor)}
                    >
                        <Popup>
                            <div className="p-1 min-w-[200px]">
                                <h3 className={`font-bold text-sm mb-1 border-b pb-1 ${
                                    isDark ? 'text-slate-100 border-slate-700' : 'text-slate-900 border-slate-200'
                                }}`}>
                                    {customer.name} | {customer.username}
                                </h3>
                                <div className={`text-xs space-y-1 mt-2 ${
                                    isDark ? 'text-slate-300' : 'text-slate-700'
                                }}`}>
                                    <p><strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{t('maps.phoneLabel') || 'No. HP'}:</strong> {customer.phone || '-'}</p>
                                    <p><strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>Redaman:</strong> {customer.rx_power && customer.rx_power !== '-' ? `${customer.rx_power} dBm` : '-'}</p>
                                    <p><strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{t('maps.addressLabel') || 'Alamat'}:</strong> {customer.address || '-'}</p>
                                    <p className="mt-2 pt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
                                        <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>Status:</strong>{' '}
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                            customer.statusColor === 'rose'
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                : customer.statusColor === 'orange'
                                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        }`}>
                                            {customer.statusText}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
