'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Home, Users, Settings, Server, Activity, LogOut, Network, CreditCard, WifiOff, Database, Menu, X, Palette, Bell, Wallet,
    LayoutGrid, UserCheck, Zap, Wifi, Route, ShieldCheck, HardDrive, Save, SlidersHorizontal, MessageSquare, Shield, FileText, FileCheck, UserCog, Router, Radio, Gauge
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import AppLauncher from './AppLauncher';

export default function BottomDock() {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useLanguage();
    const [userRole, setUserRole] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isLauncherOpen, setIsLauncherOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check if running in mobile app context
        import('@/lib/isMobile').then(mod => {
            setIsMobile(mod.isMobileApp());
        });
    }, []);

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Failed to fetch user');
            })
            .then(data => {
                setUserRole(data.user.role);
                setUserData(data.user);
            })
            .catch(() => {
                setUserRole(null);
                setUserData(null);
            });
    }, []);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    // Desktop Navigation Items (Grouped)
    const desktopNavItems = [
        { href: '/', icon: Home, hoverIcon: LayoutGrid, label: t('sidebar.dashboard'), roles: ['superadmin', 'admin', 'manager', 'partner', 'viewer', 'customer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/billing', icon: CreditCard, hoverIcon: Wallet, label: t('sidebar.billing'), roles: ['admin', 'manager', 'partner', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/users', icon: Network, hoverIcon: Route, label: t('sidebar.pppoe'), roles: ['admin', 'manager', 'partner', 'viewer', 'staff', 'editor', 'agent', 'technician'] }, // Groups Users, Active, Offline, Profiles, Notifications
        { href: '/system-users', icon: UserCog, hoverIcon: ShieldCheck, label: t('sidebar.systemUsers'), roles: ['admin'] },
        { href: '/system-admin', icon: Shield, hoverIcon: UserCheck, label: t('sidebar.owners'), roles: ['superadmin'] },
        { href: '/routers', icon: Server, hoverIcon: HardDrive, label: 'NAT', roles: ['admin', 'manager'] },

        // { href: '/radius/users', icon: Radio, hoverIcon: Wifi, label: 'Radius', roles: ['admin', 'manager'] }, // Merged into Users
        // { href: '/profiles', icon: Gauge, hoverIcon: Settings, label: 'Profiles', roles: ['admin', 'manager'] },
        { href: '/genieacs', icon: Wifi, hoverIcon: Router, label: 'GenieACS', roles: ['admin', 'manager'] },
        { href: '/backup', icon: Database, hoverIcon: Save, label: t('sidebar.backup'), roles: ['superadmin'] },
        { href: '/invoice-settings', icon: FileText, hoverIcon: FileCheck, label: t('sidebar.invoiceSettings'), roles: ['superadmin'] },
        { href: '/app-settings', icon: Settings, hoverIcon: SlidersHorizontal, label: t('sidebar.appSettings'), roles: ['superadmin', 'admin', 'manager', 'partner', 'staff', 'editor', 'agent', 'technician'] },
    ].filter(item => {

        return !item.roles || (userRole && item.roles.includes(userRole));
    });

    // Mobile/Launcher Navigation Items (Original Full List)
    const mobileLauncherItems = [
        { href: '/', icon: Home, label: t('sidebar.dashboard'), roles: ['superadmin', 'admin', 'manager', 'partner', 'viewer', 'customer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/billing', icon: CreditCard, label: t('sidebar.billing'), roles: ['admin', 'manager', 'partner', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/users', icon: Users, label: t('sidebar.users'), roles: ['admin', 'manager', 'partner', 'viewer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/active', icon: Activity, label: t('sidebar.activeConnections'), roles: ['admin', 'manager', 'partner', 'viewer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/notifications', icon: Bell, label: t('sidebar.notifications'), roles: ['admin', 'manager', 'partner', 'viewer', 'customer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/offline', icon: WifiOff, label: t('sidebar.offline'), roles: ['admin', 'manager', 'partner', 'viewer', 'staff', 'editor', 'agent', 'technician'] },
        // { href: '/profiles', icon: Network, label: t('sidebar.profiles'), roles: ['admin', 'manager'] },
        { href: '/system-users', icon: UserCog, label: t('sidebar.systemUsers'), roles: ['admin'] },
        { href: '/system-admin', icon: Shield, label: t('sidebar.owners'), roles: ['superadmin'] },
        { href: '/routers', icon: Server, label: 'NAT', roles: ['admin', 'manager'] },

        // { href: '/radius/nas', icon: Server, label: 'NAS List', roles: ['admin', 'manager'] }, // Merged into NAT
        // { href: '/radius/users', icon: Radio, label: 'Radius Users', roles: ['admin', 'manager'] }, // Merged into Users
        // { href: '/radius/acct', icon: Activity, label: 'Radius Online', roles: ['admin', 'manager'] }, // Merged into Active Connections
        { href: '/genieacs', icon: Wifi, label: 'GenieACS', roles: ['admin', 'manager'] },
        { href: '/backup', icon: Database, label: t('sidebar.backup'), roles: ['superadmin'] },
        { href: '/invoice-settings', icon: FileText, label: t('sidebar.invoiceSettings'), roles: ['superadmin'] },
        { href: '/app-settings', icon: Settings, label: t('sidebar.appSettings'), roles: ['superadmin', 'admin', 'manager', 'partner', 'staff', 'editor', 'agent', 'technician'] },
    ].filter(item => {

        return !item.roles || (userRole && item.roles.includes(userRole));
    });

    // Select which list to use based on context
    const dockedNavItems = desktopNavItems;
    const launcherNavItems = mobileLauncherItems;

    // Mobile navigation items (Dynamic based on role)
    const mobileNavItems = userRole === 'superadmin' ? [
        { href: '/', icon: Home, label: t('sidebar.dashboard') },
        { href: '/system-admin', icon: Shield, label: t('sidebar.owners') },
        { href: '/app-settings', icon: Settings, label: t('sidebar.appSettings') },
    ] : [
        { href: '/', icon: Home, label: t('sidebar.dashboard') },
        { href: '/active', icon: Activity, label: t('sidebar.activeConnections') },
        { href: '/billing', icon: CreditCard, label: t('sidebar.billing') },
    ];

    if (userRole === 'customer') return null;

    return (
        <>
            {/* Gradient Definition - Available for both Mobile and Desktop */}
            <svg width="0" height="0" className="absolute block w-0 h-0 overflow-hidden">
                <defs>
                    <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Desktop Dock - Hidden on Mobile or Mobile App */}
            {!isMobile && (
                <div className="hidden lg:flex fixed bottom-0 left-0 right-0 z-50 justify-center pb-4 print:hidden pointer-events-none">
                    {/* macOS-style Dock Container */}
                    <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 px-4 py-3 pointer-events-auto">
                        <div className="flex items-center gap-12">
                            {/* Menu / Launcher Button */}
                            <button
                                onClick={() => setIsLauncherOpen(!isLauncherOpen)}
                                className="group relative flex flex-col items-center justify-center transition-all duration-300 hover:scale-125 hover:-translate-y-2 w-14"
                            >
                                <div className={`
                                    relative flex flex-col items-center justify-center
                                    w-14 h-14 rounded-xl
                                    transition-all duration-300
                                    bg-gray-100 dark:bg-gray-800
                                    ${isLauncherOpen ? 'bg-accent !text-white' : ''}
                                `}>
                                    {isLauncherOpen ? (
                                        <X
                                            size={24}
                                            className={`
                                            transition-all duration-300
                                            ${isLauncherOpen ? 'text-white' : 'text-gray-600 dark:text-gray-300 group-hover:stroke-[url(#icon-gradient)]'}
                                        `}
                                        />
                                    ) : (
                                        <LayoutGrid
                                            size={24}
                                            className="text-gray-600 dark:text-gray-300 group-hover:stroke-[url(#icon-gradient)] transition-colors duration-300"
                                        />
                                    )}
                                </div>
                                <span className="text-[10px] font-medium mt-2 whitespace-nowrap px-2 rounded-md transition-all duration-300 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200">
                                    {isLauncherOpen ? 'Close' : 'App'}
                                </span>
                                {/* Hover glow effect */}
                                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-accent/20 blur-xl" />
                            </button>

                            {/* Separator */}
                            <div className="w-px h-12 bg-gray-300 dark:bg-gray-600 mx-2" />

                            {dockedNavItems.map((item) => {
                                const isActive = pathname === item.href || (item.label === 'PPPoE' && ['/users', '/active', '/offline', '/profiles', '/notifications'].some(path => pathname.startsWith(path)));
                                const Icon = item.icon;
                                const HoverIcon = item.hoverIcon;

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="group relative flex flex-col items-center justify-center transition-all duration-300 hover:scale-125 hover:-translate-y-2 w-14"
                                    >
                                        {/* Icon Container */}
                                        <div className={`
                                        relative flex flex-col items-center justify-center
                                        w-14 h-14 rounded-xl
                                        transition-all duration-300
                                        ${isActive
                                                ? 'bg-accent shadow-lg shadow-accent/50'
                                                : 'bg-gray-100 dark:bg-gray-800'
                                            }
                                    `}>
                                            <Icon
                                                size={24}
                                                className={`
                                                transition-all duration-300
                                                ${isActive
                                                        ? 'text-white'
                                                        : 'text-gray-600 dark:text-gray-300 group-hover:stroke-[url(#icon-gradient)]'
                                                    }
                                            `}
                                            />
                                        </div>

                                        {/* Label - visible below icon */}
                                        <span className={`
                                        text-[11px] font-medium mt-2 whitespace-nowrap px-2 rounded-md
                                        transition-all duration-300
                                        ${isActive
                                                ? 'text-accent dark:text-blue-400'
                                                : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200'
                                            }
                                    `}>
                                            {item.label}
                                        </span>

                                        {/* Hover glow effect */}
                                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-accent/20 blur-xl" />
                                    </Link>
                                );
                            })}

                            {/* Separator */}
                            <div className="w-px h-12 bg-gray-300 dark:bg-gray-600 mx-2" />

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="group relative flex flex-col items-center justify-center transition-all duration-300 hover:scale-125 hover:-translate-y-2 w-14"
                            >
                                <div className="relative flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-800 group-hover:text-red-500 group-hover:shadow-lg group-hover:shadow-red-400/20 transition-all duration-300">
                                    <LogOut
                                        size={24}
                                        className="text-gray-600 dark:text-gray-300 group-hover:stroke-[url(#icon-gradient)] transition-colors duration-300"
                                    />
                                </div>
                                <span className="text-[10px] font-medium mt-2 whitespace-nowrap px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 shadow-lg transition-all duration-300">
                                    Logout
                                </span>
                                {/* Hover glow effect */}
                                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-400/10 blur-xl" />
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Mobile Bottom Navigation - Visible on Mobile Only OR Mobile App Mode */}
            <div className={`${!isMobile ? 'lg:hidden' : ''} fixed bottom-0 left-0 right-0 z-[102] print:hidden`}>
                <div className="relative">
                    {/* Bottom Bar */}
                    <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl border-t border-white/20 dark:border-white/10 shadow-2xl">
                        <div className="flex items-center justify-between px-2 py-2">
                            {/* Left Items */}
                            {mobileNavItems.slice(0, 2).map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="flex flex-col items-center justify-center min-w-[60px]"
                                    >
                                        <div className={`
                                            p-1 rounded-xl transition-all duration-300
                                            ${isActive
                                                ? 'bg-blue-50 dark:bg-gray-800/50'
                                                : 'bg-transparent'
                                            }
                                        `}>
                                            <Icon
                                                size={24}
                                                className={`
                                                    ${isActive
                                                        ? 'stroke-[url(#icon-gradient)]'
                                                        : 'text-gray-600 dark:text-gray-400'
                                                    }
                                                `}
                                            />
                                        </div>
                                        <span className={`
                                            text-[10px] font-medium mt-1
                                            ${isActive
                                                ? 'text-accent'
                                                : 'text-gray-600 dark:text-gray-400'
                                            }
                                        `}>
                                            {item.label}
                                        </span>
                                    </Link>
                                );
                            })}

                            {/* Center Menu Button (Integrated) */}
                            <button
                                onClick={() => setIsLauncherOpen(!isLauncherOpen)}
                                className="flex flex-col items-center justify-center min-w-[60px]"
                            >
                                <div className={`
                                    p-1 rounded-xl transition-all duration-300
                                    ${isLauncherOpen
                                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                                        : 'bg-accent text-white shadow-lg shadow-accent/30'
                                    }
                                `}>
                                    {isLauncherOpen ? (
                                        <X size={24} />
                                    ) : (
                                        <Menu size={24} />
                                    )}
                                </div>
                                <span className={`
                                    text-[10px] font-medium mt-1
                                    ${isLauncherOpen
                                        ? 'text-red-500'
                                        : 'text-accent'
                                    }
                                `}>
                                    {isLauncherOpen ? 'Close' : 'App'}
                                </span>
                            </button>

                            {/* Right Items */}
                            {mobileNavItems.slice(2).map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="flex flex-col items-center justify-center min-w-[60px]"
                                    >
                                        <div className={`
                                            p-1 rounded-xl transition-all duration-300
                                            ${isActive
                                                ? 'bg-blue-50 dark:bg-gray-800/50'
                                                : 'bg-transparent'
                                            }
                                        `}>
                                            <Icon
                                                size={24}
                                                className={`
                                                    ${isActive
                                                        ? 'stroke-[url(#icon-gradient)]'
                                                        : 'text-gray-600 dark:text-gray-400'
                                                    }
                                                `}
                                            />
                                        </div>
                                        <span className={`
                                            text-[10px] font-medium mt-1
                                            ${isActive
                                                ? 'text-accent'
                                                : 'text-gray-600 dark:text-gray-400'
                                            }
                                        `}>
                                            {item.label}
                                        </span>
                                    </Link>
                                );
                            })}

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="flex flex-col items-center justify-center min-w-[60px]"
                            >
                                <div className="p-1 rounded-xl bg-transparent transition-all duration-300">
                                    <LogOut size={24} className="text-gray-600 dark:text-gray-400" />
                                </div>
                                <span className="text-[10px] font-medium mt-1 text-gray-600 dark:text-gray-400">
                                    Logout
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* App Launcher - Fullscreen on Mobile */}
            <AppLauncher
                isOpen={isLauncherOpen}
                onClose={() => setIsLauncherOpen(false)}
                navItems={launcherNavItems} // Use launcherNavItems here
                currentPath={pathname}
            />
        </>
    );
}
