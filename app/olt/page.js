'use client';

import OltInfoCard from '@/components/olt/OltInfoCard';
import OnuStatsCard from '@/components/olt/OnuStatsCard';
import OltConfigForm from '@/components/olt/OltConfigForm';

export default function OltDashboard() {
    return (
        <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Overview</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6 lg:col-span-1">
                    <OltInfoCard />
                    <OltConfigForm />
                </div>
                <div className="lg:col-span-2">
                    <OnuStatsCard />
                </div>
            </div>
        </div>
    );
}
