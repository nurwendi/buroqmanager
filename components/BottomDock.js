'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Home, Users, Settings, Server, Activity, LogOut, Network, CreditCard, WifiOff, Database, Menu, X, Palette, Bell, Wallet,
    LayoutGrid, UserCheck, Zap, Wifi, Route, ShieldCheck, HardDrive, Save, SlidersHorizontal, MessageSquare, Shield, FileText, FileCheck, UserCog
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import AppLauncher from './AppLauncher';

export default function BottomDock() {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useLanguage();
    const [userRole, setUserRole] = useState(null);
    const [isLauncherOpen, setIsLauncherOpen] = useState(false);

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Failed to fetch user');
            })
            .then(data => setUserRole(data.user.role))
            .catch(() => setUserRole(null));
    }, []);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    // All navigation items
    const navItems = [
        { href: '/', icon: Home, hoverIcon: LayoutGrid, label: t('sidebar.dashboard'), roles: ['superadmin', 'admin', 'manager', 'partner', 'viewer', 'customer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/billing', icon: CreditCard, hoverIcon: Wallet, label: t('sidebar.billing'), roles: ['admin', 'manager', 'partner', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/users', icon: Users, hoverIcon: UserCheck, label: t('sidebar.users'), roles: ['admin', 'manager', 'partner', 'viewer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/active', icon: Activity, hoverIcon: Zap, label: t('sidebar.activeConnections'), roles: ['admin', 'manager', 'partner', 'viewer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/notifications', icon: Bell, hoverIcon: MessageSquare, label: t('sidebar.notifications'), roles: ['admin', 'manager', 'partner', 'viewer', 'customer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/offline', icon: WifiOff, hoverIcon: Wifi, label: 'Offline', roles: ['admin', 'manager', 'partner', 'viewer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/profiles', icon: Network, hoverIcon: Route, label: t('sidebar.profiles'), roles: ['admin', 'manager'] },
        { href: '/system-users', icon: UserCog, hoverIcon: ShieldCheck, label: t('sidebar.systemUsers'), roles: ['admin'] },
        { href: '/system-admin', icon: Shield, hoverIcon: UserCheck, label: 'Owners', roles: ['superadmin'] },
        { href: '/routers', icon: Server, hoverIcon: HardDrive, label: 'Routers', roles: ['admin', 'manager'] },
        { href: '/backup', icon: Database, hoverIcon: Save, label: t('sidebar.backup'), roles: ['superadmin', 'admin', 'manager'] },
        { href: '/invoice-settings', icon: FileText, hoverIcon: FileCheck, label: 'Invoice Settings', roles: ['superadmin'] },
        { href: '/app-settings', icon: Settings, hoverIcon: SlidersHorizontal, label: t('sidebar.appSettings'), roles: ['superadmin', 'admin', 'manager', 'partner', 'staff', 'editor', 'agent', 'technician'] },
    ].filter(item => !item.roles || (userRole && item.roles.includes(userRole)));

    // Mobile navigation items (Dynamic based on role)
    const mobileNavItems = userRole === 'superadmin' ? [
        { href: '/', icon: Home, label: t('sidebar.dashboard') },
        { href: '/system-admin', icon: Shield, label: 'Owners' },
        { href: '/app-settings', icon: Settings, label: t('sidebar.appSettings') },
    ] : [
        { href: '/', icon: Home, label: t('sidebar.dashboard') },
        { href: '/active', icon: Activity, label: 'Active' },
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

            {/* Desktop Dock - Hidden on Mobile */}
            <div className="hidden lg:flex fixed bottom-0 left-0 right-0 z-50 justify-center pb-4 print:hidden pointer-events-none">
                {/* macOS-style Dock Container */}
                <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 px-4 py-3 pointer-events-auto">
                    <div className="flex items-center gap-4">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            const HoverIcon = item.hoverIcon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="group relative flex flex-col items-center justify-center transition-all duration-300 hover:scale-125 hover:-translate-y-2"
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
                                                    : 'text-gray-600 dark:text-gray-300'
                                                }
                                            `}
                                        />
                                    </div>

                                    {/* Label - hidden by default, shows on hover above icon */}
                                    <span className={`
                                        absolute -top-8 text-[10px] font-medium whitespace-nowrap px-2 py-1 rounded-md
                                        transition-all duration-300
                                        ${isActive
                                            ? 'opacity-0 group-hover:opacity-100 text-accent dark:text-blue-400 bg-blue-50 dark:bg-gray-800'
                                            : 'opacity-0 group-hover:opacity-100 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 shadow-lg'
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
                            className="group relative flex flex-col items-center justify-center transition-all duration-300 hover:scale-125 hover:-translate-y-2"
                        >
                            <div className="relative flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-800 group-hover:text-red-500 group-hover:shadow-lg group-hover:shadow-red-400/20 transition-all duration-300">
                                <LogOut
                                    size={24}
                                    className="text-gray-600 dark:text-gray-300 group-hover:text-red-500 transition-colors duration-300"
                                />
                            </div>
                            <span className="absolute -top-8 text-[10px] font-medium whitespace-nowrap px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 shadow-lg transition-all duration-300">
                                Logout
                            </span>
                            {/* Hover glow effect */}
                            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-red-400/10 blur-xl" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Navigation - Visible on Mobile Only */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[102] print:hidden">
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
                                    {isLauncherOpen ? 'Close' : 'Menu'}
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
                navItems={navItems}
                currentPath={pathname}
            />
        </>
    );
}
