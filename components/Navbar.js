'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Settings, LogOut, Menu, X, Network, Share2, DollarSign, Wallet, FileText, Lock, Globe, Server, Cloud, Database, Palette, ClipboardList, ShieldAlert, Activity, ChevronDown, Router, Megaphone, Bell, MessageSquare, CreditCard, WifiOff, UserCog, Shield, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import NotificationPopover from './NotificationPopover';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isPppoeOpen, setIsPppoeOpen] = useState(false);
    const [appSettings, setAppSettings] = useState({ appName: 'Mikrotik Manager', logoUrl: '' });
    const [userRole, setUserRole] = useState(null);
    const { t, resolvedLanguage, setLanguage } = useLanguage();
    const { updateTheme, effectiveMode } = useTheme();

    const toggleTheme = () => {
        const newMode = effectiveMode === 'dark' ? 'light' : 'dark';
        updateTheme({ mode: newMode });
    };

    useEffect(() => {
        fetchAppSettings();
        fetchUserRole();
    }, []);

    const fetchUserRole = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUserRole(data.user?.role?.toLowerCase());
            }
        } catch (error) {
            console.error('Failed to fetch user role', error);
        }
    };

    const fetchAppSettings = async () => {
        try {
            const res = await fetch('/api/app-settings');
            if (res.ok) {
                const data = await res.json();
                setAppSettings(data);
            }
        } catch (error) {
            console.error('Failed to fetch app settings', error);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
        setIsPppoeOpen(false);
    };

    const navItems = [
        { href: '/', icon: Home, label: t('sidebar.dashboard') },
        { href: '/billing', icon: CreditCard, label: t('sidebar.billing'), roles: ['admin', 'manager', 'partner', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/reports/financial', icon: Activity, label: t('sidebar.reports'), roles: ['admin', 'manager', 'partner', 'staff', 'agent'] },
        { href: '/tickets', icon: MessageSquare, label: t('sidebar.tickets'), roles: ['admin', 'superadmin', 'manager', 'technician', 'agent'] },
        { href: '/genieacs', icon: Router, label: t('sidebar.genieacs'), roles: ['superadmin'] },
    ].filter(item => !item.roles || (userRole && item.roles.includes(userRole)));

    const pppoeItems = [
        { href: '/users', icon: Users, label: t('sidebar.users'), roles: ['admin', 'manager', 'partner', 'viewer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/active', icon: Activity, label: t('sidebar.activeConnections'), roles: ['admin', 'manager', 'partner', 'viewer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/offline', icon: WifiOff, label: t('sidebar.offline'), roles: ['admin', 'manager', 'partner', 'viewer', 'staff', 'editor', 'agent', 'technician'] },
        { href: '/profiles', icon: Settings, label: t('sidebar.profiles'), roles: ['admin', 'manager'] },
        { href: '/drop-users', icon: ShieldAlert, label: t('sidebar.dropIsolir'), roles: ['admin', 'manager'] },
    ].filter(item => !item.roles || (userRole && item.roles.includes(userRole)));

    const settingsItems = [
        { href: '/routers', icon: Server, label: t('sidebar.routers'), roles: ['admin', 'manager'] },
        { href: '/system-users', icon: UserCog, label: t('sidebar.systemUsers'), roles: ['admin'] },
        { href: '/superadmin/users', icon: Users, label: t('sidebar.allUsers'), roles: ['superadmin'] },
        { href: '/system-admin', icon: Shield, label: t('sidebar.owners'), roles: ['superadmin'] },
    ].filter(item => {
        if (userRole === 'editor') {
            return !['/app-settings', '/routers', '/nat'].includes(item.href);
        }
        if (userRole === 'superadmin' && item.href === '/routers') {
            return false;
        }
        if (item.roles && userRole && !item.roles.includes(userRole)) return false;
        return true;
    });

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/80 dark:bg-white/[0.02] backdrop-blur-xl border-b border-gray-200 dark:border-white/10 shadow-md">
            <div className="max-w-full px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3">
                        {appSettings.logoUrl ? (
                            <img
                                src={appSettings.logoUrl}
                                alt="Logo"
                                className="h-10 object-contain"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div className={`w-10 h-10 bg-accent rounded-2xl flex items-center justify-center font-bold text-xl text-white ${appSettings.logoUrl ? 'hidden' : ''}`}>
                            {appSettings.appName ? appSettings.appName.charAt(0).toUpperCase() : 'M'}
                        </div>
                        <span className="text-xl font-bold hidden sm:block text-gray-900 dark:text-white">{appSettings.appName}</span>
                    </Link>


                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all duration-200 ${pathname === item.href
                                    ? 'bg-accent text-white shadow-md'
                                    : 'text-gray-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </Link>
                        ))}

                        {/* PPPoE Dropdown */}
                        {userRole !== 'customer' && userRole !== 'superadmin' && (
                            <div className="relative">
                                <button
                                    onClick={() => setIsPppoeOpen(!isPppoeOpen)}
                                    onBlur={() => setTimeout(() => setIsPppoeOpen(false), 200)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all duration-200 ${pppoeItems.some(item => pathname === item.href)
                                        ? 'bg-accent text-white shadow-md'
                                        : 'text-gray-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    <Network size={18} />
                                    <span>PPPoE</span>
                                    <ChevronDown size={16} className={`transition-transform ${isPppoeOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isPppoeOpen && (
                                    <div className="absolute top-full mt-2 bg-white/90 dark:bg-gray-900 rounded-2xl shadow-2xl py-2 min-w-[200px] border-[4px] border-black/5 dark:border-white/10 backdrop-blur-xl">
                                        {pppoeItems.map((item) => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setIsPppoeOpen(false)}
                                                className={`flex items-center gap-2 px-4 py-2 hover:bg-white/5 transition-colors ${pathname === item.href
                                                    ? 'text-accent font-medium'
                                                    : 'text-gray-600 dark:text-slate-300'
                                                    }`}
                                            >
                                                <item.icon size={16} />
                                                <span className="text-sm">{item.label}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Settings Items */}
                        {userRole !== 'customer' && settingsItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all duration-200 ${pathname === item.href
                                    ? 'bg-accent text-white shadow-md'
                                    : 'text-gray-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </Link>
                        ))}

                        {/* Language Toggle */}
                        <button
                            onClick={() => setLanguage(resolvedLanguage === 'id' ? 'en' : 'id')}
                            className="p-2 rounded-2xl transition-colors relative text-gray-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white flex items-center justify-center font-bold text-sm w-10 h-10"
                            title={resolvedLanguage === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
                        >
                            {resolvedLanguage === 'id' ? 'ID' : 'EN'}
                        </button>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-2xl transition-colors relative text-gray-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                            title={effectiveMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {effectiveMode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {/* Notifications Link */}
                        <Link
                            href="/notifications"
                            className={`p-2 rounded-2xl transition-colors relative mr-2 ${pathname === '/notifications'
                                ? 'bg-accent text-white shadow-md'
                                : 'text-gray-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            title={t('sidebar.notification')}
                        >
                            <Bell size={20} />
                            <div className="absolute top-1 right-1">
                                <NotificationPopover isBadgeOnly={true} />
                            </div>
                        </Link>

                        {/* Logs */}
                        {userRole !== 'customer' && userRole !== 'superadmin' && (
                            <Link
                                href="/logs"
                                className={`p-2 rounded-2xl transition-colors ${pathname === '/logs'
                                        ? 'bg-accent text-white shadow-md'
                                    : 'text-gray-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                title={t('sidebar.logs')}
                            >
                                <ClipboardList size={20} />
                            </Link>
                        )}

                        {/* Settings Icon Link */}
                        {userRole !== 'customer' && (
                            <Link
                                href="/app-settings"
                                className={`p-2 rounded-2xl transition-colors ${pathname === '/app-settings'
                                        ? 'bg-accent text-white shadow-md'
                                    : 'text-gray-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                title="Settings"
                            >
                                <Settings size={20} />
                            </Link>
                        )}

                        {/* Logout Button - Hide for customers as they have it in dashboard */}
                        {userRole !== 'customer' && (
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-300 transition-colors ml-2"
                            >
                                <LogOut size={18} />
                                <span>{t('sidebar.logout')}</span>
                            </button>
                        )}
                    </div>

                    {/* Mobile Menu & Theme Toggle */}
                    <div className="flex lg:hidden items-center gap-1">
                        <button
                            onClick={() => setLanguage(resolvedLanguage === 'id' ? 'en' : 'id')}
                            className="p-2 rounded-2xl text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 font-bold text-sm w-10 h-10 flex items-center justify-center"
                            title={resolvedLanguage === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
                        >
                            {resolvedLanguage === 'id' ? 'ID' : 'EN'}
                        </button>
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-2xl text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center w-10 h-10"
                            title={effectiveMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {effectiveMode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button
                            onClick={toggleMobileMenu}
                            className="p-2 rounded-2xl text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center w-10 h-10"
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden pb-4">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeMobileMenu}
                                className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${pathname === item.href
                                    ? 'bg-accent text-white shadow-md'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-accent dark:hover:text-accent'
                                    }`}
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </Link>
                        ))}

                        {/* PPPoE Section */}
                        {userRole !== 'customer' && userRole !== 'superadmin' && (
                            <div>
                            <button
                                onClick={() => setIsPppoeOpen(!isPppoeOpen)}
                                className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-accent dark:hover:text-accent transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <Network size={18} />
                                    <span>PPPoE</span>
                                </div>
                                <ChevronDown size={16} className={`transition-transform ${isPppoeOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isPppoeOpen && (
                                <div className="ml-6 mt-1">
                                    {pppoeItems.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={closeMobileMenu}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${pathname === item.href
                                                ? 'bg-accent text-white shadow-md'
                                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-accent dark:hover:text-accent'
                                                }`}
                                        >
                                            <item.icon size={16} />
                                            <span className="text-sm">{item.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                            </div>
                        )}

                        {/* Settings Items */}
                        {userRole !== 'customer' && settingsItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeMobileMenu}
                                className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${pathname === item.href
                                    ? 'bg-accent text-white shadow-md'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-accent dark:hover:text-accent'
                                    }`}
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </Link>
                        ))}

                        {/* Mobile Notifications and Settings */}
                        {userRole !== 'customer' && (
                            <>
                                <Link
                                    href="/notifications"
                                    onClick={closeMobileMenu}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${pathname === '/notifications'
                                        ? 'bg-accent text-white shadow-md'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-accent dark:hover:text-accent'
                                        }`}
                                >
                                    <Bell size={18} />
                                    <span>{t('sidebar.notification')}</span>
                                </Link>
                                <Link
                                    href="/app-settings"
                                    onClick={closeMobileMenu}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${pathname === '/app-settings'
                                        ? 'bg-accent text-white shadow-md'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-accent dark:hover:text-accent'
                                        }`}
                                >
                                    <Settings size={18} />
                                    <span>{t('sidebar.settings')}</span>
                                </Link>
                            </>
                        )}

                        {/* Mobile Logout */}
                        <button
                            onClick={() => {
                                handleLogout();
                                closeMobileMenu();
                            }}
                            className="flex items-center gap-2 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors w-full mt-2"
                        >
                            <LogOut size={18} />
                            <span>{t('sidebar.logout')}</span>
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}
