'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { MapPin, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

// Leaflet needs to be dynamically imported with ssr: false
const CustomerMap = dynamic(() => import('@/components/CustomerMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[70vh] flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col items-center gap-3">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        </div>
    ),
});

export default function MapsPage() {
    const { t } = useLanguage();

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-6 text-slate-800 dark:text-slate-100"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                        <MapPin className="text-blue-500" size={28} />
                        {t('maps.title')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {t('maps.description')}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 flex items-center gap-3">
                    <Users className="text-blue-500" size={20} />
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{t('dashboard.totalCustomers')}</p>
                        <p className="font-bold text-lg leading-tight">Map View</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900/90 rounded-2xl backdrop-blur-sm border border-slate-100 dark:border-slate-800/60 shadow-md p-1 md:p-2">
                <CustomerMap />
            </div>
        </motion.div>
    );
}
