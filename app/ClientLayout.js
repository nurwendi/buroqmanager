'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Navbar from "@/components/Navbar";
import BottomDock from '@/components/BottomDock';
import SessionTimeoutHandler from "@/components/SessionTimeoutHandler";
import { LanguageProvider } from '@/contexts/LanguageContext';
import { DashboardProvider } from '@/contexts/DashboardContext';

export default function ClientLayout({ children }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';
    const isInvoicePage = pathname.startsWith('/invoice') && !pathname.startsWith('/invoice-settings');
    const isIsolirPage = pathname.startsWith('/isolir');
    const isPublicPage = isLoginPage || isInvoicePage || isIsolirPage;

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Mobile: Global Fetch Interceptor
        import('@/lib/isMobile').then(({ isMobileApp }) => {
            if (isMobileApp()) {
                setIsMobile(true);
                const originalFetch = window.fetch;
                window.fetch = async (input, init) => {
                    let url = input;
                    if (typeof input === 'string' && input.startsWith('/')) {
                        const baseUrl = localStorage.getItem('buroq_server_url');
                        if (baseUrl) {
                            const cleanBase = baseUrl.replace(/\/$/, '');
                            url = `${cleanBase}${input}`;
                        }
                    }
                    return originalFetch(url, init);
                };
            }
        });

        // Sync Title from Settings
        fetch('/api/app-settings')
            .then(res => res.json())
            .then(data => {
                if (data.appName) {
                    document.title = data.appName;
                }
            })
            .catch(err => console.error('Failed to load app settings', err));
    }, []);

    const variants = {
        hidden: { opacity: 0, x: -10, y: 0 },
        enter: { opacity: 1, x: 0, y: 0 },
        exit: { opacity: 0, x: 10, y: 0 },
    };

    return (
        <LanguageProvider>
            <DashboardProvider>
                <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
                    <SessionTimeoutHandler />

                    {!isPublicPage && (
                        <>
                            <BottomDock />
                        </>
                    )}

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            variants={variants}
                            initial="hidden"
                            animate="enter"
                            exit="exit"
                            transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
                            className={`min-h-screen ${!isPublicPage ? 'pt-2 px-2 md:pt-8 md:px-8 pb-24 md:pb-32' : ''}`}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </DashboardProvider>
        </LanguageProvider>
    );
}
