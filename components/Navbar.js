'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Settings, LogOut, Menu, X, Network, Share2, DollarSign, Wallet, FileText, Lock, Globe, Server, Cloud, Database, Palette, Bell, ShieldAlert, Activity, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isPppoeOpen, setIsPppoeOpen] = useState(false);
    const [appSettings, setAppSettings] = useState({ appName: 'Mikrotik Manager', logoUrl: '' });
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        fetchAppSettings();
        fetchUserRole();
    }, []);

    const fetchUserRole = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUserRole(data.user?.role);
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
        { href: '/', icon: Home, label: 'Dashboard' },
    ];

    const pppoeItems = [
        { href: '/users', icon: Users, label: 'Users' },
        { href: '/active', icon: Activity, label: 'Active Connections' },
        { href: '/profiles', icon: Settings, label: 'Profiles' },
        { href: '/drop-users', icon: ShieldAlert, label: 'Drop / Isolir' },
    ];

    const settingsItems = [
        { href: '/app-settings', icon: Settings, label: 'App Settings' },
        { href: '/routers', icon: Server, label: 'Routers' },
    ].filter(item => {
        if (userRole === 'editor') {
            return !['/app-settings', '/routers'].includes(item.href);
        }
        return true;
    });

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl border-b border-white/20 dark:border-white/5 shadow-sm">
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
                        <div className={`w-10 h-10 bg-accent rounded-lg flex items-center justify-center font-bold text-xl text-white ${appSettings.logoUrl ? 'hidden' : ''}`}>
                            M
                        </div>
                        <span className="text-xl font-bold hidden sm:block text-gray-800 dark:text-white">{appSettings.appName}</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${pathname === item.href
                                    ? 'bg-accent text-white shadow-md'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-accent dark:hover:text-accent'
                                    }`}
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </Link>
                        ))}

                        {/* PPPoE Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsPppoeOpen(!isPppoeOpen)}
                                onBlur={() => setTimeout(() => setIsPppoeOpen(false), 200)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${pppoeItems.some(item => pathname === item.href)
                                    ? 'bg-accent text-white shadow-md'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-accent dark:hover:text-accent'
                                    }`}
                            >
                                <Network size={18} />
                                <span>PPPoE</span>
                                <ChevronDown size={16} className={`transition-transform ${isPppoeOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {isPppoeOpen && (
                                <div className="absolute top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-2 min-w-[200px] border border-gray-100 dark:border-gray-700 backdrop-blur-md bg-opacity-90 dark:bg-opacity-90">
                                    {pppoeItems.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsPppoeOpen(false)}
                                            className={`flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${pathname === item.href
                                                ? 'text-accent dark:text-accent font-medium'
                                                : 'text-gray-600 dark:text-gray-300'
                                                }`}
                                        >
                                            <item.icon size={16} />
                                            <span className="text-sm">{item.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Settings Items */}
                        {settingsItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${pathname === item.href
                                    ? 'bg-accent text-white shadow-md'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-accent dark:hover:text-accent'
                                    }`}
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </Link>
                        ))}
                        {/* Notifications */}
                        <Link
                            href="/notifications"
                            className={`p-2 rounded-lg transition-colors ml-2 ${pathname === '/notifications'
                                ? 'bg-accent/10 text-accent'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-accent dark:hover:text-accent'
                                }`}
                            title="Notifications"
                        >
                            <Bell size={20} />
                        </Link>

                        {/* Logout Button - Hide for customers as they have it in dashboard */}
                        {userRole !== 'customer' && (
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-2"
                            >
                                <LogOut size={18} />
                                <span>Keluar</span>
                            </button>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={toggleMobileMenu}
                        className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
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

                        {/* Settings Items */}
                        {settingsItems.map((item) => (
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

                        {/* Mobile Logout */}
                        <button
                            onClick={() => {
                                handleLogout();
                                closeMobileMenu();
                            }}
                            className="flex items-center gap-2 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors w-full mt-2"
                        >
                            <LogOut size={18} />
                            <span>Logout</span>
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
}
