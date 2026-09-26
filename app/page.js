'use client';

import { useEffect } from 'react';
import { DashboardProvider } from '@/contexts/DashboardContext';
import DashboardContent from '@/components/dashboard/DashboardContent';

export default function DashboardPage() {
    // Silent background prefetch for PPPoE Users (warm up browser cache)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetch('/api/pppoe/users').catch(() => {});
        }, 3000); // Wait 3 seconds so we don't block initial dashboard render
        return () => clearTimeout(timer);
    }, []);

    return (
        <DashboardProvider>
            <DashboardContent />
        </DashboardProvider>
    );
}
