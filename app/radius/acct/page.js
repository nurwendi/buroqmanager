'use client';

import { useState, useEffect } from 'react';
import { Activity, RefreshCcw } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import HeaderBanner from '@/components/HeaderBanner';

export default function AccountingPage() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/radius/acct?type=online');
            if (res.ok) setSessions(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <HeaderBanner
                title="Online Users (Accounting)"
                description="View active RADIUS accounting sessions, IP addresses, and real-time usage stats."
                icon={Activity}
            >
                <button
                    onClick={fetchSessions}
                    className="bg-accent/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 hover:opacity-90 transition-all shadow-md text-xs sm:text-sm font-semibold border border-accent-500/30"
                    title="Refresh"
                >
                    <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                </button>
            </HeaderBanner>

            {/* Mobile Controls Section */}
            <div className="flex flex-col gap-3 p-4 bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-xl border border-white/20 dark:border-white/5 md:hidden mb-6 print:hidden">
                <button
                    onClick={fetchSessions}
                    className="w-full bg-accent text-white px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 hover:opacity-90 transition-all shadow-md text-xs font-semibold"
                >
                    <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-3 font-semibold text-gray-700">Username</th>
                            <th className="p-3 font-semibold text-gray-700">IP Address</th>
                            <th className="p-3 font-semibold text-gray-700">Start Time</th>
                            <th className="p-3 font-semibold text-gray-700">NAS IP</th>
                            <th className="p-3 font-semibold text-gray-700">Usage (Up/Down)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="p-4 text-center">Loading Data...</td></tr>
                        ) : sessions.length === 0 ? (
                            <tr><td colSpan="5" className="p-4 text-center text-gray-500">No online users found.</td></tr>
                        ) : (
                            sessions.map((s) => (
                                <tr key={s.radacctid} className="border-b hover:bg-gray-50">
                                    <td className="p-3 font-semibold text-blue-600">{s.username}</td>
                                    <td className="p-3 font-mono text-gray-600">{s.framedipaddress}</td>
                                    <td className="p-3">{new Date(s.acctstarttime).toLocaleString()}</td>
                                    <td className="p-3 text-gray-500">{s.nasipaddress}</td>
                                    <td className="p-3">
                                        <span className="text-green-600">↑ {formatBytes(s.acctinputoctets)}</span>
                                        <span className="mx-2 text-gray-300">|</span>
                                        <span className="text-blue-600">↓ {formatBytes(s.acctoutputoctets)}</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
