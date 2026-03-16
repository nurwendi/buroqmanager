
'use client';
import { useState, useEffect } from 'react';
import { Activity, RefreshCcw } from 'lucide-react';
import { formatBytes } from '@/lib/utils-format';

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
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-white drop-shadow-md">
                    <Activity className="text-blue-400" /> Online Users (Accounting)
                </h1>
                <button
                    onClick={fetchSessions}
                    className="p-2 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-lg hover:bg-white/20 text-white transition-colors border border-white/10 shadow-lg"
                    title="Refresh"
                >
                    <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-xl shadow-xl overflow-hidden border border-white/20">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="p-3 font-semibold text-white/70">Username</th>
                            <th className="p-3 font-semibold text-white/70">IP Address</th>
                            <th className="p-3 font-semibold text-white/70">Start Time</th>
                            <th className="p-3 font-semibold text-white/70">NAS IP</th>
                            <th className="p-3 font-semibold text-white/70">Usage (Up/Down)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="p-4 text-center text-white/50">Loading Data...</td></tr>
                        ) : sessions.length === 0 ? (
                            <tr><td colSpan="5" className="p-4 text-center text-white/50">No online users found.</td></tr>
                        ) : (
                            sessions.map((s) => (
                                <tr key={s.radacctid} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                    <td className="p-3 font-semibold text-blue-400">{s.username}</td>
                                    <td className="p-3 font-mono text-white/60">{s.framedipaddress}</td>
                                    <td className="p-3 text-white/80">{new Date(s.acctstarttime).toLocaleString()}</td>
                                    <td className="p-3 text-white/40">{s.nasipaddress}</td>
                                    <td className="p-3">
                                        <span className="text-green-400">↑ {formatBytes(s.acctinputoctets)}</span>
                                        <span className="mx-2 text-white/10">|</span>
                                        <span className="text-blue-400">↓ {formatBytes(s.acctoutputoctets)}</span>
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
