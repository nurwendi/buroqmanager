'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Home, Users, Settings, Server, Activity, LogOut, Network, CreditCard, WifiOff, Database, Menu, X, Palette, ClipboardList, Wallet,
    LayoutGrid, UserCheck, Zap, Wifi, Route, ShieldCheck, HardDrive, Save, SlidersHorizontal, MessageSquare, Shield, FileText, FileCheck, UserCog, Router, Radio, Gauge, Globe, TrendingUp, ArrowLeftRight, Bell, Megaphone
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import AppLauncher from './AppLauncher';
import NotificationPopover from './NotificationPopover';

export default function BottomDock() {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useLanguage();
    const [userRole, setUserRole] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isLauncherOpen, setIsLauncherOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Failed to fetch user');
            })
            .then(data => {
                setUserRole(data.user.role?.toLowerCase());
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
        { href: '/reports/financial', icon: Activity, hoverIcon: TrendingUp, label: t('sidebar.reports'), roles: ['admin'] },

        { href: '/users', icon: Users, hoverIcon: Route, label: t('sidebar.users'), roles: ['admin', 'manager', 'partner', 'viewer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/offline', icon: WifiOff, hoverIcon: Network, label: t('sidebar.offline'), roles: ['admin', 'manager', 'partner', 'viewer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/profiles', icon: Gauge, hoverIcon: Settings, label: t('sidebar.profiles'), roles: ['admin', 'manager'] },

        { href: '/system-users', icon: UserCog, hoverIcon: ShieldCheck, label: t('sidebar.systemUsers'), roles: ['admin'] },
        { href: '/superadmin/users', icon: Users, hoverIcon: Globe, label: t('sidebar.allUsers'), roles: ['superadmin'] },
        { href: '/system-admin', icon: Shield, hoverIcon: UserCheck, label: t('sidebar.owners'), roles: ['superadmin'] },
        { href: '/routers', icon: Server, hoverIcon: HardDrive, label: t('sidebar.routers'), roles: ['admin', 'manager'] },
        { href: '/nat', icon: ArrowLeftRight, hoverIcon: Network, label: t('sidebar.nat'), roles: ['superadmin'] },

        { href: '/genieacs', icon: Wifi, hoverIcon: Router, label: t('sidebar.genieacs'), roles: ['superadmin'] },
        { href: '/backup', icon: Database, hoverIcon: Save, label: t('sidebar.backup'), roles: ['superadmin'] },
        { href: '/invoice-settings', icon: FileText, hoverIcon: FileCheck, label: t('sidebar.invoiceSettings'), roles: ['superadmin'] },
        { href: '/notifications', icon: Bell, hoverIcon: Bell, label: t('sidebar.notification'), roles: ['superadmin', 'admin', 'manager', 'partner', 'viewer', 'customer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/logs', icon: ClipboardList, hoverIcon: MessageSquare, label: t('sidebar.logs'), roles: ['admin', 'manager', 'partner', 'viewer', 'customer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/app-settings', icon: Settings, hoverIcon: SlidersHorizontal, label: t('sidebar.appSettings'), roles: ['superadmin', 'admin', 'manager', 'partner', 'customer', 'staff', 'editor', 'agent', 'technician'] },
    ].filter(item => {
        return !item.roles || (userRole && item.roles.includes(userRole));
    });

    // Mobile/Launcher Navigation Items (Original Full List)
    const mobileLauncherItems = [
        { href: '/', icon: Home, label: t('sidebar.dashboard'), roles: ['superadmin', 'admin', 'manager', 'partner', 'viewer', 'customer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/billing', icon: CreditCard, label: t('sidebar.billing'), roles: ['admin', 'manager', 'partner', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/reports/financial', icon: Activity, label: t('sidebar.reports'), roles: ['admin'] },
        { href: '/users', icon: Users, label: t('sidebar.users'), roles: ['admin', 'manager', 'partner', 'viewer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/logs', icon: ClipboardList, label: t('sidebar.logs'), roles: ['admin', 'manager', 'partner', 'viewer', 'customer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/offline', icon: WifiOff, label: t('sidebar.offline'), roles: ['admin', 'manager', 'partner', 'viewer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/profiles', icon: Network, label: t('sidebar.profiles'), roles: ['admin', 'manager'] },
        { href: '/system-users', icon: UserCog, label: t('sidebar.systemUsers'), roles: ['admin'] },
        { href: '/superadmin/users', icon: Users, label: t('sidebar.allUsers'), roles: ['superadmin'] },
        { href: '/system-admin', icon: Shield, label: t('sidebar.owners'), roles: ['superadmin'] },
        { href: '/routers', icon: Server, label: t('sidebar.routers'), roles: ['admin', 'manager'] },
        { href: '/nat', icon: ArrowLeftRight, label: t('sidebar.nat'), roles: ['superadmin'] },

        { href: '/genieacs', icon: Wifi, label: t('sidebar.genieacs'), roles: ['superadmin'] },
        { href: '/admin/notifications/blast', icon: Megaphone, label: t('sidebar.broadcast'), roles: ['admin', 'superadmin', 'manager'] },
        { href: '/backup', icon: Database, label: t('sidebar.backup'), roles: ['superadmin'] },
        { href: '/invoice-settings', icon: FileText, label: t('sidebar.invoiceSettings'), roles: ['superadmin'] },
        { href: '/app-settings', icon: Settings, label: t('sidebar.appSettings'), roles: ['superadmin', 'admin', 'manager', 'partner', 'staff', 'editor', 'agent', 'technician'] },
    ].filter(item => {
        return !item.roles || (userRole && item.roles.includes(userRole));
    });

    // Select which list to use based on context
    const dockedNavItems = desktopNavItems;
    const launcherNavItems = mobileLauncherItems;

    // Mobile navigation items (Static 4 items for Bottom Dock)
    const mobileNavItems = [
        { href: '/', icon: Home, label: t('sidebar.dashboard') },
        { href: '/users', icon: Users, label: t('sidebar.users'), roles: ['admin', 'manager', 'partner', 'staff'] },
        { href: '/notifications', icon: Bell, label: t('sidebar.notification'), roles: ['admin', 'manager', 'partner', 'staff', 'customer'] },
        { href: '/app-settings', icon: Settings, label: t('sidebar.settings') || "Settings" },
    ].filter(item => !item.roles || (userRole && item.roles.includes(userRole)));

    // if (userRole === 'customer') return null;

    return (
        <>
            {/* Icon Gradient Definition removed as we are moving to solid high-contrast colors */}
            {/* Desktop Dock - Hidden on Mobile or Mobile App */}
            {!isMobile && (
                <div className="hidden lg:flex fixed bottom-0 left-0 right-0 z-50 justify-center pb-4 print:hidden pointer-events-none">
                    {/* macOS-style Dock Container - Glassy */}
                    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 px-4 py-3 pointer-events-auto">
                        <div className="flex items-center gap-14">
                            {/* Menu / Launcher Button */}
                            <button
                                onClick={() => setIsLauncherOpen(!isLauncherOpen)}
                                className="group relative flex flex-col items-center justify-center transition-all duration-300 hover:scale-125 hover:-translate-y-2 w-10"
                            >
                                <div className={`
                                    relative flex flex-col items-center justify-center
                                    w-10 h-10 rounded-xl
                                    transition-all duration-300
                                    bg-white/10 border border-white/20
                                    ${isLauncherOpen ? 'bg-white/30 border-white/40 !text-white' : ''}
                                `}>
                                    {isLauncherOpen ? (
                                        <X
                                            size={20}
                                            className={`
                                            transition-all duration-300
                                            ${isLauncherOpen ? 'text-white' : 'text-gray-600 dark:text-gray-300 group-hover:stroke-[url(#icon-gradient)]'}
                                        `}
                                        />
                                    ) : (
                                        <LayoutGrid
                                            size={20}
                                            className="text-white group-hover:text-blue-300 transition-colors duration-300"
                                        />
                                    )}
                                </div>
                                <span className="text-[10px] font-medium mt-2 whitespace-nowrap px-2 rounded-md transition-all duration-300 text-white/50 group-hover:text-white">
                                    {isLauncherOpen ? t('sidebar.close') : t('sidebar.app')}
                                </span>
                                {/* Hover glow effect */}
                                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-accent/20 blur-xl" />
                            </button>

                            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-2" />

                            {dockedNavItems.map((item) => {
                                const isActive = pathname === item.href || (item.label === 'PPPoE' && ['/users', '/active', '/offline', '/profiles', '/logs'].some(path => pathname.startsWith(path)));
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="group relative flex flex-col items-center justify-center transition-all duration-300 hover:scale-125 hover:-translate-y-2 w-10"
                                    >
                                        <div className={`
                                            relative flex flex-col items-center justify-center
                                            w-10 h-10 rounded-xl
                                            transition-all duration-300
                                            ${isActive
                                                ? 'bg-white/30 shadow-xl border border-white/40'
                                                : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                            }
                                        `}>
                                            <Icon
                                                size={20}
                                                className={`
                                                    transition-all duration-300
                                                    ${isActive
                                                        ? 'text-white'
                                                        : 'text-white/60 group-hover:text-white'
                                                    }
                                                `}
                                            />
                                            {item.href === '/notifications' && (
                                                <div className="absolute -top-1 -right-1">
                                                    <NotificationPopover isBadgeOnly={true} />
                                                </div>
                                            )}
                                        </div>

                                        <span className={`
                                            text-[10px] font-medium mt-2 whitespace-nowrap px-2 rounded-md
                                            transition-all duration-300
                                            ${isActive
                                                ? 'text-white font-bold'
                                                : 'text-white/50 group-hover:text-white'
                                            }
                                        `}>
                                            {item.label}
                                        </span>

                                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-accent/20 blur-xl" />
                                    </Link>
                                );
                            })}

                            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-2" />

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                title={t('sidebar.logout')}
                                className="group relative flex flex-col items-center justify-center transition-all duration-300 hover:scale-125 hover:-translate-y-2 w-10"
                            >
                                <div className="relative flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 group-hover:text-red-400 group-hover:shadow-lg group-hover:shadow-red-400/20 transition-all duration-300">
                                    <LogOut
                                        size={20}
                                        className="text-white/60 transition-colors duration-300"
                                    />
                                </div>
                                <span className="text-[10px] font-medium mt-2 whitespace-nowrap px-2 rounded-md transition-all duration-300 text-white/50 group-hover:text-red-400">
                                    {t('sidebar.logout')}
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
                    {/* Mobile Bottom Bar - Glassy */}
                    <div className="bg-white/10 dark:bg-black/40 backdrop-blur-xl border-t border-white/10 shadow-2xl">
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
                                                ? 'bg-white/20 border border-white/20'
                                                : 'bg-transparent'
                                            }
                                        `}>
                                            <Icon
                                                size={24}
                                                className={`
                                                    ${isActive
                                                        ? 'text-white'
                                                        : 'text-white/40'
                                                    }
                                                `}
                                            />
                                        </div>
                                        <span className={`
                                            text-[10px] font-medium mt-1
                                            ${isActive
                                                ? 'text-white font-bold'
                                                : 'text-white/40'
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
                                        ? 'bg-red-500/80 text-white shadow-lg shadow-red-500/30'
                                        : 'bg-white/20 text-white shadow-lg border border-white/20'
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
                                        ? 'text-red-400'
                                        : 'text-blue-200'
                                    }
                                `}>
                                    {isLauncherOpen ? t('sidebar.close') : t('sidebar.app')}
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
                                            p-1 rounded-xl transition-all duration-300 relative
                                            ${isActive
                                                ? 'bg-white/20 border border-white/20'
                                                : 'bg-transparent'
                                            }
                                        `}>
                                            <Icon
                                                size={24}
                                                className={`
                                                    ${isActive
                                                        ? 'text-white'
                                                        : 'text-white/40'
                                                    }
                                                `}
                                            />
                                            {item.href === '/notifications' && (
                                                <div className="absolute -top-2 -right-2">
                                                    <NotificationPopover isBadgeOnly={true} />
                                                </div>
                                            )}
                                        </div>
                                        <span className={`
                                            text-[10px] font-medium mt-1
                                            ${isActive
                                                ? 'text-white font-bold'
                                                : 'text-white/40'
                                            }
                                        `}>
                                            {item.label}
                                        </span>
                                    </Link>
                                );
                            })}

                            
                        </div>
                    </div>
                </div>
            </div>

            {/* App Launcher - Fullscreen on Mobile */}
            <AppLauncher
                isOpen={isLauncherOpen}
                onClose={() => setIsLauncherOpen(false)}
                navItems={launcherNavItems}
                currentPath={pathname}
            />
        </>
    );
}
