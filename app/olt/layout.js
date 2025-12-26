'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, PlusCircle, LayoutDashboard } from 'lucide-react';

export default function OltLayout({ children }) {
    const pathname = usePathname();

    const menuItems = [
        { href: '/olt', label: 'Overview', icon: LayoutDashboard, exact: true },
        { href: '/olt/onus', label: 'ONU List', icon: Activity, exact: false },
        { href: '/olt/register', label: 'Register ONT', icon: PlusCircle, exact: false },
    ];

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-white dark:bg-gray-800 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Activity className="text-blue-600" />
                        OLT Manager
                    </h2>
                </div>

                <nav className="px-4 pb-6 md:pb-0 space-y-1">
                    {menuItems.map((item) => {
                        const isActive = item.exact
                            ? pathname === item.href
                            : pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <item.icon size={20} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
