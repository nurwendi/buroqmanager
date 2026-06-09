'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
    AlertCircle, CheckCircle2, XCircle, Search, 
    Send, AlertTriangle, Megaphone, Users, UserCog, Loader2, Bell, Check, Info, Clock
} from 'lucide-react';
import HeaderBanner from '@/components/HeaderBanner';

export default function NotificationsPage() {
    const { t } = useLanguage();
    const [currentUser, setCurrentUser] = useState(null);

    // Active Tab state
    const [activeTab, setActiveTab] = useState('notifications'); // 'notifications', 'broadcast'

    // Notifications state
    const [notifications, setNotifications] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(true);
    const [notificationsFilter, setNotificationsFilter] = useState('all');
    const [notificationsSearch, setNotificationsSearch] = useState('');

    // Broadcast state
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [broadcastType, setBroadcastType] = useState('info');
    const [broadcastTarget, setBroadcastTarget] = useState('all');
    const [broadcastLoading, setBroadcastLoading] = useState(false);
    const [broadcastStatus, setBroadcastStatus] = useState(null);

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        if (activeTab === 'notifications') {
            fetchNotifications();
        }
    }, [activeTab]);

    const fetchCurrentUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setCurrentUser(data.user);
            }
        } catch {}
    };

    const fetchNotifications = async () => {
        setNotificationsLoading(true);
        try {
            const res = await fetch('/api/notifications?limit=100');
            const data = await res.json();
            if (Array.isArray(data)) {
                setNotifications(data);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setNotificationsLoading(false);
        }
    };

    const markRead = async (recipientId) => {
        try {
            await fetch('/api/notifications/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientId })
            });
            setNotifications(prev => prev.map(n => n.id === recipientId ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const markAllRead = async () => {
        try {
            await fetch('/api/notifications/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ all: true })
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleSendBroadcast = async (e) => {
        e.preventDefault();
        setBroadcastLoading(true);
        setBroadcastStatus(null);

        try {
            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: broadcastTitle, 
                    message: broadcastMessage, 
                    type: broadcastType, 
                    target: broadcastTarget 
                })
            });

            const data = await res.json();
            if (res.ok) {
                setBroadcastStatus({ success: true, message: t('broadcast.success') || 'Broadcast sent successfully!' });
                setBroadcastTitle('');
                setBroadcastMessage('');
            } else {
                setBroadcastStatus({ success: false, message: data.error || t('broadcast.error') || 'Failed to send broadcast' });
            }
        } catch (error) {
            setBroadcastStatus({ success: false, message: t('broadcast.systemError') || 'System error sending broadcast' });
        } finally {
            setBroadcastLoading(false);
        }
    };

    // Helper for notification colors in system list
    const getTypeIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="text-green-500" size={20} />;
            case 'error': return <XCircle className="text-red-500" size={20} />;
            case 'alert': return <AlertTriangle className="text-yellow-500" size={20} />;
            default: return <Info className="text-blue-500" size={20} />;
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (notificationsFilter === 'unread') return !n.isRead;
        if (notificationsFilter === 'read') return n.isRead;
        return true;
    }).filter(n => {
        if (!notificationsSearch) return true;
        const search = notificationsSearch.toLowerCase();
        return n.notification.title.toLowerCase().includes(search) || 
               n.notification.message.toLowerCase().includes(search);
    });

    const isAdmin = currentUser && ['superadmin', 'admin', 'manager'].includes(currentUser.role?.toLowerCase());

    return (
        <div className="space-y-6 text-slate-800 dark:text-slate-100">
            <HeaderBanner
                title={t("notifications.title")}
                description={t("notifications.description")}
                icon={Bell}
            />

            <div className="w-full">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Side Menu */}
                    <div className="w-full md:w-64 flex-shrink-0 space-y-2 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                                activeTab === 'notifications' 
                                ? 'bg-accent text-white shadow-md' 
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Bell size={18} />
                            <span className="font-medium">{t("notifications.log")}</span>
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => setActiveTab('broadcast')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                                    activeTab === 'broadcast' 
                                    ? 'bg-accent text-white shadow-md' 
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <Megaphone size={18} />
                                <span className="font-medium">{t("notifications.sendBroadcast")}</span>
                            </button>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 min-w-0 w-full">

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                    <Bell className="text-accent" />
                                    {t("notifications.incoming")}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t("notifications.incomingDesc")}</p>
                            </div>
                            {notifications.some(n => !n.isRead) && (
                                <button
                                    onClick={markAllRead}
                                    className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors text-sm font-medium"
                                >
                                    <Check size={16} /> {t("notifications.markAllRead")}
                                </button>
                            )}
                        </div>

                        {/* Filters */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder={t("notifications.searchPlaceholder")}
                                        value={notificationsSearch}
                                        onChange={(e) => setNotificationsSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50"
                                    />
                                </div>
                                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                    {['all', 'unread', 'read'].map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setNotificationsFilter(f)}
                                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                                notificationsFilter === f 
                                                ? 'bg-white dark:bg-slate-900 text-accent shadow-sm' 
                                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                            }`}
                                        >
                                            {f === 'all' ? t('notifications.filterAll') : f === 'unread' ? t('notifications.filterUnread') : t('notifications.filterRead')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Feeds */}
                        {notificationsLoading ? (
                            <div className="flex flex-col items-center justify-center p-20">
                                <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">{t("notifications.loading")}</p>
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-20 text-center border border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
                                <Bell className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{t("notifications.emptyTitle")}</h3>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {notificationsSearch ? t('notifications.emptySearch') : t('notifications.emptyDesc')}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredNotifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`group bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md ${!n.isRead ? 'border-l-4 border-l-accent' : ''}`}
                                    >
                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 mt-1">
                                                {getTypeIcon(n.notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h3 className={`font-semibold truncate ${!n.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                        {n.notification.title}
                                                    </h3>
                                                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {new Date(n.notification.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 whitespace-pre-line">
                                                    {n.notification.message}
                                                </p>
                                                
                                                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        {n.notification.sender && (
                                                            <div className="flex items-center gap-2">
                                                                {n.notification.sender.avatar ? (
                                                                    <img src={n.notification.sender.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                                                                ) : (
                                                                    <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-[10px] uppercase font-bold text-gray-500">
                                                                        {n.notification.sender.fullName?.[0] || 'S'}
                                                                    </div>
                                                                )}
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                                    {n.notification.sender.fullName || t('notifications.systemSender')}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                                                            n.notification.type === 'alert' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20' :
                                                            n.notification.type === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-950/20' :
                                                            n.notification.type === 'success' ? 'bg-green-100 text-green-600 dark:bg-green-900/20' :
                                                            'bg-blue-100 text-blue-600 dark:bg-blue-900/20'
                                                        }`}>
                                                            {n.notification.type}
                                                        </span>
                                                    </div>

                                                    {!n.isRead && (
                                                        <button
                                                            onClick={() => markRead(n.id)}
                                                            className="text-xs text-accent font-semibold hover:underline"
                                                        >
                                                            {t("notifications.markRead")}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Broadcast Tab */}
                {activeTab === 'broadcast' && isAdmin && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <Megaphone className="text-accent" />
                                {t("notifications.broadcastTitle")}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t("notifications.broadcastDesc")}</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <form onSubmit={handleSendBroadcast} className="p-6 md:p-8 space-y-6">
                                {broadcastStatus && (
                                    <div className={`p-4 rounded-xl flex items-center gap-3 ${broadcastStatus.success ? 'bg-green-50 text-green-700 dark:bg-green-900/20' : 'bg-red-50 text-red-700 dark:bg-red-900/20'}`}>
                                        {broadcastStatus.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                        <p className="text-sm font-medium">{broadcastStatus.message}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Target Selection */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("notifications.target")}</label>
                                        <div className="grid grid-cols-3 gap-2 p-1 bg-gray-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                                            {[
                                                { id: 'all', label: t('notifications.targetAll'), icon: Users, desc: t('notifications.targetAllDesc') },
                                                { id: 'customers', label: t('notifications.targetCustomers'), icon: Users, desc: t('notifications.targetCustomersDesc') },
                                                { id: 'staff', label: t('notifications.targetStaff'), icon: UserCog, desc: t('notifications.targetStaffDesc') }
                                            ].map((tVal) => (
                                                <button
                                                    key={tVal.id}
                                                    type="button"
                                                    onClick={() => setBroadcastTarget(tVal.id)}
                                                    className={`flex flex-col items-center gap-1 py-3 rounded-lg transition-all relative group ${
                                                        broadcastTarget === tVal.id 
                                                        ? 'bg-white dark:bg-slate-900 text-accent shadow-sm border border-slate-200 dark:border-slate-800' 
                                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                    }`}
                                                >
                                                    <tVal.icon size={18} />
                                                    <span className="text-[10px] font-bold uppercase">{tVal.label}</span>
                                                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                                        {tVal.desc}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Type Selection */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("notifications.messageType")}</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[
                                                { id: 'info', color: 'bg-blue-500', text: t('notifications.typeInfo') },
                                                { id: 'success', color: 'bg-green-500', text: t('notifications.typeSuccess') },
                                                { id: 'alert', color: 'bg-yellow-500', text: t('notifications.typeAlert') },
                                                { id: 'error', color: 'bg-red-500', text: t('notifications.typeError') }
                                            ].map((tColor) => (
                                                <button
                                                    key={tColor.id}
                                                    type="button"
                                                    onClick={() => setBroadcastType(tColor.id)}
                                                    className={`h-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                                                        broadcastType === tColor.id 
                                                        ? `border-accent ring-2 ring-accent/20` 
                                                        : 'border-transparent'
                                                    } bg-gray-50 dark:bg-slate-950`}
                                                >
                                                    <div className={`w-3 h-3 rounded-full ${tColor.color} mr-2`}></div>
                                                    <span className="text-[10px] font-bold uppercase text-gray-600 dark:text-gray-400">
                                                        {tColor.text}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("notifications.inputTitle")}</label>
                                    <input
                                        type="text"
                                        required
                                        value={broadcastTitle}
                                        onChange={(e) => setBroadcastTitle(e.target.value)}
                                        placeholder={t("notifications.inputTitlePlaceholder")}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("notifications.inputMessage")}</label>
                                    <textarea
                                        required
                                        rows={6}
                                        value={broadcastMessage}
                                        onChange={(e) => setBroadcastMessage(e.target.value)}
                                        placeholder={t("notifications.inputMessagePlaceholder")}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all resize-none"
                                    />
                                </div>

                                <div className="pt-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-950 px-4 py-2 rounded-lg flex items-center gap-2">
                                        <Info size={14} className="text-accent shrink-0" />
                                        {t("notifications.infoNote")}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={broadcastLoading}
                                        className="w-full md:w-auto px-8 py-3 bg-accent text-white rounded-xl font-bold shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {broadcastLoading ? (
                                            <Loader2 className="animate-spin" size={20} />
                                        ) : (
                                            <Send size={20} />
                                        )}
                                        {t("notifications.sendNow")}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Preview Card */}
                        <div className="mt-12 opacity-50 select-none pointer-events-none">
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 text-center">{t("notifications.previewTitle")}</p>
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                     broadcastType === 'alert' ? 'bg-yellow-100 text-yellow-600' :
                                     broadcastType === 'error' ? 'bg-red-100 text-red-600' :
                                     broadcastType === 'success' ? 'bg-green-100 text-green-600' :
                                     'bg-blue-100 text-blue-600'
                                }`}>
                                    <Megaphone size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800 dark:text-gray-100">{broadcastTitle || t('notifications.defaultPreviewTitle')}</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{broadcastMessage || t('notifications.defaultPreviewMessage')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                    </div>
                </div>

            </div>
        </div>
    );
}
