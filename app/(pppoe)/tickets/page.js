'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
    MessageSquare, AlertCircle, Clock, CheckCircle2, XCircle, Search, 
    Filter, Send, User, ChevronRight, UserCheck, ShieldAlert, AlertTriangle,
    Megaphone, Users, UserCog, Loader2, Bell, Check, Info, Trash2
} from 'lucide-react';
import HeaderBanner from '@/components/HeaderBanner';

export default function AdminTicketsPage() {
    const { t } = useLanguage();
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chatLoading, setChatLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const chatEndRef = useRef(null);
    const pollingIntervalRef = useRef(null);

    useEffect(() => {
        fetchCurrentUser();
        fetchTickets();
        fetchStaffList();

        // Refresh ticket list every 15 seconds
        const ticketInterval = setInterval(fetchTickets, 15000);
        return () => {
            clearInterval(ticketInterval);
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, []);

    useEffect(() => {
        if (selectedTicket) {
            fetchMessages(selectedTicket.id);
            // Polling chat messages every 5 seconds (Option A)
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = setInterval(() => fetchMessages(selectedTicket.id, true), 5000);
        } else {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            setMessages([]);
        }
    }, [selectedTicket]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchCurrentUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setCurrentUser(data.user);
            }
        } catch {}
    };

    const fetchTickets = async () => {
        try {
            const res = await fetch('/api/tickets');
            if (res.ok) {
                const data = await res.json();
                setTickets(data);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaffList = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                // Filter users who are technicians or agents
                setStaffList(data.filter(u => u.isTechnician || u.isAgent || u.role === 'admin'));
            }
        } catch {}
    };



    const fetchMessages = async (ticketId, isSilent = false) => {
        if (!isSilent) setChatLoading(true);
        try {
            const res = await fetch(`/api/tickets/${ticketId}/messages`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            if (!isSilent) setChatLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedTicket) return;

        const messageText = newMessage;
        setNewMessage('');

        try {
            const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText })
            });

            if (res.ok) {
                const newMsg = await res.json();
                setMessages(prev => [...prev, newMsg]);
                fetchTickets(); // Refresh list to update unread status
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleUpdateStatus = async (status) => {
        if (!selectedTicket) return;
        try {
            const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                const updated = await res.json();
                setSelectedTicket(prev => ({ ...prev, status: updated.status }));
                fetchTickets();
            }
        } catch {}
    };

    const handleAssignStaff = async (staffId) => {
        if (!selectedTicket) return;
        try {
            const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ technicianId: staffId || null })
            });
            if (res.ok) {
                const updated = await res.json();
                setSelectedTicket(prev => ({ ...prev, technicianId: updated.technicianId, technician: updated.technician }));
                fetchTickets();
            }
        } catch {}
    };

    // Calculate ticket stats
    const stats = {
        open: tickets.filter(t => t.status === 'open').length,
        inProgress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
    };

    // Helper to determine the chat read status indicator:
    // 🔴 Belum Dibaca: last message is from customer and it is unread (isRead: false)
    // 🟡 Dibaca (Belum Dibalas): last message is from customer and it is read (isRead: true)
    // 🟢 Sudah Dibalas: last message is from staff/admin (technician/admin)
    const getChatStatusIndicator = (ticket) => {
        // This count is returned from _count.messages (unread customer messages)
        const unreadCount = ticket._count?.messages || 0;
        
        if (unreadCount > 0) {
            return {
                color: 'bg-red-500',
                text: t('tickets.chatUnread'),
                badge: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
            };
        }

        // Check status to see if it is resolved/closed
        if (ticket.status === 'resolved' || ticket.status === 'closed') {
            return {
                color: 'bg-emerald-500',
                text: t('tickets.chatResolved'),
                badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
            };
        }

        return {
            color: 'bg-emerald-500',
            text: t('tickets.chatReplied'),
            badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
        };
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch = 
            ticket.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
    });



    return (
        <div className="space-y-6 text-slate-800 dark:text-slate-100">
            <HeaderBanner
                title={t('tickets.title')}
                description={t('tickets.description')}
                icon={MessageSquare}
            />

            <div className="w-full">
                {/* Content Area */}
                <>
                        {/* Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-blue-100 dark:bg-blue-950/40 text-blue-600 rounded-lg">
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('tickets.statsNew')}</div>
                                    <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-amber-100 dark:bg-amber-950/40 text-amber-600 rounded-lg">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('tickets.statsInProgress')}</div>
                                    <div className="text-2xl font-bold text-amber-600">{stats.inProgress}</div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
                                    <CheckCircle2 size={20} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('tickets.statsResolved')}</div>
                                    <div className="text-2xl font-bold text-emerald-600">{stats.resolved}</div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            
                            {/* Ticket List */}
                            <div className="lg:col-span-5 bg-white dark:bg-slate-900/90 rounded-2xl backdrop-blur-sm border border-slate-100 dark:border-slate-800 shadow-md shadow-slate-200/40 dark:shadow-none overflow-hidden flex flex-col h-[650px]">
                                
                                {/* Search & Filters */}
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 space-y-3">
                                    <div className="relative">
                                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder={t('tickets.searchPlaceholder')}
                                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <select 
                                            className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none"
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                        >
                                            <option value="all">{t('tickets.filterAllStatus')}</option>
                                            <option value="open">{t('tickets.statusOpen')}</option>
                                            <option value="in_progress">{t('tickets.statusInProgress')}</option>
                                            <option value="resolved">{t('tickets.statusResolved')}</option>
                                            <option value="closed">{t('tickets.statusClosed')}</option>
                                        </select>
                                        <select 
                                            className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs font-semibold focus:outline-none"
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value)}
                                        >
                                            <option value="all">{t('tickets.filterAllCategory')}</option>
                                            <option value="teknis">{t('tickets.categoryTechnical')}</option>
                                            <option value="tagihan">{t('tickets.categoryBilling')}</option>
                                            <option value="umum">{t('tickets.categoryGeneral')}</option>
                                        </select>
                                    </div>
                                </div>

                                {/* List */}
                                <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {loading ? (
                                        <div className="p-8 text-center text-slate-400 text-sm">{t('tickets.loading')}</div>
                                    ) : filteredTickets.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-sm">{t('tickets.emptyList')}</div>
                                    ) : (
                                        filteredTickets.map(ticket => {
                                            const chatIndicator = getChatStatusIndicator(ticket);
                                            const isSelected = selectedTicket?.id === ticket.id;
                                            return (
                                                <button
                                                    key={ticket.id}
                                                    onClick={() => setSelectedTicket(ticket)}
                                                    className={`w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-slate-100/70 dark:bg-slate-800/60 border-l-4 border-blue-500' : ''}`}
                                                >
                                                    <div className="space-y-1.5 flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold font-mono text-slate-400">{ticket.ticketId}</span>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                                                ticket.category === 'teknis' ? 'bg-red-50 text-red-600 dark:bg-red-950/20' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/20'
                                                            }`}>
                                                                {ticket.category}
                                                            </span>
                                                        </div>
                                                        <h3 className="font-semibold text-sm truncate text-slate-800 dark:text-slate-200">{ticket.title}</h3>
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                                            <User size={12} />
                                                            <span className="truncate">{ticket.customer.name}</span>
                                                        </div>
                                                    </div>

                                                    {/* Status Badge */}
                                                    <div className="flex flex-col items-end gap-2">
                                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${chatIndicator.badge}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${chatIndicator.color}`} />
                                                            {chatIndicator.text}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Chat & Details Pane */}
                            <div className="lg:col-span-7 bg-white dark:bg-slate-900/90 rounded-2xl backdrop-blur-sm border border-slate-100 dark:border-slate-800 shadow-md shadow-slate-200/40 dark:shadow-none overflow-hidden flex flex-col h-[650px]">
                                {selectedTicket ? (
                                    <>
                                        {/* Header Detail */}
                                        <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold font-mono text-slate-500">{selectedTicket.ticketId}</span>
                                                    <span className="text-xs text-slate-400">• {t('tickets.created')} {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <h2 className="font-bold text-base text-slate-800 dark:text-slate-100">{selectedTicket.title}</h2>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('tickets.customerLabel')} <span className="font-semibold">{selectedTicket.customer.name}</span> ({selectedTicket.customer.phone})</p>
                                            </div>

                                            {/* Quick Actions Dropdowns */}
                                            <div className="flex gap-2">
                                                {/* Status Setter */}
                                                <select
                                                    className="px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 font-semibold focus:outline-none"
                                                    value={selectedTicket.status}
                                                    onChange={(e) => handleUpdateStatus(e.target.value)}
                                                >
                                                    <option value="open">{t('tickets.statusOpen')}</option>
                                                    <option value="in_progress">{t('tickets.statusInProgress')}</option>
                                                    <option value="resolved">{t('tickets.statusResolved')}</option>
                                                    <option value="closed">{t('tickets.statusClosed')}</option>
                                                </select>

                                                {/* Assignee Setter */}
                                                <select
                                                    className="px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 font-semibold focus:outline-none max-w-[150px]"
                                                    value={selectedTicket.technicianId || ''}
                                                    onChange={(e) => handleAssignStaff(e.target.value)}
                                                >
                                                    <option value="">{t('tickets.unassigned')}</option>
                                                    {staffList.map(staff => (
                                                        <option key={staff.id} value={staff.id}>
                                                            {staff.fullName || staff.username} ({staff.role === 'admin' ? t('tickets.roleAdmin') : staff.isTechnician ? t('tickets.roleTechnician') : t('tickets.roleAgent')})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Ticket Description banner */}
                                        <div className="px-4 py-3 bg-amber-50/50 dark:bg-amber-950/10 border-b border-amber-100/50 dark:border-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
                                            <ShieldAlert size={16} className="shrink-0 text-amber-500" />
                                            <div>
                                                <span className="font-semibold">{t('tickets.initialDescription')}</span> {selectedTicket.description}
                                            </div>
                                        </div>

                                        {/* Chat Messages Log */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-950/10">
                                            {chatLoading ? (
                                                <div className="text-center text-xs text-slate-400 pt-8">{t('tickets.chatLoading')}</div>
                                            ) : messages.length === 0 ? (
                                                <div className="text-center text-xs text-slate-400 pt-8">{t('tickets.chatEmpty')}</div>
                                            ) : (
                                                messages.map(msg => {
                                                    const isCustomer = msg.senderType === 'customer';
                                                    const isSupervisor = msg.senderType === 'admin';
                                                    return (
                                                        <div 
                                                            key={msg.id} 
                                                            className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                                                        >
                                                            <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400 font-medium">
                                                                <span>{msg.senderName}</span>
                                                                {isSupervisor && (
                                                                    <span className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-[8px] px-1 rounded font-bold">
                                                                        {t('tickets.supervisorBadge')}
                                                                    </span>
                                                                )}
                                                                <span>• {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                                                                isCustomer 
                                                                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-slate-800' 
                                                                    : isSupervisor
                                                                        ? 'bg-rose-600 text-white rounded-tr-none'
                                                                        : 'bg-blue-600 text-white rounded-tr-none'
                                                            }`}>
                                                                {msg.message}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                            <div ref={chatEndRef} />
                                        </div>

                                        {/* Chat Input Area */}
                                        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 dark:border-slate-800/60 flex gap-2">
                                            <input
                                                type="text"
                                                placeholder={t('tickets.inputPlaceholder')}
                                                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                            />
                                            <button 
                                                type="submit" 
                                                className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-colors"
                                            >
                                                <Send size={18} />
                                            </button>
                                        </form>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 space-y-3">
                                        <MessageSquare size={48} className="text-slate-300" />
                                        <div className="text-sm">{t('tickets.selectTicket')}</div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </>
            </div>
        </div>
    );
}
