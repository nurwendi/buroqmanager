
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
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Activity /> Online Users (Accounting)
                </h1>
                <button
                    onClick={fetchSessions}
                    className="p-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-600"
                    title="Refresh"
                >
                    <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
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
