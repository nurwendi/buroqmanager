'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useOlt } from '@/contexts/OltContext';

export default function OnuListTable() {
    const { selectedOltId } = useOlt();
    const [onus, setOnus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState(null);

    const fetchData = () => {
        if (!selectedOltId) return;
        setLoading(true);
        fetch(`/api/olt/onus?oltId=${selectedOltId}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setOnus(data);
                } else if (data.error) {
                    console.error("API Error:", data.error);
                    toast.error("Failed to load list: " + data.error);
                } else {
                    console.error("Invalid data format", data);
                }
            })
            .catch(err => {
                console.error(err);
                toast.error("Connection error");
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, [selectedOltId]);

    const handleDelete = async (slotPort, onuId) => {
        if (!confirm(`Are you sure you want to delete ONU ${slotPort}:${onuId}? This action cannot be undone.`)) {
            return;
        }

        setDeleting(`${slotPort}:${onuId}`);

        try {
            const res = await fetch('/api/olt/onus', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slotPort, onuId, oltId: selectedOltId })
            });

            const data = await res.json();

            if (data.success) {
                toast.success(`ONU ${slotPort}:${onuId} deleted successfully`);
                fetchData(); // Refresh list
            } else {
                throw new Error(data.error || 'Failed to delete');
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setDeleting(null);
        }
    };

    const filtered = onus.filter(o =>
        o.serial?.toLowerCase().includes(search.toLowerCase()) ||
        o.onuId?.includes(search) ||
        o.pppoeUser?.toLowerCase().includes(search.toLowerCase()) ||
        o.vlan?.includes(search)
    );

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="py-4 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg">Configured ONUs</CardTitle>
                        <CardDescription>List of all registered devices on the OLT</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                placeholder="Search Serial, VLAN, User..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full md:w-64 dark:bg-gray-800 dark:border-gray-700"
                            />
                        </div>
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <RotateCcw size={18} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800 sticky top-0">
                        <tr>
                            <th className="px-4 py-3">Slot/Port</th>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Serial Number</th>
                            <th className="px-4 py-3">VLAN</th>
                            <th className="px-4 py-3">PPPoE User</th>
                            <th className="px-4 py-3">Profile</th>
                            <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                        {loading && onus.length === 0 ? (
                            <tr><td colSpan="7" className="p-8 text-center"><Skeleton className="h-8 w-2/3 mx-auto" /></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="7" className="p-8 text-center text-gray-500">No ONUs found fitting the criteria.</td></tr>
                        ) : (
                            filtered.map((onu, i) => (
                                <tr key={`${onu.slotPort}-${onu.onuId}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{onu.slotPort}</td>
                                    <td className="px-4 py-3">{onu.onuId}</td>
                                    <td className="px-4 py-3 font-mono text-xs bg-gray-100 dark:bg-gray-800 rounded px-2 w-fit">{onu.serial}</td>
                                    <td className="px-4 py-3">
                                        {onu.vlan ? <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold">{onu.vlan}</span> : '-'}
                                    </td>
                                    <td className="px-4 py-3">{onu.pppoeUser || '-'}</td>
                                    <td className="px-4 py-3 text-gray-500">{onu.tcontProfile || '-'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handleDelete(onu.slotPort, onu.onuId)}
                                            disabled={deleting === `${onu.slotPort}:${onu.onuId}`}
                                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
                                            title="Delete ONU"
                                        >
                                            {deleting === `${onu.slotPort}:${onu.onuId}` ? (
                                                <RotateCcw size={16} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={16} />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}
