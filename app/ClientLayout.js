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
    const [loginBgUrl, setLoginBgUrl] = useState('');
    const [logoUrl, setLogoUrl] = useState('/logo.png');
    
    const isLoginPage = pathname === '/login';
    const isInvoicePage = pathname.startsWith('/invoice') && !pathname.startsWith('/invoice-settings');
    const isIsolirPage = pathname.startsWith('/isolir');
    const isPublicPage = isLoginPage || isInvoicePage || isIsolirPage;

    useEffect(() => {
        // Sync Title and Theme from Settings
        fetch('/api/app-settings')
            .then(res => res.json())
            .then(data => {
                if (data.appName) {
                    document.title = data.appName;
                }
                if (data.loginBgUrl) {
                    setLoginBgUrl(data.loginBgUrl);
                }
                if (data.logoUrl) {
                    setLogoUrl(data.logoUrl);
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
                <div 
                    className="relative min-h-screen overflow-hidden bg-background transition-all duration-700"
                    style={(!isPublicPage && loginBgUrl) ? {
                        backgroundImage: `url(${loginBgUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundAttachment: 'fixed'
                    } : {}}
                >
                    {/* Background Overlay for authenticated pages with bg image */}
                    {!isPublicPage && loginBgUrl && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-md pointer-events-none" />
                    )}
                    
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
