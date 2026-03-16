'use client';

import { motion } from 'framer-motion';
import { colorSchemes } from './constants';

const StatCard = ({ icon: Icon, title, value, subtitle, color = 'blue', alert = false, onClick }) => {
    const scheme = colorSchemes[color] || colorSchemes.blue;

    const solidColors = {
        blue: 'text-blue-500 dark:text-blue-400',
        green: 'text-emerald-500 dark:text-emerald-400',
        purple: 'text-purple-500 dark:text-purple-400',
        orange: 'text-orange-500 dark:text-orange-400',
        red: 'text-red-500 dark:text-red-400',
    };

    const iconColor = solidColors[color] || solidColors.blue;


    const textColors = {
        blue: 'text-blue-600',
        green: 'text-emerald-600',
        purple: 'text-purple-600',
        orange: 'text-orange-600',
        red: 'text-red-600',
    };

    const textColor = textColors[color] || textColors.blue;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={onClick}
            className={`
                relative group
                bg-white rounded-2xl 
                p-6 
                border border-gray-100 shadow-sm
                transition-all duration-300 
                cursor-pointer overflow-hidden
                ${alert ? 'ring-2 ring-red-500 ring-offset-2' : ''}
            `}
        >
            {/* Content */}
            <div className="relative z-10">
                {/* Icon container */}
                <motion.div
                    className={`
                        inline-flex p-4 rounded-xl mb-4
                        ${scheme.iconBg.replace('dark:bg-blue-900/40', '').replace('dark:bg-emerald-900/40', '').replace('dark:bg-purple-900/40', '').replace('dark:bg-orange-900/40', '').replace('dark:bg-red-900/40', '')}
                        transition-all duration-300
                        group-hover:scale-110
                    `}
                    whileHover={{ scale: 1.1 }}
                >
                    <Icon className={`${iconColor}`} size={28} strokeWidth={2.5} />
                </motion.div>


                {/* Title */}
                <h3 className="text-gray-500 text-sm font-semibold mb-2 tracking-wide uppercase">
                    {title}
                </h3>

                {/* Value */}
                <p className={`
                    text-3xl font-bold mb-1 truncate
                    ${textColor}
                `} title={value}>
                    {value}
                </p>

                {/* Subtitle */}
                {subtitle && (
                    <p className="text-xs text-gray-400 font-medium mt-2">
                        {subtitle}
                    </p>
                )}
            </div>
        </motion.div>
    );
};

export default StatCard;
