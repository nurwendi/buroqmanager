'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { MapPin, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import HeaderBanner from '@/components/HeaderBanner';

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
            <HeaderBanner
                title={t('maps.title')}
                description={t('maps.description')}
                icon={MapPin}
            >
                <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30 flex items-center gap-3 text-white">
                    <Users size={20} className="text-white/80" />
                    <div>
                        <p className="text-[10px] sm:text-xs text-white/70 font-medium uppercase tracking-wider">{t('dashboard.totalCustomers')}</p>
                        <p className="font-bold text-sm sm:text-base leading-tight">Map View</p>
                    </div>
                </div>
            </HeaderBanner>

            {/* Mobile Controls Section (Visible only on mobile) */}
            <div className="flex flex-col gap-3 p-4 bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-xl border border-white/20 dark:border-white/5 md:hidden mb-6 print:hidden">
                <div className="flex items-center gap-3 text-gray-900 dark:text-white">
                    <Users size={20} className="text-blue-500" />
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{t('dashboard.totalCustomers')}</p>
                        <p className="font-bold text-sm sm:text-base leading-tight">Map View</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900/90 rounded-2xl backdrop-blur-sm border border-slate-100 dark:border-slate-800/60 shadow-md p-1 md:p-2">
                <CustomerMap />
            </div>
        </motion.div>
    );
}
