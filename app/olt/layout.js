'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, PlusCircle, LayoutDashboard, Server, Settings, ChevronDown } from 'lucide-react';
import { OltProvider, useOlt } from '@/contexts/OltContext';
import { useState } from 'react';

function OltSidebar({ children }) {
    const pathname = usePathname();
    const { olts, selectedOltId, selectOlt, loading } = useOlt();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const menuItems = [
        { href: '/olt', label: 'Overview', icon: LayoutDashboard, exact: true },
        { href: '/olt/onus', label: 'ONU List', icon: Activity, exact: false },
        { href: '/olt/register', label: 'Register ONT', icon: PlusCircle, exact: false },
        { href: '/olt/settings', label: 'OLT Settings', icon: Settings, exact: false }, // New settings page
    ];

    const currentOlt = olts.find(o => o.id === selectedOltId);

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-white dark:bg-gray-800 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                        <Activity className="text-blue-600" />
                        OLT Manager
                    </h2>

                    {/* OLT Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            <span className="flex items-center gap-2 truncate">
                                <Server size={16} />
                                {loading ? 'Loading...' : (currentOlt?.name || 'Select OLT')}
                            </span>
                            <ChevronDown size={14} />
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50 overflow-hidden">
                                {olts.map(olt => (
                                    <button
                                        key={olt.id}
                                        onClick={() => {
                                            selectOlt(olt.id);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600
                                            ${selectedOltId === olt.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}
                                        `}
                                    >
                                        <div className={`w-2 h-2 rounded-full ${selectedOltId === olt.id ? 'bg-blue-500' : 'bg-gray-400'}`} />
                                        {olt.name}
                                    </button>
                                ))}
                                {olts.length === 0 && !loading && (
                                    <div className="px-3 py-2 text-xs text-gray-500 text-center">No OLTs found</div>
                                )}
                                <Link
                                    href="/olt/settings"
                                    onClick={() => setIsDropdownOpen(false)}
                                    className="block w-full text-left px-3 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-600 border-t border-gray-100 dark:border-gray-600 font-medium"
                                >
                                    + Manage OLTs
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="px-4 pb-6 md:pb-0 space-y-1 flex-1">
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

export default function OltLayout({ children }) {
    return (
        <OltProvider>
            <OltSidebar>{children}</OltSidebar>
        </OltProvider>
    );
}
