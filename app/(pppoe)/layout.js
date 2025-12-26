'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Activity, WifiOff, Network, Bell } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';

export default function PppoeLayout({ children }) {
    const pathname = usePathname();
    const { t } = useLanguage();

    const menuItems = [
        { href: '/users', label: t('sidebar.users'), icon: Users },
        { href: '/active', label: 'Active', icon: Activity },
        { href: '/offline', label: 'Offline', icon: WifiOff },
        { href: '/profiles', label: t('sidebar.profiles'), icon: Network },
        { href: '/notifications', label: t('sidebar.notifications'), icon: Bell },
    ];

    return (
        <div className="flex min-h-screen">
            {/* Desktop Sidebar - Hidden on Mobile */}
            {/* Desktop Sidebar - Hidden on Mobile */}
            <aside className="hidden lg:flex flex-col w-72 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl m-4 ml-6 p-6 fixed h-[calc(100vh-6rem)] top-4 z-40">
                <div className="mb-6 px-2">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                        {t('sidebar.pppoe')} Manager
                    </h2>
                </div>
                <nav className="space-y-2">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-gray-800 dark:text-blue-400 font-medium shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content Area */}
            {/* On Desktop, add margin-left to account for fixed sidebar */}
            <main className="flex-1 lg:pl-96 w-full pt-4">
                {children}
            </main>
        </div>
    );
}
