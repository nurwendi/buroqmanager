'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { useOlt } from '@/contexts/OltContext';

export default function PonOverviewTable() {
    const { selectedOltId } = useOlt();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!selectedOltId) return;
        setLoading(true);
        fetch(`/api/olt/stats?oltId=${selectedOltId}`)
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [selectedOltId]);

    if (loading) return <Skeleton className="h-40 w-full" />;

    const getStatusColor = (status) => {
        if (status === 'healthy') return 'bg-green-500';
        if (status === 'partial') return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <Card>
            <CardHeader className="py-4">
                <CardTitle className="text-lg">PON Port Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3">Slot/Port</th>
                                <th className="px-4 py-3">Registered</th>
                                <th className="px-4 py-3">Online</th>
                                <th className="px-4 py-3">Offline</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((port) => (
                                <tr key={port.port_id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-4 py-3 font-medium">{port.port_id}</td>
                                    <td className="px-4 py-3">{port.onu_registered}</td>
                                    <td className="px-4 py-3 text-green-600 font-bold">{port.onu_online}</td>
                                    <td className="px-4 py-3 text-red-500">{port.onu_offline}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(port.status)}`} />
                                            <span className="capitalize">{port.status}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
