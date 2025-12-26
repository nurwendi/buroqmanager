'use client';

import { useState, useEffect } from 'react';
import { Server, MapPin, Clock, Info } from 'lucide-react';

export default function OltInfoCard() {
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/api/olt/info')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch OLT Info');
                return res.json();
            })
            .then(data => setInfo(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>;
    if (error) return <div className="text-red-500">Error: {error}</div>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">OLT System Info</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Device Status</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                    <Server size={24} />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                        <Info size={18} />
                        <span>System Name</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{info?.systemName}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                        <MapPin size={18} />
                        <span>Location</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{info?.location}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                        <Clock size={18} />
                        <span>Uptime</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{info?.upTime}</span>
                </div>

                <div className="flex justify-between items-center py-2">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                        <Info size={18} />
                        <span>Contact</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{info?.contact}</span>
                </div>
            </div>
        </div>
    );
}
