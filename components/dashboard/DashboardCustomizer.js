'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Eye, EyeOff, RotateCcw, Clock } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';

export default function DashboardCustomizer() {
    const { preferences, toggleWidget, setRefreshInterval, resetDefaults } = useDashboard();
    const [isOpen, setIsOpen] = useState(false);

    const widgets = [
        { id: 'financial', label: 'Financial Overview', icon: '💰' },
        { id: 'pppoe', label: 'PPPoE Stats', icon: '👥' },



    ];

    const refreshOptions = [
        { value: 0, label: 'Disabled' },
        { value: 5000, label: '5 Seconds' },
        { value: 10000, label: '10 Seconds' },
        { value: 30000, label: '30 Seconds' },
        { value: 60000, label: '1 Minute' },
    ];

    return (
        <>
            {/* Trigger Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
                className="fixed right-6 bottom-24 md:bottom-6 z-40 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Customize Dashboard"
            >
                <Settings size={24} />
            </motion.button>

            {/* Backdrop & Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-900 shadow-2xl z-50 border-l border-gray-200 dark:border-gray-800 p-6 overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Settings size={20} className="text-blue-500" />
                                    Customize
                                </h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Widget Visibility Section */}
                            <div className="mb-8">
                                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                                    Widget Visibility
                                </h3>
                                <div className="space-y-3">
                                    {widgets.map((widget) => (
                                        <div
                                            key={widget.id}
                                            className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg">{widget.icon}</span>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    {widget.label}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => toggleWidget(widget.id)}
                                                className={`p-2 rounded-lg transition-colors ${preferences.dashboard?.visibleWidgets?.[widget.id]
                                                    ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'text-gray-400 bg-gray-50 dark:bg-gray-800'
                                                    }`}
                                            >
                                                {preferences.dashboard?.visibleWidgets?.[widget.id] ? (
                                                    <Eye size={18} />
                                                ) : (
                                                    <EyeOff size={18} />
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Refresh Interval Section */}
                            <div className="mb-8">
                                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                                    Refresh Rate
                                </h3>
                                <div className="flex flex-col gap-2">
                                    {refreshOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setRefreshInterval(option.value)}
                                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${preferences.dashboard?.refreshInterval === option.value
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Clock size={16} />
                                                <span className="text-sm font-medium">{option.label}</span>
                                            </div>
                                            {preferences.dashboard?.refreshInterval === option.value && (
                                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reset Button */}
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                                <button
                                    onClick={resetDefaults}
                                    className="w-full flex items-center justify-center gap-2 p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium"
                                >
                                    <RotateCcw size={18} />
                                    Reset to Defaults
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
