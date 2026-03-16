'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AppLauncher({ isOpen, onClose, navItems, currentPath }) {
    const { t } = useLanguage();
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[40]"
                        onClick={onClose}
                    />

                    {/* Fullscreen Launcher */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="fixed inset-0 z-[45] bg-white/5 dark:bg-black/40 backdrop-blur-3xl overflow-y-auto"
                    >
                        {/* App Grid */}
                        <div className="container mx-auto px-6 py-20 pb-32">
                            <h2 className="text-3xl font-bold text-white mb-8 text-center drop-shadow-lg">
                                {t('sidebar.applications') || 'Applications'}
                            </h2>

                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 max-w-5xl mx-auto">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = currentPath === item.href;

                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={onClose}
                                            className="group flex flex-col items-center justify-center"
                                        >
                                            {/* Icon Container */}
                                            <motion.div
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.95 }}
                                                className={`
                                                    w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mb-2
                                                    transition-all duration-300
                                                    ${isActive
                                                        ? 'bg-white/30 text-white shadow-2xl border border-white/40 backdrop-blur-md'
                                                        : 'bg-white/10 backdrop-blur-md shadow-lg hover:bg-white/20 border border-white/10'
                                                    }
                                                `}
                                            >
                                                <Icon
                                                    size={28}
                                                    className={`
                                                        ${isActive
                                                            ? 'text-white'
                                                            : 'text-white/80'
                                                        }
                                                    `}
                                                />
                                            </motion.div>

                                            {/* Label */}
                                            <span className={`
                                                text-xs sm:text-sm font-medium text-center leading-tight
                                                ${isActive
                                                    ? 'text-white font-bold'
                                                    : 'text-white/60'
                                                }
                                            `}>
                                                {item.label}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
