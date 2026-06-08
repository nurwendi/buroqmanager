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

    useEffect(() => {
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
                <div className="relative min-h-screen overflow-hidden bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-300">
                    {/* Animated Background Orbs for Premium Mesh Gradient Effect */}
                    {!isLoginPage && (
                        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 hidden dark:block">
                            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse duration-[6000ms]" />
                            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse duration-[8000ms]" />
                            <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] rounded-full bg-violet-600/15 blur-[100px] animate-pulse duration-[7000ms]" />
                        </div>
                    )}
                    
                    <SessionTimeoutHandler />

                    {!isPublicPage && (
                        <>
                            <Navbar />
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
                            className={`relative z-10 min-h-screen ${!isPublicPage ? 'pt-20 px-2 md:pt-24 md:px-8 pb-8 md:pb-12' : ''}`}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </DashboardProvider>
        </LanguageProvider>
    );
}
