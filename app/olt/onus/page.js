'use client';

import OnuListTable from '@/components/olt/OnuListTable';
import PonOverviewTable from '@/components/olt/PonOverviewTable';

export default function OnuListPage() {
    return (
        <div className="p-4 md:p-8 space-y-6 h-full flex flex-col">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">ONU List</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-1">
                    <PonOverviewTable />
                </div>
                <div className="lg:col-span-2 h-full min-h-[500px]">
                    <OnuListTable />
                </div>
            </div>
        </div>
    );
}
