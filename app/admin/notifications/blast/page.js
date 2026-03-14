'use client';

import { useState, useEffect } from 'react';
import { Send, Users, UserCog, Megaphone, AlertCircle, CheckCircle, Info, Loader2, Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function BlastPage() {
    const { t } = useLanguage();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('info');
    const [target, setTarget] = useState('all');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // { success: boolean, message: string }
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => setUserRole(data.user?.role?.toLowerCase()));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, message, type, target })
            });

            const data = await res.json();
            if (res.ok) {
                setStatus({ success: true, message: t('broadcast.success') });
                setTitle('');
                setMessage('');
            } else {
                setStatus({ success: false, message: data.error || t('broadcast.error') });
            }
        } catch (error) {
            setStatus({ success: false, message: t('broadcast.systemError') });
        } finally {
            setLoading(false);
        }
    };

    if (userRole && !['superadmin', 'admin', 'manager'].includes(userRole)) {
        return (
            <div className="p-20 text-center">
                <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('broadcast.accessDenied')}</h1>
                <p className="text-gray-500 dark:text-gray-400">{t('broadcast.adminOnly')}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 pb-20 pt-20">
            <div className="max-w-3xl mx-auto px-4">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <Megaphone className="text-accent" />
                        {t('broadcast.title')}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('broadcast.subtitle')}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                        {status && (
                            <div className={`p-4 rounded-xl flex items-center gap-3 ${status.success ? 'bg-green-50 text-green-700 dark:bg-green-900/20' : 'bg-red-50 text-red-700 dark:bg-red-900/20'}`}>
                                {status.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                <p className="text-sm font-medium">{status.message}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Target Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('broadcast.target')}</label>
                                <div className="grid grid-cols-3 gap-2 p-1 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                                    {[
                                        { id: 'all', label: t('broadcast.all'), icon: Users, desc: t('broadcast.allDesc') },
                                        { id: 'customers', label: t('broadcast.customers'), icon: Users, desc: t('broadcast.customersDesc') },
                                        { id: 'staff', label: t('broadcast.staff'), icon: UserCog, desc: t('broadcast.staffDesc') }
                                    ].map((tVal) => (
                                        <button
                                            key={tVal.id}
                                            type="button"
                                            onClick={() => setTarget(tVal.id)}
                                            className={`flex flex-col items-center gap-1 py-3 rounded-lg transition-all relative group ${
                                                target === tVal.id 
                                                ? 'bg-white dark:bg-gray-800 text-accent shadow-sm border border-gray-100 dark:border-gray-700' 
                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                        >
                                            <tVal.icon size={18} />
                                            <span className="text-[10px] font-bold uppercase">{tVal.label}</span>
                                            {target === tVal.id && (
                                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                                    {tVal.desc}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Type Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('broadcast.messageType')}</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: 'info', color: 'bg-blue-500' },
                                        { id: 'success', color: 'bg-green-500' },
                                        { id: 'alert', color: 'bg-yellow-500' },
                                        { id: 'error', color: 'bg-red-500' }
                                    ].map((tColor) => (
                                        <button
                                            key={tColor.id}
                                            type="button"
                                            onClick={() => setType(tColor.id)}
                                            className={`h-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                                                type === tColor.id 
                                                ? `border-accent ring-2 ring-accent/20` 
                                                : 'border-transparent'
                                            } bg-gray-50 dark:bg-gray-900`}
                                        >
                                            <div className={`w-3 h-3 rounded-full ${tColor.color} mr-2`}></div>
                                            <span className="text-[10px] font-bold uppercase text-gray-600 dark:text-gray-400">{tColor.id}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('broadcast.msgTitle')}</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={t('broadcast.msgTitlePlaceholder')}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('broadcast.msgContent')}</label>
                            <textarea
                                required
                                rows={6}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={t('broadcast.msgContentPlaceholder')}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all resize-none"
                            />
                        </div>

                        <div className="pt-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-lg flex items-center gap-2">
                                <Info size={14} className="text-accent" />
                                {t('broadcast.footerNote')}
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full md:w-auto px-8 py-3 bg-accent text-white rounded-xl font-bold shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <Send size={20} />
                                )}
                                {t('broadcast.sendNow')}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Preview Card */}
                <div className="mt-12 opacity-50 select-none pointer-events-none">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 text-center">{t('broadcast.preview')}</p>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 flex gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                             type === 'alert' ? 'bg-yellow-100 text-yellow-600' :
                             type === 'error' ? 'bg-red-100 text-red-600' :
                             type === 'success' ? 'bg-green-100 text-green-600' :
                             'bg-blue-100 text-blue-600'
                        }`}>
                            <Megaphone size={20} />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-800 dark:text-gray-100">{title || t('broadcast.msgTitle')}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{message || t('broadcast.msgContentPlaceholder')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
