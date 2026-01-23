'use client';

import { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Calendar, Plus, Search, FileText, Settings, Printer, ArrowUpDown, UserX, MessageCircle, X, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function BillingPage() {
    const [payments, setPayments] = useState([]);
    const [stats, setStats] = useState({ totalRevenue: 0, todaysRevenue: 0, pendingCount: 0, totalTransactions: 0 });
    const [agentStats, setAgentStats] = useState(null); // New state for agent stats
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const [users, setUsers] = useState([]); // For user selection (PPPoE Users)
    const [systemUsers, setSystemUsers] = useState([]); // For resolving Agent/Technician names
    const [profiles, setProfiles] = useState([]); // For price lookup
    const [searchTerm, setSearchTerm] = useState('');
    const [invoiceSettings, setInvoiceSettings] = useState({
        companyName: 'Mikrotik Manager',
        companyAddress: '',
        companyContact: '',
        invoiceFooter: ''
    });
    const [printFormat, setPrintFormat] = useState('a4'); // 'a4' or 'thermal'
    const [customerDetails, setCustomerDetails] = useState(null);
    const [customersData, setCustomersData] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showMonthModal, setShowMonthModal] = useState(false);
    const [userRole, setUserRole] = useState(null);

    const [formData, setFormData] = useState({
        username: '',
        amount: '',
        method: 'cash',
        notes: '',
        status: 'completed'
    });

    const [origin, setOrigin] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);

    // Searchable dropdown state
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOrigin(window.location.origin);
        }
    }, []);



    useEffect(() => {
        if (showModal && formData.username) {
            setUserSearchTerm(formData.username);
        } else if (!showModal) {
            // Optional: clear search term on close if desired, or keep it.
            // setUserSearchTerm(''); 
        }
    }, [showModal, formData.username]);

    useEffect(() => {
        fetchData();
        fetchUsers();
        fetchSystemUsers();
        fetchProfiles();
        fetchSettings();
        fetchCustomersData();
        fetchUserRole();
    }, [selectedMonth, selectedYear]); // Re-fetch when month/year changes

    const fetchData = async () => {
        setLoading(true);
        try {
            const [paymentsRes, statsRes, agentStatsRes] = await Promise.all([
                fetch('/api/billing/payments'),
                fetch('/api/billing/stats'),
                fetch(`/api/billing/stats/agent?month=${selectedMonth}&year=${selectedYear}`) // Fetch agent stats
            ]);

            if (paymentsRes.ok) setPayments(await paymentsRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
            if (agentStatsRes.ok) {
                const agentData = await agentStatsRes.json();
                setAgentStats(agentData);
            } else {
                // Handle error siliently
            }
        } catch (error) {
            console.error('Failed to fetch billing data', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/pppoe/users');
            if (res.ok) setUsers(await res.json());
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const fetchSystemUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) setSystemUsers(await res.json());
        } catch (error) {
            console.error('Failed to fetch system users', error);
        }
    };

    const fetchProfiles = async () => {
        try {
            const res = await fetch('/api/pppoe/profiles');
            if (res.ok) setProfiles(await res.json());
        } catch (error) {
            console.error('Failed to fetch profiles', error);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/billing/settings');
            if (res.ok) setInvoiceSettings(await res.json());
        } catch (error) {
            console.error('Failed to fetch invoice settings', error);
        }
    };

    const fetchUserRole = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUserRole(data.user.role);
            }
        } catch (error) {
            console.error('Failed to fetch user role', error);
        }
    };

    const handleGenerateInvoices = async () => {
        setShowMonthModal(true);
    };

    const handleGenerateForMonth = async (month, year) => {
        if (!confirm(`Generate invoices for ${new Date(year, month, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}?`)) return;

        setLoading(true);
        try {
            const res = await fetch('/api/billing/invoices/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month, year })
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                fetchData();
                setShowMonthModal(false);
            } else {
                alert('Failed to generate invoices: ' + data.error);
            }
        } catch (error) {
            console.error('Error generating invoices:', error);
            alert('Error generating invoices');
        } finally {
            setLoading(false);
        }
    };

    const handleAutoDrop = async () => {
        if (!confirm('This will change profile to DROP for all users with unpaid invoices. Continue?')) return;

        setLoading(true);
        try {
            const res = await fetch('/api/billing/auto-drop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check-and-drop' })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`${data.message}\n\nDropped users: ${data.droppedUsers.join(', ') || 'None'}`);
            } else {
                alert('Failed to auto-drop: ' + data.error);
            }
        } catch (error) {
            console.error('Error auto-drop:', error);
            alert('Error processing auto-drop');
        } finally {
            setLoading(false);
        }
    };

    const [lastRecordedPayment, setLastRecordedPayment] = useState(null); // For success modal state

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            console.log('Sending payment data:', formData);
            const res = await fetch('/api/billing/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (res.ok) {
                // Don't close modal, show success state
                setLastRecordedPayment(data.payment);
                setFormData({ username: '', amount: '', method: 'cash', notes: '', status: 'completed' });

                fetchData();
            } else {
                alert('Failed to record payment: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to record payment', error);
            alert('Error recording payment: ' + error.message);
        }
    };



    const filteredPayments = payments.filter(p => {
        const customerName = customersData[p.username]?.name || '';
        const searchLower = searchTerm.toLowerCase();
        const pDate = new Date(p.date);

        // Filter by selected month/year
        const matchesMonth = pDate.getMonth() === selectedMonth && pDate.getFullYear() === selectedYear;

        // Filter by search term
        const matchesSearch = p.username.toLowerCase().includes(searchLower) ||
            customerName.toLowerCase().includes(searchLower) ||
            p.notes?.toLowerCase().includes(searchLower);

        return matchesMonth && matchesSearch;
    });

    const getAvailableMonths = () => {
        const months = new Set();

        // Always include current month
        const now = new Date();
        months.add(`${now.getFullYear()}-${now.getMonth()}`);

        // Add all months from payments
        payments.forEach(p => {
            const date = new Date(p.date);
            months.add(`${date.getFullYear()}-${date.getMonth()}`);
        });

        return Array.from(months).sort().reverse().map(m => {
            const [year, month] = m.split('-');
            return { year: parseInt(year), month: parseInt(month) };
        });
    };

    const getMonthStats = () => {
        const monthPayments = payments.filter(p => {
            const pDate = new Date(p.date);
            return pDate.getMonth() === selectedMonth && pDate.getFullYear() === selectedYear;
        });

        const totalRevenue = monthPayments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);

        const totalUnpaid = monthPayments
            .filter(p => p.status !== 'completed')
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);

        return {
            totalRevenue,
            totalUnpaid,
            totalTransactions: monthPayments.length,
            pendingCount: monthPayments.filter(p => p.status !== 'completed').length
        };
    };

    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    const getMonthName = (monthIndex) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return months[monthIndex];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const fetchCustomerDetails = async (username) => {
        try {
            const res = await fetch(`/api/customers/${username}`);
            const data = await res.json();
            setCustomerDetails(data);
        } catch (error) {
            console.error('Failed to fetch customer details', error);
            setCustomerDetails({ name: '', address: '', phone: '' });
        }
    };

    const fetchCustomersData = async () => {
        try {
            const res = await fetch('/api/customers');
            const data = await res.json();
            setCustomersData(data);
        } catch (error) {
            console.error('Failed to fetch customers data', error);
        }
    };

    const getCustomerName = (username) => {
        return customersData[username]?.name || username;
    };

    const getAgentName = (username) => {
        const customer = customersData[username];
        if (!customer || !customer.agentId) return '-';
        const agent = systemUsers.find(u => u.id === customer.agentId);
        return agent ? agent.username : '-';
    };

    const getTechnicianName = (username) => {
        const customer = customersData[username];
        if (!customer || !customer.technicianId) return '-';
        const tech = systemUsers.find(u => u.id === customer.technicianId);
        return tech ? tech.username : '-';
    };

    const sortData = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedPayments = () => {
        const filtered = filteredPayments;
        if (!sortConfig.key) return filtered;

        const sorted = [...filtered].sort((a, b) => {
            let aVal, bVal;

            switch (sortConfig.key) {
                case 'date':
                    aVal = new Date(a.date).getTime();
                    bVal = new Date(b.date).getTime();
                    break;
                case 'customer':
                    aVal = getCustomerName(a.username).toLowerCase();
                    bVal = getCustomerName(b.username).toLowerCase();
                    break;
                case 'amount':
                    aVal = parseFloat(a.amount);
                    bVal = parseFloat(b.amount);
                    break;
                case 'status':
                    aVal = a.status;
                    bVal = b.status;
                    break;
                default:
                    aVal = a[sortConfig.key] || '';
                    bVal = b[sortConfig.key] || '';
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    };

    const [selectedIds, setSelectedIds] = useState(new Set());

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = getSortedPayments().map(p => p.id);
            setSelectedIds(new Set(allIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} invoices?`)) return;

        try {
            const res = await fetch('/api/billing/payments', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: Array.from(selectedIds) })
            });

            if (res.ok) {
                setPayments(prev => prev.filter(p => !selectedIds.has(p.id)));
                setSelectedIds(new Set());
                fetchData();
            } else {
                alert('Failed to delete items');
            }
        } catch (error) {
            console.error('Bulk delete failed', error);
        }
    };

    const handleBulkMarkPaid = async () => {
        if (!confirm(`Mark ${selectedIds.size} invoices as PAID?`)) return;

        try {
            const res = await fetch('/api/billing/payments', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ids: Array.from(selectedIds),
                    status: 'completed'
                })
            });

            if (res.ok) {
                fetchData();
                setSelectedIds(new Set());
            } else {
                alert('Failed to update items');
            }
        } catch (error) {
            console.error('Bulk update failed', error);
        }
    };

    const handleDeletePayment = async (id) => {
        if (!confirm('Apakah Anda yakin ingin menghapus invoice ini secara permanen?')) return;


        try {
            const res = await fetch('/api/billing/payments', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id] })
            });

            if (res.ok) {
                // Remove locally to update UI faster
                setPayments(prev => prev.filter(p => p.id !== id));
                // Reload full data
                fetchData();
            } else {
                const data = await res.json();
                alert('Gagal menghapus: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Delete failed', error);
            alert('Error deleting invoice');
        }
    };

    const getWhatsAppFormattedUrl = (payment) => {
        const customer = customersData[payment.username];
        if (!customer) {
            return { error: `Data pelanggan tidak ditemukan untuk username: ${payment.username}` };
        }

        if (!customer.phone) {
            return { error: `Nomor HP pelanggan belum diisi` };
        }

        let phone = customer.phone.replace(/\D/g, '');
        const formattedPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;

        const invoiceLink = `${origin}/invoice/${payment.id}`;
        const periode = new Date(payment.date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        const tanggal = new Date(payment.date).toLocaleDateString('id-ID');
        const amount = formatCurrency(payment.amount);
        const companyName = invoiceSettings.companyName || 'ISP';

        const message = `*INVOICE PEMBAYARAN*
\`\`\`
${companyName.toUpperCase()}
================================
No. Invoice : ${String(payment.id || '').slice(0, 8) || '-'}
Tanggal     : ${tanggal}
Pelanggan   : ${customer.name}
Periode     : ${periode}
--------------------------------
JUMLAH      : ${amount}
Status      : LUNAS
================================
Terima Kasih
\`\`\`

`;

        return { url: `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}` };
    };

    const handleSendWhatsApp = (payment) => {
        const result = getWhatsAppFormattedUrl(payment);
        if (result.error) {
            alert(result.error);
            return;
        }
        window.open(result.url, '_blank');
    };

    /*
        const _unused_handleSendWhatsApp = (payment) => {
            console.log('handleSendWhatsApp called for:', payment);
     
            const customer = customersData[payment.username];
            console.log('Customer lookup:', { username: payment.username, found: !!customer, data: customer });
     
            if (!customer) {
                alert(`Data pelanggan tidak ditemukan untuk username: ${payment.username}. Hubungi admin.`);
                return;
            }
     
            if (!customer.phone) {
                alert(`Nomor HP pelanggan belum diisi untuk ${customer.name || payment.username}. Silakan lengkapi data pelanggan terlebih dahulu.`);
                return;
            }
     
            let phone = customer.phone.replace(/\D/g, '');
            const formattedPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
            console.log('Formatted phone:', formattedPhone);
     
            const invoiceLink = `${window.location.origin}/invoice/${payment.id}`;
            const periode = new Date(payment.date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            const tanggal = new Date(payment.date).toLocaleDateString('id-ID');
            const amount = formatCurrency(payment.amount);
            const companyName = invoiceSettings.companyName || 'ISP';
     
            // Thermal printer style receipt (Simple Text)
            const message = `*INVOICE PEMBAYARAN*
    ${companyName.toUpperCase()}
    ================================
    No. Invoice : ${payment.id?.slice(0, 8) || '-'}
    Tanggal     : ${tanggal}
    Pelanggan   : ${customer.name}
    Periode     : ${periode}
    --------------------------------
    *JUMLAH     : ${amount}*
    Status      : LUNAS
    ================================
    Terima Kasih
     
    Link Invoice PDF:
    ${invoiceLink}`;
     
            const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
            console.log('Opening WhatsApp URL:', url);
     
            window.open(url, '_blank');
        };
    */

    return (
        <div>
            <div className="space-y-6 print:hidden">
                <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Billing & Payments</h1>
                    <select
                        value={`${selectedYear}-${selectedMonth}`}
                        onChange={(e) => {
                            const [year, month] = e.target.value.split('-');
                            setSelectedYear(parseInt(year));
                            setSelectedMonth(parseInt(month));
                        }}
                        className="w-full md:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                        {getAvailableMonths().map(({ year, month }) => (
                            <option key={`${year}-${month}`} value={`${year}-${month}`}>
                                {new Date(year, month, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                            </option>
                        ))}
                    </select>

                    <div className="flex flex-col gap-2 md:flex-row md:gap-2">
                        {userRole === 'admin' && (
                            <>

                                <button
                                    onClick={handleGenerateInvoices}
                                    className="w-full md:w-auto bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors shadow-sm"
                                >
                                    <FileText size={20} /> Generate Invoices
                                </button>

                                <button
                                    onClick={handleAutoDrop}
                                    className="w-full md:w-auto bg-red-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-sm"
                                >
                                    <UserX size={20} /> Auto-Drop Unpaid
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setShowModal(true)}
                            className="w-full md:w-auto bg-accent text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-sm"
                        >
                            <Plus size={20} /> Record Payment
                        </button>
                    </div>
                </div>



                {/* Staff Link for Staff */}
                {agentStats && agentStats.role === 'staff' && (
                    <div className="bg-blue-50/30 dark:bg-blue-900/30 backdrop-blur-xl border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-4 flex justify-between items-center shadow-lg">
                        <div>
                            <h3 className="font-bold text-blue-800">Staff Dashboard Available</h3>
                            <p className="text-blue-600 text-sm">View your personal performance statistics.</p>
                        </div>
                        <Link href="/billing/staff">
                            <button className="bg-accent text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all">
                                Go to Staff Dashboard
                            </button>
                        </Link>
                    </div>
                )}

                {/* Partner Earnings Section */}
                {userRole === 'admin' && (
                    <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl overflow-hidden border border-white/20 dark:border-white/5">


                        <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl overflow-hidden border border-white/20 dark:border-white/5">
                            <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Staff Earnings - {getMonthName(selectedMonth)} {selectedYear}</h2>
                            </div>
                            <div className="overflow-x-auto">

                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-black/5 dark:bg-white/5">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Staff</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rate</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paid</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unpaid</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total Revenue</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Commission</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Net Revenue</th>
                                        </tr>
                                    </thead>

                                    <tbody className="bg-transparent divide-y divide-gray-200/50 dark:divide-white/10">
                                        {(!agentStats || !agentStats.agents || agentStats.agents.length === 0) ? (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                                                    No partners with transactions this month
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                                {agentStats.agents.map((agent) => (
                                                    <tr key={agent.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div>
                                                                    <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                                                                    <div className="text-xs text-gray-500">{agent.role}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {agent.rate}%
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                                {agent.paidCount}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                                                {agent.unpaidCount}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            {formatCurrency(agent.totalRevenue)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                                                            {formatCurrency(agent.commission)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                                                            {formatCurrency(agent.totalRevenue - agent.commission)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {/* Total Row */}
                                                <tr className="bg-gray-100 dark:bg-gray-700/50 font-semibold">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan="4">
                                                        Total
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatCurrency(agentStats.grandTotal?.revenue || 0)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                                                        {formatCurrency(agentStats.grandTotal?.commission || 0)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                                                        {formatCurrency(agentStats.grandTotal?.netRevenue || 0)}
                                                    </td>
                                                </tr>
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Action Toolbar */}
                {selectedIds.size > 0 && userRole === 'admin' && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-indigo-200 dark:border-indigo-900 flex justify-between items-center mb-4 animate-in fade-in slide-in-from-top-2">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                            {selectedIds.size} items selected
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={handleBulkMarkPaid}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                            >
                                <DollarSign size={18} /> Mark Paid
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                            >
                                <Trash2 size={18} /> Delete
                            </button>
                        </div>
                    </div>
                )}

                {/* Payment List */}
                <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl overflow-hidden border border-white/20 dark:border-white/5">
                    <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Payment History</h2>

                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search user or notes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-black/5 dark:bg-white/5">
                                <tr>
                                    {userRole === 'admin' && (
                                        <th className="px-6 py-3 w-10">
                                            <input
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={getSortedPayments().length > 0 && selectedIds.size === getSortedPayments().length}
                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </th>
                                    )}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                    <th
                                        onClick={() => sortData('customer')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            Customer
                                            <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Invoice
                                    </th>
                                    <th
                                        onClick={() => sortData('amount')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            Amount
                                            <ArrowUpDown size={14} />
                                        </div>
                                    </th>

                                    <th
                                        onClick={() => sortData('status')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            Status
                                            <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agent</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Technician</th>
                                    <th
                                        onClick={() => sortData('date')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            Date
                                            <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Delete</th>
                                </tr>
                            </thead>
                            <tbody className="bg-transparent divide-y divide-gray-200/50 dark:divide-white/10">

                                {loading ? (
                                    <tr><td colSpan="8" className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
                                ) : getSortedPayments().length === 0 ? (
                                    <tr><td colSpan="8" className="px-6 py-4 text-center text-gray-500">No payments found</td></tr>
                                ) : (
                                    getSortedPayments()
                                        .slice(
                                            (currentPage - 1) * (rowsPerPage === 'All' ? getSortedPayments().length : rowsPerPage),
                                            rowsPerPage === 'All' ? getSortedPayments().length : currentPage * rowsPerPage
                                        )
                                        .map((payment) => (
                                            <tr key={payment.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedIds.has(payment.id) ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
                                                {userRole === 'admin' && (
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(payment.id)}
                                                            onChange={() => handleSelectOne(payment.id)}
                                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        onClick={async () => {
                                                            setSelectedInvoice(payment);

                                                            await fetchCustomerDetails(payment.username);
                                                            // Small delay to ensure state is updated
                                                            setTimeout(() => setShowInvoiceModal(true), 100);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-900"
                                                    >
                                                        View
                                                    </button>
                                                    {payment.status === 'completed' && (
                                                        <button
                                                            onClick={() => handleSendWhatsApp(payment)}
                                                            className="text-green-600 hover:text-green-900 ml-3"
                                                            title="Kirim WhatsApp"
                                                        >
                                                            <MessageCircle size={18} />
                                                        </button>
                                                    )}
                                                </td>


                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    <div>
                                                        <div className="font-semibold">{getCustomerName(payment.username)}</div>
                                                        {customersData[payment.username]?.name && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">ID: {payment.username}</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                    {payment.invoiceNumber ? payment.invoiceNumber.split('/').pop() : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                                                    {formatCurrency(payment.amount)}
                                                </td>


                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                        payment.status === 'postponed' ? 'bg-orange-100 text-orange-800' :
                                                            payment.status === 'merged' ? 'bg-gray-100 text-gray-500' :
                                                                'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {payment.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                    {getAgentName(payment.username)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                    {getTechnicianName(payment.username)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                                    {formatDate(payment.date)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                                                    {userRole === 'admin' && (
                                                        <button
                                                            onClick={() => handleDeletePayment(payment.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                            title="Hapus Invoice"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                                Showing <span className="font-medium mx-1">
                                    {getSortedPayments().length === 0 ? 0 : (currentPage - 1) * (rowsPerPage === 'All' ? getSortedPayments().length : rowsPerPage) + 1}
                                </span>
                                to
                                <span className="font-medium mx-1">
                                    {rowsPerPage === 'All' ? getSortedPayments().length : Math.min(currentPage * rowsPerPage, getSortedPayments().length)}
                                </span>
                                of
                                <span className="font-medium mx-1">{getSortedPayments().length}</span> results
                            </div>

                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    const val = e.target.value === 'All' ? 'All' : parseInt(e.target.value);
                                    setRowsPerPage(val);
                                    setCurrentPage(1);
                                }}
                                className="text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value="All">All</option>
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => {
                                    const maxPage = rowsPerPage === 'All' ? 1 : Math.ceil(getSortedPayments().length / rowsPerPage);
                                    return Math.min(prev + 1, maxPage);
                                })}
                                disabled={rowsPerPage === 'All' || currentPage >= Math.ceil(getSortedPayments().length / rowsPerPage)}
                                className="px-3 py-1 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Payment Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
                        >
                            <h2 className="text-xl font-bold mb-4 text-gray-800">
                                {lastRecordedPayment ? 'Payment Recorded!' : 'Record Payment'}
                            </h2>

                            {lastRecordedPayment ? (
                                <div className="space-y-6 text-center py-4">
                                    <div className="flex justify-center">
                                        <div className="bg-green-100 p-4 rounded-full">
                                            <DollarSign size={48} className="text-green-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-lg font-semibold text-gray-800">Pembayaran Berhasil Disimpan</p>
                                        <p className="text-gray-500 mt-1">
                                            {formatCurrency(lastRecordedPayment.amount)} - {lastRecordedPayment.username}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => handleSendWhatsApp(lastRecordedPayment)}
                                            className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 font-medium transition-colors"
                                        >
                                            <MessageCircle size={20} /> Kirim WhatsApp
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedInvoice(lastRecordedPayment);
                                                setPrintFormat('thermal');
                                                fetchCustomerDetails(lastRecordedPayment.username);
                                                setShowInvoiceModal(true);
                                            }}
                                            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium transition-colors"
                                        >
                                            <Printer size={20} /> Cetak
                                        </button>
                                        <button
                                            onClick={() => {
                                                setLastRecordedPayment(null);
                                                setShowModal(false);
                                            }}
                                            className="w-full px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium transition-colors"
                                        >
                                            Tutup
                                        </button>
                                        <button
                                            onClick={() => setLastRecordedPayment(null)}
                                            className="w-full px-4 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            Input Pembayaran Lain
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {users.length === 0 && (
                                        <div className="bg-yellow-50/30 dark:bg-yellow-900/30 backdrop-blur-xl text-yellow-800 dark:text-yellow-300 p-3 rounded-lg text-sm mb-4 border border-yellow-200/50 dark:border-yellow-800/50 shadow-lg">
                                            Warning: No users found. Please check Mikrotik connection or add users first.
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={userSearchTerm}
                                                onChange={(e) => {
                                                    setUserSearchTerm(e.target.value);
                                                    setShowUserDropdown(true);
                                                    setFormData({ ...formData, username: '' }); // Reset username on type until selected? Or keep?
                                                }}
                                                onFocus={() => {
                                                    setShowUserDropdown(true);
                                                    // Initialize search term if empty but formData has value?
                                                    if (!userSearchTerm && formData.username) {
                                                        setUserSearchTerm(formData.username);
                                                    }
                                                }}
                                                placeholder="Search user..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                            {showUserDropdown && (
                                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                                    {users.filter(u => u.name.toLowerCase().includes(userSearchTerm.toLowerCase())).length === 0 ? (
                                                        <div className="px-4 py-2 text-gray-500 text-sm">No users found</div>
                                                    ) : (
                                                        users.filter(u => u.name.toLowerCase().includes(userSearchTerm.toLowerCase())).map(user => (
                                                            <div
                                                                key={user['.id']}
                                                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-gray-900"
                                                                onClick={() => {
                                                                    // Selection Logic
                                                                    const selectedUser = user;
                                                                    let amount = formData.amount;

                                                                    if (selectedUser && selectedUser.profile) {
                                                                        const userProfile = profiles.find(p => p.name === selectedUser.profile);
                                                                        if (userProfile && userProfile.comment && userProfile.comment.includes('price:')) {
                                                                            const match = userProfile.comment.match(/price:(\d+)/);
                                                                            if (match) {
                                                                                amount = match[1];
                                                                            }
                                                                        } else if (userProfile && userProfile.price) {
                                                                            amount = userProfile.price;
                                                                        }
                                                                    }


                                                                    setFormData({
                                                                        ...formData,
                                                                        username: selectedUser.name,
                                                                        amount: amount,
                                                                        notes: ''
                                                                    });
                                                                    setUserSearchTerm(selectedUser.name);
                                                                    setShowUserDropdown(false);
                                                                }}
                                                            >
                                                                <div className="font-medium">{user.name}</div>
                                                                {user.profile && <div className="text-xs text-gray-500">{user.profile}</div>}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {/* Overlay to close dropdown when clicking outside */}
                                        {showUserDropdown && (
                                            <div
                                                className="fixed inset-0 z-0"
                                                onClick={() => setShowUserDropdown(false)}
                                            ></div>
                                        )}
                                    </div>

                                    {/* Advance Payment Checkbox */}


                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (IDR)</label>
                                        <input
                                            type="number"
                                            value={formData.amount}
                                            onChange={(e) => {
                                                setFormData({ ...formData, amount: e.target.value });
                                                // If user manually changes amount, we might want to uncheck the box or handle it differently
                                                // For now, let's just let them edit it
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                                            placeholder="150000"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                                            rows="3"
                                            placeholder="Optional notes..."
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90"
                                        >
                                            Save Payment
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )
            }

            {/* Month Selection Modal for Invoice Generation */}
            {
                showMonthModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
                        >
                            <h2 className="text-xl font-bold mb-4 text-gray-800">Generate Invoices for Month</h2>
                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        const now = new Date();
                                        handleGenerateForMonth(now.getMonth(), now.getFullYear());
                                    }}
                                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left"
                                >
                                    <div className="font-semibold">Current Month</div>
                                    <div className="text-sm opacity-90">{new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</div>
                                </button>
                                <button
                                    onClick={() => {
                                        const next = new Date();
                                        next.setMonth(next.getMonth() + 1);
                                        handleGenerateForMonth(next.getMonth(), next.getFullYear());
                                    }}
                                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left"
                                >
                                    <div className="font-semibold">Next Month</div>
                                    <div className="text-sm opacity-90">{new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</div>
                                </button>
                                <button
                                    onClick={() => {
                                        const prev = new Date();
                                        prev.setMonth(prev.getMonth() - 1);
                                        handleGenerateForMonth(prev.getMonth(), prev.getFullYear());
                                    }}
                                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-left"
                                >
                                    <div className="font-semibold">Previous Month</div>
                                    <div className="text-sm opacity-90">{new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</div>
                                </button>
                            </div>
                            <button
                                onClick={() => setShowMonthModal(false)}
                                className="w-full mt-4 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </div>
                )
            }
            {/* Invoice Modal */}
            {
                showInvoiceModal && selectedInvoice && (
                    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm print:p-0 print:bg-white print:static print:block">
                        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`bg-white rounded-lg shadow-xl w-full max-w-2xl print:shadow-none print:w-full print:max-w-none print:rounded-none ${printFormat === 'thermal' ? 'max-w-[350px] mx-auto print:max-w-[80mm] print:mx-0' : 'p-8'}`}
                            >
                                {/* Print Controls */}
                                <div className="flex justify-between items-center mb-6 print:hidden p-6 pb-0">
                                    <h2 className="text-xl font-bold text-gray-800">Invoice Preview</h2>
                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                        <button
                                            onClick={() => setPrintFormat('a4')}
                                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${printFormat === 'a4' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            A4
                                        </button>
                                        <button
                                            onClick={() => setPrintFormat('thermal')}
                                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${printFormat === 'thermal' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            Thermal (Mini)
                                        </button>
                                    </div>
                                </div>

                                {/* Invoice Content */}
                                <div className={`print:p-0 ${printFormat === 'thermal' ? 'p-6 text-sm' : ''}`}>
                                    {/* Header */}
                                    <div className={`flex ${printFormat === 'thermal' ? 'flex-col text-center' : 'justify-between items-start'} mb-8 border-b border-gray-200 pb-6`}>
                                        <div className={`flex ${printFormat === 'thermal' ? 'flex-col justify-center' : 'items-center gap-4'}`}>
                                            <div>
                                                <h2 className={`${printFormat === 'thermal' ? 'text-xl' : 'text-3xl'} font-bold text-gray-900`}>TAGIHAN</h2>
                                                <p className="text-gray-500">#{selectedInvoice.invoiceNumber || selectedInvoice.id}</p>
                                            </div>
                                        </div>
                                        <div className={`${printFormat === 'thermal' ? 'mt-4 text-center' : 'text-right'}`}>
                                            {invoiceSettings.logoUrl && (
                                                <div className={`flex ${printFormat === 'thermal' ? 'justify-center' : 'justify-end'} mb-3`}>
                                                    <img src={invoiceSettings.logoUrl} alt="Company Logo" className="h-16 object-contain" />
                                                </div>
                                            )}
                                            <h3 className="font-bold text-xl text-gray-800">{invoiceSettings.companyName}</h3>
                                            <p className="text-sm text-gray-500 whitespace-pre-line">{invoiceSettings.companyAddress}</p>
                                            {invoiceSettings.companyContact && <p className="text-sm text-gray-500">{invoiceSettings.companyContact}</p>}
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className={`${printFormat === 'thermal' ? 'space-y-4' : 'grid grid-cols-2 gap-8'} mb-8`}>
                                        <div className={printFormat === 'thermal' ? 'text-center' : ''}>
                                            <p className="text-sm font-medium text-gray-500 mb-1">Tagihan Kepada:</p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {customersData[selectedInvoice.username]?.name || selectedInvoice.username}
                                            </p>
                                            {customersData[selectedInvoice.username]?.address && (
                                                <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{customersData[selectedInvoice.username].address}</p>
                                            )}
                                            {customersData[selectedInvoice.username]?.phone && (
                                                <p className="text-sm text-gray-600 mt-1">{customersData[selectedInvoice.username].phone}</p>
                                            )}

                                        </div>
                                        <div className={printFormat === 'thermal' ? 'text-center' : 'text-right'}>
                                            <p className="text-sm font-medium text-gray-500 mb-1">Tanggal:</p>
                                            <p className="text-gray-900">{formatDate(selectedInvoice.date)}</p>
                                            <p className="text-sm font-medium text-gray-500 mt-2 mb-1">Status:</p>
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${selectedInvoice.status === 'completed' ? 'bg-green-100 text-green-800 print:bg-transparent print:text-black print:border print:border-black' :
                                                selectedInvoice.status === 'postponed' ? 'bg-orange-100 text-orange-800 print:bg-transparent print:text-black print:border print:border-black' :
                                                    selectedInvoice.status === 'merged' ? 'bg-gray-100 text-gray-500 print:bg-transparent print:text-black print:border print:border-black' :
                                                        'bg-red-100 text-red-800 print:bg-transparent print:text-black print:border print:border-black'
                                                }`}>
                                                {selectedInvoice.status === 'completed' ? 'LUNAS' :
                                                    selectedInvoice.status === 'postponed' ? 'DITUNDA' :
                                                        selectedInvoice.status === 'merged' ? 'DIGABUNG' :
                                                            'BELUM BAYAR'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div className={`${printFormat === 'thermal' ? 'border-t border-b border-dashed py-4' : 'bg-gray-50 rounded-lg p-6 print:bg-transparent print:border print:border-gray-200'} mb-8`}>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-gray-600">Deskripsi</span>
                                            <span className="text-gray-600 font-medium">Jumlah</span>
                                        </div>
                                        <div className="flex justify-between items-center py-4 border-t border-gray-200">
                                            <span className="text-gray-900 font-medium">Pembayaran Layanan Internet</span>
                                            <span className="text-gray-900 font-bold">{formatCurrency(selectedInvoice.amount)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                            <span className="text-lg font-bold text-gray-900">Total</span>
                                            <span className="text-lg font-bold text-blue-600 print:text-black">{formatCurrency(selectedInvoice.amount)}</span>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    {invoiceSettings.invoiceFooter && (
                                        <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t border-gray-100">
                                            <p>{invoiceSettings.invoiceFooter}</p>
                                        </div>
                                    )}
                                </div>



                                {/* Actions */}
                                <div className={`flex ${printFormat === 'thermal' ? 'flex-col gap-2 pb-24' : 'flex-col md:flex-row flex-wrap justify-center w-full gap-3'} print:hidden p-6 pt-0`}>

                                    <button
                                        onClick={() => window.print()}
                                        className={`px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 flex items-center justify-center gap-2 ${printFormat !== 'thermal' ? 'w-full md:w-auto' : ''}`}
                                    >
                                        <Printer size={18} /> Cetak Tagihan
                                    </button>
                                    {selectedInvoice.status !== 'completed' && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setFormData({
                                                        ...formData,
                                                        username: selectedInvoice.username,
                                                        amount: selectedInvoice.amount,
                                                        method: 'cash',
                                                        notes: selectedInvoice.notes || ''
                                                    });

                                                    setShowInvoiceModal(false);
                                                    setShowModal(true);
                                                }}
                                                className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 ${printFormat !== 'thermal' ? 'w-full md:w-auto' : ''}`}
                                            >
                                                <DollarSign size={18} /> Bayar Sekarang
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (!confirm('Tunda tagihan ini ke bulan depan?')) return;
                                                    try {
                                                        const res = await fetch(`/api/billing/payments/${selectedInvoice.id}`, {
                                                            method: 'PUT',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ status: 'postponed' }),
                                                        });
                                                        const data = await res.json();
                                                        if (res.ok) {
                                                            alert('Tagihan berhasil ditunda');
                                                            setShowInvoiceModal(false);
                                                            fetchData();
                                                        } else {
                                                            alert('Gagal menunda tagihan: ' + (data.error || 'Unknown error'));
                                                        }
                                                    } catch (error) {
                                                        console.error('Failed to postpone payment', error);
                                                        alert('Error: ' + error.message);
                                                    }
                                                }}
                                                className={`px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2 ${printFormat !== 'thermal' ? 'w-full md:w-auto' : ''}`}
                                            >
                                                <Calendar size={18} /> Tunda Bayar
                                            </button>
                                        </>
                                    )}
                                    {selectedInvoice.status === 'completed' && (
                                        <a
                                            href={getWhatsAppFormattedUrl(selectedInvoice).url || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => {
                                                const res = getWhatsAppFormattedUrl(selectedInvoice);
                                                if (res.error) {
                                                    e.preventDefault();
                                                    alert(res.error);
                                                }
                                            }}
                                            className={`px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 cursor-pointer ${printFormat !== 'thermal' ? 'w-full md:w-auto' : ''}`}
                                        >
                                            <MessageCircle size={18} /> Kirim WhatsApp
                                        </a>
                                    )}
                                    <button
                                        onClick={() => setShowInvoiceModal(false)}
                                        className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 ${printFormat !== 'thermal' ? 'w-full md:w-auto' : ''}`}
                                    >
                                        <X size={18} /> Tutup
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </div >
                )
            }
        </div >
    );
}
