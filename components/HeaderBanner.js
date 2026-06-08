'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HeaderBanner({ title, description, icon: Icon, children }) {
    const { t } = useLanguage();
    const [bgUrl, setBgUrl] = useState('/dashboard-bg.png');

    useEffect(() => {
        fetch('/api/app-settings')
            .then(res => res.json())
            .then(data => {
                if (data.dashboardBgUrl) {
                    setBgUrl(data.dashboardBgUrl);
                }
            })
            .catch(err => console.error('Failed to fetch app settings in HeaderBanner', err));
    }, []);

    return (
        <div className="relative mb-8 -mx-2 md:-mx-8 -mt-20 md:-mt-24 print:hidden">
            <div className="relative h-44 sm:h-48 w-full overflow-hidden">
                <img 
                    src={bgUrl} 
                    alt="Header Banner" 
                    className="absolute inset-0 w-full h-full object-cover object-center scale-105"
                    style={{ imageRendering: "high-quality" }}
                />
                <div className="absolute inset-0 bg-slate-900/30 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-black/10 to-black/50"></div>
                
                <div className="absolute top-20 md:top-24 left-6 md:left-8 z-10">
                    <div className="flex items-center gap-3">
                        {Icon && (
                            <div className="p-2.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl text-white shadow-lg">
                                <Icon size={24} />
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
                                {title}
                            </h1>
                            {description && (
                                <p className="text-white/85 text-xs md:text-sm font-medium mt-1 max-w-md drop-shadow-sm">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Optional Action Controls Area (Desktop only, absolutely positioned inside the banner) */}
                {children && (
                    <div className="absolute top-20 md:top-24 right-6 md:right-8 z-20 hidden md:flex flex-wrap items-center justify-end gap-2 max-w-[calc(100%-2rem)]">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}
