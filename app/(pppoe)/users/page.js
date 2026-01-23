'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Users as UsersIcon, Shield, Globe, User, MapPin, Phone, Building, Search, ArrowUpDown, Server, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Mail, Loader2, Activity, ExternalLink, Power, Wifi, RotateCcw, Smartphone, Database, Info, MoreHorizontal, X } from 'lucide-react';

import { AnimatePresence, motion } from 'framer-motion';
import { useDashboard } from '@/contexts/DashboardContext';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export default function UsersPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // State
    const [users, setUsers] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [activeConnections, setActiveConnections] = useState([]);
    const [acsDevices, setAcsDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState(new Set());

    // Filter State
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'online', 'offline'

    // Form Data
    const [formData, setFormData] = useState({
        name: '',
        password: '',
        profile: '',
        service: 'any',
        comment: '',
        disabled: false,
        'customer-name': '',
        'customer-id': '',
        'agent-name': '',
        'technician-name': '',
        'coordinates': '',
        'phone': '',
        'address': ''
    });

    const { preferences } = useDashboard();

    // Fetch All Data
    const fetchData = async () => {
        try {
            setLoading(true);
            const [
                usersRes,
                profilesRes,
                activeRes,
                acsRes,
                customersRes,
                systemUsersRes,
                settingsRes,
                registrationsRes
            ] = await Promise.all([
                fetch('/api/pppoe/users'),
                fetch('/api/pppoe/profiles'),
                fetch('/api/pppoe/active'),
                fetch('/api/genieacs/devices'),
                fetch('/api/customers'),
                fetch('/api/admin/users'),
                fetch('/api/settings'),
                fetch('/api/registrations')
            ]);

            if (!usersRes.ok || !profilesRes.ok) throw new Error('Failed to fetch initial data');

            const usersData = await usersRes.json();
            const profilesData = await profilesRes.json();
            const activeData = activeRes.ok ? await activeRes.json() : [];
            const acsData = acsRes.ok ? await acsRes.json() : [];
            const customersDataVals = customersRes.ok ? await customersRes.json() : {};
            const systemUsersData = systemUsersRes.ok ? await systemUsersRes.json() : [];
            const settingsData = settingsRes.ok ? await settingsRes.json() : {};
            const registrationsData = registrationsRes.ok ? await registrationsRes.json() : [];

            setUsers(usersData);
            setProfiles(profilesData);
            setActiveConnections(activeData);
            setAcsDevices(acsData);
            setCustomersData(customersDataVals);
            setSystemUsers(systemUsersData);
            setPendingRegistrations(registrationsData);

            if (settingsData.connections) {
                setConnections(settingsData.connections);
                if (settingsData.activeConnectionId) {
                    setSelectedRouterIds([settingsData.activeConnectionId]);
                }
            }

            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Auto-refresh active connections only (every 10s)
    useEffect(() => {
        const interval = setInterval(async () => {
            if (document.hidden) return;
            try {
                const [activeRes, acsRes] = await Promise.all([
                    fetch('/api/pppoe/active'),
                    fetch('/api/genieacs/devices')
                ]);
                if (activeRes.ok) setActiveConnections(await activeRes.json());
                if (acsRes.ok) setAcsDevices(await acsRes.json());
            } catch (e) { console.error("Auto-refresh failed", e); }
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    // Helper to get active connection for a user
    const getActiveConnection = (username) => activeConnections.find(c => c.name === username);

    // Helper to get ACS device for a user
    const getAcsDevice = (username) => acsDevices.find(d => d.pppoe_user === username);
    // State for System Users (Agents/Techs) & Registrations
    const [systemUsers, setSystemUsers] = useState([]);
    const [pendingRegistrations, setPendingRegistrations] = useState([]);

    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [reviewFormData, setReviewFormData] = useState({});

    // Mobile Details Modal State
    const [detailsModal, setDetailsModal] = useState(null);

    const [editingUserId, setEditingUserId] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [customersData, setCustomersData] = useState({});

    const [connections, setConnections] = useState([]);
    const [selectedRouterIds, setSelectedRouterIds] = useState([]);

    // Bulk Actions
    const [showBulkEditModal, setShowBulkEditModal] = useState(false);
    const [bulkEditData, setBulkEditData] = useState({ agentId: '', technicianId: '' });

    // Active Connection Actions State
    const [editingDevice, setEditingDevice] = useState(null);
    const [wifiForm, setWifiForm] = useState({ ssid: '', password: '' });

    const openEditWifi = (device) => {
        setEditingDevice(device);
        setWifiForm({ ssid: device.ssid || '', password: '' });
    };

    // Device Details Modal State
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [showDeviceModal, setShowDeviceModal] = useState(false);

    const openDeviceDetails = (device) => {
        setSelectedDevice(device);
        setShowDeviceModal(true);
    };

    const handleSaveWifi = async (e) => {
        e.preventDefault();
        if (!confirm('This will update the device Wi-Fi settings. The device might reconnect. Continue?')) return;

        try {
            const res = await fetch('/api/genieacs/wifi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId: editingDevice.id,
                    ssid: wifiForm.ssid,
                    password: wifiForm.password
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert('Success: Wi-Fi update task queued.');
                setEditingDevice(null);
                setTimeout(() => fetchData(), 2000);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleDisconnect = async (id, name) => {
        if (!confirm(`Are you sure you want to disconnect user ${name}?`)) return;
        try {
            const res = await fetch(`/api/pppoe/active/${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (res.ok) fetchData();
            else {
                const data = await res.json();
                alert(`Failed to disconnect: ${data.error}`);
            }
        } catch (error) {
            alert('Failed to disconnect user');
        }
    };

    const handleReboot = async (deviceId, serial) => {
        if (!confirm(`Are you sure you want to reboot device ${serial}?`)) return;
        try {
            const res = await fetch('/api/genieacs/reboot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId })
            });
            if (res.ok) alert('Reboot task queued successfully.');
            else alert('Failed to queue reboot.');
        } catch (e) {
            alert('Error: ' + e.message);
        }
    };

    const formatUptime = (uptime) => uptime || '-';


    // Pagination

    const fetchConnections = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.connections) {
                setConnections(data.connections);
                // Default to active connection or all? Let's default to active.
                if (data.activeConnectionId) {
                    setSelectedRouterIds([data.activeConnectionId]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch connections', error);
        }
    };

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                setUserRole(data.user.role);
                setCurrentUserId(data.user.id);
            })
            .catch(err => console.error('Failed to fetch user role', err));
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/pppoe/users');
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProfiles = async () => {
        try {
            const res = await fetch('/api/pppoe/profiles');
            if (res.ok) {
                setProfiles(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch profiles', error);
        }
    };

    const fetchSystemUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                setSystemUsers(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch system users', error);
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



    const fetchPendingRegistrations = async () => {
        try {
            const res = await fetch('/api/registrations');
            if (res.ok) {
                setPendingRegistrations(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch pending registrations', error);
        }
    };

    const handleReview = (reg) => {
        setSelectedRegistration(reg);

        if (reg.type === 'edit') {
            const values = typeof reg.newValues === 'string' ? JSON.parse(reg.newValues) : (reg.newValues || {});
            setReviewFormData({
                username: values.username || '',
                password: values.password || '',
                profile: values.profile || '',
                service: values.service || 'pppoe',
                name: values.name || '',
                address: values.address || '',
                phone: values.phone || '',
                agentId: values.agentId || ''
            });
        } else if (reg.type === 'delete') {
            setReviewFormData({});
        } else {
            // Register (default)
            setReviewFormData({
                username: reg.registrationData?.name || reg.username,
                password: reg.registrationData?.password || '',
                profile: reg.registrationData?.profile || '',
                service: reg.registrationData?.service || 'pppoe',
                name: reg.name || '',
                address: reg.address || '',
                phone: reg.phone || '',
                agentId: reg.agentId || '',
                routerIds: reg.routerIds ? (typeof reg.routerIds === 'string' ? JSON.parse(reg.routerIds) : reg.routerIds) : []
            });
        }
        setShowReviewModal(true);
    };

    const handleRegistrationAction = async (username, action) => {
        if (!confirm(`Are you sure you want to ${action} this registration?`)) return;

        try {
            const body = { username, action };
            if (action === 'approve') {
                body.updatedData = reviewFormData;
            }

            const res = await fetch('/api/registrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                setShowReviewModal(false); // Close modal if open
                fetchPendingRegistrations();
                if (action === 'approve') {
                    fetchUsers();
                    fetchCustomersData();
                }
            } else {
                prompt('Failed to ' + action + ' registration (Copy this error):', data.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Action failed', error);
            prompt('Action failed (Copy this error):', error.message || error);
        }
    };



    const filteredUsers = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();

        return users.filter(user => {
            // Online filter
            // Note: We use getActiveConnection helper but it expects state which isn't in scope of this pure function?
            // Actually it is in scope of the component.
            // But getActiveConnection relies on 'activeConnections' state which needs to be in dependency array.
            // Status filter
            const isActive = activeConnections.some(c => c.name === user.name);
            if (filterStatus === 'online' && !isActive) return false;
            if (filterStatus === 'offline' && isActive) return false;

            const customerName = customersData[user.name]?.name || '';
            const customerId = customersData[user.name]?.customerId || '';

            return user.name.toLowerCase().includes(searchLower) ||
                (user.profile && user.profile.toLowerCase().includes(searchLower)) ||
                (user.service && user.service.toLowerCase().includes(searchLower)) ||
                customerName.toLowerCase().includes(searchLower) ||
                customerId.toLowerCase().includes(searchLower);
        });
    }, [users, searchTerm, customersData, filterStatus, activeConnections]);


    const sortData = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedUsers = useMemo(() => {
        const filtered = filteredUsers;
        if (!sortConfig.key) return filtered;

        const sorted = [...filtered].sort((a, b) => {
            let aVal, bVal;

            switch (sortConfig.key) {
                // ... (rest of sort logic)
                case 'username':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'customer':
                    aVal = getCustomerName(a.name).toLowerCase();
                    bVal = getCustomerName(b.name).toLowerCase();
                    break;
                case 'profile':
                    aVal = (a.profile || '').toLowerCase();
                    bVal = (b.profile || '').toLowerCase();
                    break;
                case 'staff':
                    aVal = getPartnerName(a.name).toLowerCase();
                    bVal = getPartnerName(b.name).toLowerCase();
                    break;
                case 'usage':
                    // Sort by total usage (rx + tx)
                    aVal = (a.usage?.rx || 0) + (a.usage?.tx || 0);
                    bVal = (b.usage?.rx || 0) + (b.usage?.tx || 0);
                    break;
                case 'connection':
                    // Sort by active status/IP
                    const aActive = activeConnections.find(c => c.name === a.name);
                    const bActive = activeConnections.find(c => c.name === b.name);
                    aVal = aActive ? (aActive.address || 'z') : 'z'; // 'z' to put offline at bottom (or top depending on asc/desc)
                    bVal = bActive ? (bActive.address || 'z') : 'z';
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
    }, [filteredUsers, sortConfig, customersData, systemUsers, activeConnections]);

    // Pagination Logic
    const paginatedUsers = useMemo(() => {
        if (rowsPerPage === 'All') return sortedUsers;
        const startIndex = (currentPage - 1) * rowsPerPage;
        return sortedUsers.slice(startIndex, startIndex + rowsPerPage);
    }, [sortedUsers, currentPage, rowsPerPage]);

    // Helpers need to be wrapped or stable if used in useMemo dependencies, 
    // but here we just used them inside useMemo which is fine since they depend on state.
    // However, getCustomerName and getPartnerName depend on current state.
    // If they change, sortedUsers should recalculate. Added to deps.


    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation for new registration or edit
        const missingFields = [];
        if (!formData.name) missingFields.push("Username");
        if (!editMode && !formData.password) missingFields.push("Password");
        if (!formData.profile || formData.profile === '' || formData.profile === 'default') missingFields.push("Profile");
        if (!formData.customerName) missingFields.push("Nama Customer");
        if (!formData.customerAddress) missingFields.push("Alamat");
        if (!formData.agentId) missingFields.push("Agent");
        if (!formData.technicianId) missingFields.push("Teknisi");

        if (missingFields.length > 0) {
            alert(`Mohon lengkapi data wajib berikut:\n- ${missingFields.join('\n- ')}`);
            return;
        }


        // Staff/Editor/Agent/Technician Edit Request
        if (['staff', 'editor', 'agent', 'technician'].includes(userRole) && editMode) {
            try {
                const res = await fetch('/api/registrations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'edit',
                        targetUsername: editingUserId, // This is actually the ID or Name? editingUserId is ID. But backend expects targetUsername.
                        // Wait, editingUserId is set to user['.id'] in handleEdit.
                        // But my backend logic expects targetUsername to be the name for finding the user.
                        // Let's check handleEdit. It sets editingUserId = user['.id'].
                        // I should probably pass the username (name) as targetUsername.
                        // In handleEdit, I have user.name. I should store it or retrieve it.
                        // I can use formData.name as targetUsername since name usually doesn't change, or if it does, the old name is needed.
                        // Actually, if name is changed, I need the OLD name to find the user.
                        // I should store the original username when entering edit mode.
                        targetUsername: formData.originalName || formData.name,
                        newValues: {
                            username: formData.name,
                            password: formData.password,
                            profile: formData.profile,
                            service: formData.service,
                            name: formData.customerName,
                            address: formData.customerAddress,
                            phone: formData.customerPhone,
                            agentId: formData.agentId,
                            technicianId: formData.technicianId
                        },
                        agentId: currentUserId
                    }),
                });

                if (res.ok) {
                    alert('Edit request submitted for approval.');
                    handleCloseModal();
                    fetchPendingRegistrations();
                } else {
                    const data = await res.json();
                    alert('Failed to submit edit request: ' + data.error);
                }
            } catch (error) {
                console.error('Failed to submit edit request', error);
                alert('Error submitting request.');
            }
            return;
        }

        try {
            const url = editMode ? `/api/pppoe/users/${encodeURIComponent(editingUserId)}` : '/api/pppoe/users';
            const method = editMode ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    password: formData.password,
                    profile: formData.profile,
                    service: formData.service,
                    routerIds: selectedRouterIds,
                    // Additional fields for registration approval
                    customerName: formData.customerName,
                    customerAddress: formData.customerAddress,
                    customerPhone: formData.customerPhone,
                    customerEmail: formData.customerEmail,
                    agentId: formData.agentId,
                    technicianId: formData.technicianId
                }),
            });

            if (res.ok) {
                const data = await res.json();

                if (data.message && data.message.includes('approval')) {
                    alert(data.message);
                    handleCloseModal();
                    return; // Stop here for pending registrations
                }

                // Save customer details
                const custRes = await fetch('/api/customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: formData.name,
                        customerId: formData.customerId,
                        name: formData.customerName,
                        address: formData.customerAddress,
                        phone: formData.customerPhone,
                        email: formData.customerEmail,
                        agentId: formData.agentId,
                        technicianId: formData.technicianId,
                        ownerId: formData.ownerId
                    })
                });

                if (!custRes.ok) {
                    const custData = await custRes.json();
                    console.error('Failed to save customer data:', custData);
                    alert('User saved to router, but failed to save database details: ' + (custData.error || 'Unknown error'));
                }

                handleCloseModal();
                fetchUsers();
                fetchCustomersData();
                fetchUsers();
                fetchCustomersData();
            } else {
                const data = await res.json();
                alert('Failed to save user: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to save user', error);
            alert('An error occurred while saving the user.');
        }
    };

    const handleEdit = async (user) => {
        setEditMode(true);
        setEditingUserId(user['.id']);
        // Store original name for edit request
        setFormData(prev => ({ ...prev, originalName: user.name }));

        // Fetch customer details
        try {
            const res = await fetch(`/api/customers/${encodeURIComponent(user.name)}`);
            const customerData = await res.json();

            setFormData({
                originalName: user.name, // Store original name
                name: user.name,
                password: '',
                profile: user.profile || 'default',
                service: user.service || 'pppoe',
                customerId: customerData.customerId || '',
                customerName: customerData.name || '',
                customerAddress: customerData.address || '',
                customerPhone: customerData.phone || '',
                customerEmail: customerData.email || '',
                agentId: customerData.agentId || '',
                technicianId: customerData.technicianId || '',
                ownerId: customerData.ownerId || ''
            });
        } catch (error) {
            setFormData({
                originalName: user.name,
                name: user.name,
                password: '',
                profile: user.profile || 'default',
                service: user.service || 'pppoe',
                customerId: '',
                customerName: '',
                customerAddress: '',
                customerPhone: '',
                customerEmail: '',
                agentId: '',
                technicianId: '',
                ownerId: ''
            });
        }

        setShowModal(true);
    };

    const handleDelete = async (user) => {
        if (!confirm(`Are you sure you want to delete user ${user.name}?`)) return;

        // Staff/Editor/Agent/Technician Delete Request
        if (['staff', 'editor', 'agent', 'technician'].includes(userRole)) {
            try {
                const res = await fetch('/api/registrations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'delete',
                        targetUsername: user.name,
                        agentId: currentUserId
                    }),
                });

                if (res.ok) {
                    alert('Delete request submitted for approval.');
                    fetchPendingRegistrations();
                } else {
                    const data = await res.json();
                    alert('Failed to submit delete request: ' + data.error);
                }
            } catch (error) {
                console.error('Failed to submit delete request', error);
                alert('Error submitting request.');
            }
            return;
        }

        try {
            // Delete from Mikrotik
            const encodedId = encodeURIComponent(user['.id']);
            const res = await fetch(`/api/pppoe/users/${encodedId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                // Delete customer data
                try {
                    await fetch(`/api/customers/${user.name}`, {
                        method: 'DELETE'
                    });
                } catch (err) {
                    console.error('Failed to delete customer data', err);
                }

                fetchUsers();
                fetchCustomersData();
            } else {
                const data = await res.json();
                alert(`Failed to delete user: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to delete user', error);
            alert('Failed to delete user. See console for details.');
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditMode(false);
        setEditingUserId(null);
        setFormData({
            name: '',
            password: '',
            profile: 'default',
            service: '',
            customerId: '',
            customerName: '',
            customerAddress: '',
            customerPhone: '',
            agentId: '',
            technicianId: '',
            ownerId: ''
        });
    };

    const getCustomerName = (username) => {
        return customersData[username]?.name || username;
    };

    const getPartnerName = (username) => {
        const customer = customersData[username];
        if (!customer) return '-';

        const agentId = customer.agentId;
        const technicianId = customer.technicianId;
        const parts = [];

        if (agentId) {
            const agent = systemUsers.find(u => u.id === agentId);
            if (agent) parts.push(`Agent: ${agent.fullName || agent.username}`);
        }
        if (technicianId) {
            const tech = systemUsers.find(u => u.id === technicianId);
            if (tech) parts.push(`Tech: ${tech.fullName || tech.username}`);
        }

        return parts.length > 0 ? parts.join(', ') : '-';
    };



    const handleSelectAll = (e) => {
        if (e.target.checked) {
            // Select all visible (filtered) users, not just paginated, or maybe just page?
            // Usually 'Select All' implies all filtered items.
            const allUsernames = sortedUsers.map(u => u.name);
            setSelectedUsers(new Set(allUsernames));
        } else {
            setSelectedUsers(new Set());
        }
    };

    const handleSelectUser = (username) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(username)) {
            newSelected.delete(username);
        } else {
            newSelected.add(username);
        }
        setSelectedUsers(newSelected);
    };

    const handleBulkEditSubmit = async (e) => {
        e.preventDefault();
        if (!confirm(`Update Staff for ${selectedUsers.size} users?`)) return;

        setLoading(true);
        try {
            const res = await fetch('/api/customers/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usernames: Array.from(selectedUsers),
                    agentId: bulkEditData.agentId || undefined,
                    technicianId: bulkEditData.technicianId || undefined
                })
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                setShowBulkEditModal(false);
                setBulkEditData({ agentId: '', technicianId: '' });
                setSelectedUsers(new Set());
                fetchCustomersData();
            } else {
                // Use prompt to allow copying the error
                prompt('Failed to bulk update (Copy this error):', data.error);
            }
        } catch (error) {
            console.error('Bulk update error:', error);
            prompt('Error performing bulk update (Copy this error):', error.message || error);
        } finally {
            setLoading(false);
        }
    };


    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">PPPoE Users</h1>
                <div className="flex flex-col gap-2 md:flex-row md:gap-2">
                    {selectedUsers.size > 0 && !['staff', 'editor', 'agent', 'technician'].includes(userRole) && (
                        <button
                            onClick={() => setShowBulkEditModal(true)}
                            className="w-full md:w-auto bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors shadow-lg animate-pulse"
                        >
                            <UsersIcon size={20} /> Bulk Edit ({selectedUsers.size})
                        </button>
                    )}

                    <button
                        onClick={() => setShowModal(true)}
                        className="w-full md:w-auto bg-accent text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                    >
                        <Plus size={20} /> Register User
                    </button>
                </div>
            </div>

            {/* Pending Registrations (Admin & Staff) */}
            {((userRole === 'admin' || userRole === 'editor' || userRole === 'staff') && pendingRegistrations.length > 0) && (
                <div className="bg-yellow-50/30 dark:bg-yellow-900/30 backdrop-blur-xl border border-yellow-200/50 dark:border-yellow-800/50 rounded-lg p-4 md:p-6 shadow-lg">
                    <h2 className="text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-4 flex items-center gap-2">
                        <Clock className="text-yellow-600 dark:text-yellow-400" /> Pending Registrations
                    </h2>
                    <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agent</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Plan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                    {userRole === 'admin' && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {pendingRegistrations
                                    .filter(reg => userRole === 'admin' || userRole === 'editor' || (userRole === 'staff' && reg.agentId === currentUserId))
                                    .map((reg) => (
                                        <tr key={reg.username}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{reg.targetUsername || reg.username}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${reg.type === 'delete' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' :
                                                    reg.type === 'edit' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                                                        'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                                    }`}>
                                                    {reg.type === 'edit' ? 'Edit' : reg.type === 'delete' ? 'Delete' : 'Register'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{reg.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {(() => {
                                                    const agent = systemUsers.find(u => u.id === reg.agentId);
                                                    return agent ? (agent.fullName || agent.username) : '-';
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {reg.registrationData?.profile} / {reg.registrationData?.service}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                                                Pending Review
                                            </td>
                                            {(userRole === 'admin' || userRole === 'editor') && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                    <button
                                                        onClick={() => handleReview(reg)}
                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center gap-1"
                                                    >
                                                        <Edit2 size={18} /> Review
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="space-y-6">

                {/* Stats Cards */}
                {/* Stats Widget (Unified) */}
                <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl border border-white/20 dark:border-white/5 overflow-hidden">
                    <div className="grid grid-cols-3 divide-x divide-gray-200/50 dark:divide-gray-700/50">
                        {/* Total */}
                        <div className="p-4 flex flex-col items-center justify-center text-center">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-2">
                                <UsersIcon size={20} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <p className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{users.length}</p>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</p>
                        </div>

                        {/* Online */}
                        <div className="p-4 flex flex-col items-center justify-center text-center">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full mb-2">
                                <Wifi size={20} className="text-green-600 dark:text-green-400" />
                            </div>
                            <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{activeConnections.length}</p>
                            <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">Online</p>
                        </div>

                        {/* Offline */}
                        <div className="p-4 flex flex-col items-center justify-center text-center">
                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full mb-2">
                                <Power size={20} className="text-gray-500 dark:text-gray-400" />
                            </div>
                            <p className="text-xl md:text-2xl font-bold text-gray-600 dark:text-gray-300">{users.length - activeConnections.length}</p>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Offline</p>
                        </div>
                    </div>
                </div>

                {/* Search Bar & Filters */}
                <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-4 border border-white/20 dark:border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:flex-1">
                        <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by username, IP, profile, service, or customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:placeholder-gray-400"
                        />
                    </div>
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${filterStatus === 'all'
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            <UsersIcon size={16} />
                            All
                        </button>
                        <button
                            onClick={() => setFilterStatus('online')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${filterStatus === 'online'
                                ? 'bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400'
                                }`}
                        >
                            <Wifi size={16} />
                            Online
                        </button>
                        <button
                            onClick={() => setFilterStatus('offline')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${filterStatus === 'offline'
                                ? 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            <Power size={16} />
                            Offline
                        </button>
                    </div>
                </div>

                {/* Unified Table */}
                <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl overflow-hidden border border-white/20 dark:border-white/5">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-black/5 dark:bg-white/5">
                                <tr>
                                    <th className="px-6 py-3 text-left w-10 relative">
                                        <div className="hidden sm:block">
                                            <input
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={selectedUsers.size > 0 && selectedUsers.size === sortedUsers.length}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="sm:hidden text-gray-500 text-xs uppercase tracking-wider font-medium">
                                            More
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => sortData('username')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            User (Name/IP) <ArrowUpDown size={14} className="text-gray-400" />
                                        </div>
                                    </th>
                                    <th
                                        className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                                    >
                                        Device
                                    </th>
                                    <th
                                        onClick={() => sortData('profile')}
                                        className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            Plan <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => sortData('staff')}
                                        className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            Staff <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                                    >
                                        Session
                                    </th>
                                    <th
                                        onClick={() => sortData('usage')}
                                        className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            Usage <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-transparent divide-y divide-gray-200/50 dark:divide-white/10">
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Loading...</td>
                                    </tr>
                                ) : sortedUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No users found</td>
                                    </tr>
                                ) : (
                                    paginatedUsers.map((user) => {
                                        const active = getActiveConnection(user.name);
                                        const acs = getAcsDevice(user.name);
                                        const isOnline = !!active;

                                        return (
                                            <tr key={user['.id']} className={`transition-colors ${isOnline ? 'bg-green-50/50 dark:bg-green-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                                <td className="px-6 py-4 whitespace-nowrap relative">
                                                    {/* Desktop: Checkbox */}
                                                    <div className="hidden sm:block">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUsers.has(user.name)}
                                                            onChange={() => handleSelectUser(user.name)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                    </div>

                                                    {/* Mobile: More Menu Button */}
                                                    <div className="sm:hidden relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDetailsModal({ ...user, acs, active });
                                                            }}
                                                            className="p-1.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                                                        >
                                                            <MoreHorizontal size={18} />
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Unified User Column */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} title={isOnline ? 'Online' : 'Offline'} />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1">
                                                                {user.name}
                                                            </span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">{getCustomerName(user.name)}</span>
                                                            {isOnline && (
                                                                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1 rounded mt-0.5 w-fit">
                                                                    {active.address}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Device Column (ACS) */}
                                                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                                                    {acs ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                                                <Smartphone size={12} className="text-gray-400" /> {acs.ssid || '-'}
                                                            </span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`text-[10px] px-1 rounded ${(acs.rx_power >= -20) ? 'bg-green-100 text-green-800' :
                                                                    (acs.rx_power >= -25) ? 'bg-blue-100 text-blue-800' :
                                                                        'bg-red-100 text-red-800'
                                                                    }`}>
                                                                    {acs.rx_power ? `${acs.rx_power}dBm` : '-'}
                                                                </span>
                                                                {acs.temp && <span className="text-[10px] text-gray-500">{acs.temp}°C</span>}
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 font-mono mt-0.5" title="Serial Number">SN: {acs.serial}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </td>

                                                {/* Plan Column */}
                                                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-medium border border-blue-100 dark:border-blue-800/50 w-fit">
                                                            {user.profile || '-'}
                                                        </span>
                                                        {user.service && user.service !== 'pppoe' && (
                                                            <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider pl-1">{user.service}</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Staff Column */}
                                                <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    <div className="flex flex-col text-xs space-y-0.5">
                                                        {(() => {
                                                            const parts = getPartnerName(user.name).split(', ');
                                                            if (getPartnerName(user.name) === '-') return <span className="text-gray-400">-</span>;
                                                            return parts.map((part, i) => (
                                                                <span key={i} className="block">{part}</span>
                                                            ));
                                                        })()}
                                                    </div>
                                                </td>

                                                {/* Session Column */}
                                                <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                                                    {isOnline ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                                                                <Clock size={12} /> {formatUptime(active.uptime)}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 font-mono mt-0.5">{active['caller-id']}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </td>

                                                {/* Usage Column */}
                                                <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="font-bold text-gray-800 dark:text-white text-sm">
                                                            {formatBytes((user.usage?.rx || 0) + (user.usage?.tx || 0))}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs">
                                                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium" title="Upload">
                                                                <ArrowUpDown size={10} className="rotate-180" /> {formatBytes(user.usage?.tx || 0)}
                                                            </span>
                                                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium" title="Download">
                                                                <ArrowUpDown size={10} /> {formatBytes(user.usage?.rx || 0)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Actions Column */}
                                                <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center gap-1">
                                                        {isOnline && (
                                                            <>
                                                                <a
                                                                    href={`http://${active.address}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    title="Manage Device (WebFig)"
                                                                    className="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded transition-colors inline-block"
                                                                >
                                                                    <ExternalLink size={18} />
                                                                </a>
                                                                <button
                                                                    onClick={() => handleDisconnect(active['.id'], user.name)}
                                                                    title="Disconnect User"
                                                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                                >
                                                                    <Power size={18} />
                                                                </button>
                                                                {acs && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => openDeviceDetails(acs)}
                                                                            title="Device Details"
                                                                            className="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded transition-colors"
                                                                        >
                                                                            <Info size={18} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => openEditWifi(acs)}
                                                                            title="Edit Wi-Fi"
                                                                            className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                                        >
                                                                            <Wifi size={18} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleReboot(acs.id, acs.serial)}
                                                                            title="Reboot Device"
                                                                            className="p-1 text-orange-500 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                                                                        >
                                                                            <RotateCcw size={18} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => handleEdit(user)}
                                                            title="Edit User"
                                                            className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(user)}
                                                            title="Delete User"
                                                            className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 gap-4">
                        <div className="flex items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
                            <div>
                                Showing <span className="font-medium mx-1">
                                    {users.length === 0 ? 0 : (currentPage - 1) * (rowsPerPage === 'All' ? filteredUsers.length : rowsPerPage) + 1}
                                </span>
                                to
                                <span className="font-medium mx-1">
                                    {rowsPerPage === 'All' ? filteredUsers.length : Math.min(currentPage * rowsPerPage, filteredUsers.length)}
                                </span>
                                of
                                <span className="font-medium mx-1">{filteredUsers.length}</span> results
                            </div>
                            {rowsPerPage !== 'All' && (
                                <button
                                    onClick={() => setRowsPerPage('All')}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium underline"
                                >
                                    Show All
                                </button>
                            )}
                            {rowsPerPage === 'All' && (
                                <button
                                    onClick={() => setRowsPerPage(25)}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium underline"
                                >
                                    Pagination
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Rows per page:</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setRowsPerPage(val === 'All' ? 'All' : Number(val));
                                    setCurrentPage(1);
                                }}
                                className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value="All">All</option>
                            </select>

                            <div className="flex gap-1 ml-4">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1 || rowsPerPage === 'All'}
                                    className="px-3 py-1 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredUsers.length / (rowsPerPage === 'All' ? filteredUsers.length : rowsPerPage)), p + 1))}
                                    disabled={rowsPerPage === 'All' || currentPage >= Math.ceil(filteredUsers.length / rowsPerPage)}
                                    className="px-3 py-1 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add/Edit User Modal */}
            {/* Note: Modals are effectively outside the Tabs.Root logical restriction now, but we kept structure consistent */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-lg shadow-2xl p-6 pb-24 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20 dark:border-white/10"
                        >
                            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
                                {editMode ? 'Edit User' : 'Register New User'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* PPPoE Details */}
                                <div className="border-b pb-4">
                                    <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
                                        <Shield size={20} /> PPPoE Credentials
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                disabled={editMode}
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password <span className="text-red-500">*</span></label>
                                            <input
                                                type="password"
                                                required={!editMode}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                                placeholder={editMode ? "Leave blank to keep current" : ""}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profile <span className="text-red-500">*</span></label>
                                            <select
                                                required
                                                value={formData.profile}
                                                onChange={(e) => setFormData({ ...formData, profile: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            >
                                                <option value="" disabled>-- Select Profile --</option>
                                                <option value="default">Default</option>
                                                {profiles.map(profile => (
                                                    <option key={profile['.id']} value={profile.name}>{profile.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service</label>
                                            <select
                                                value={formData.service}
                                                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            >
                                                <option value="any">any</option>
                                                <option value="pppoe">pppoe</option>
                                                <option value="pptp">pptp</option>
                                                <option value="l2tp">l2tp</option>
                                                <option value="ovpn">ovpn</option>
                                                <option value="sstp">sstp</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>



                                {/* Router Selection */}
                                {!editMode && (
                                    <div className="border-b pb-4">
                                        <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
                                            <Server size={20} /> Target Routers
                                        </h3>
                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-500 mb-2">Select which routers to add this user to:</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {connections.map(conn => (
                                                    <label key={conn.id} className="flex items-center space-x-2 p-2 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedRouterIds.includes(conn.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedRouterIds([...selectedRouterIds, conn.id]);
                                                                } else {
                                                                    setSelectedRouterIds(selectedRouterIds.filter(id => id !== conn.id));
                                                                }
                                                            }}
                                                            className="rounded text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <div>
                                                            <div className="font-medium text-sm text-gray-800 dark:text-white">{conn.name}</div>
                                                            <div className="text-xs text-gray-500">{conn.host}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Customer Details */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
                                        <User size={20} /> Customer Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                                <Building size={16} /> Customer Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.customerName}
                                                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                                placeholder="Real name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                                <User size={16} /> Customer ID
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.customerId}
                                                readOnly
                                                disabled
                                                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                                placeholder="Auto-generated"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                                <Phone size={16} /> Phone Number
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.customerPhone}
                                                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                                placeholder="08xx..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                                <Mail size={16} /> Email Address
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.customerEmail}
                                                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                                placeholder="email@example.com"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                                <MapPin size={16} /> Address <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                required
                                                value={formData.customerAddress}
                                                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                                rows="2"
                                                placeholder="Full address"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Agent and Technician Selection - Restricted to Admin/Manager */}
                                {['superadmin', 'admin', 'manager'].includes(userRole) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Agent <span className="text-red-500">*</span></label>
                                            <select
                                                required
                                                value={formData.agentId}
                                                onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">-- Select Agent --</option>
                                                {systemUsers.filter(u => u.isAgent).map(user => (
                                                    <option key={user.id} value={user.id}>{user.username}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Technician <span className="text-red-500">*</span></label>
                                            <select
                                                required
                                                value={formData.technicianId}
                                                onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">-- Select Technician --</option>
                                                {systemUsers.filter(u => u.isTechnician).map(user => (
                                                    <option key={user.id} value={user.id}>{user.username}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-all"
                                    >
                                        {editMode ? 'Update User' : 'Create User'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bulk Edit Modal */}
            <AnimatePresence>
                {showBulkEditModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <UsersIcon className="text-purple-500" />
                                    Bulk Edit Staff
                                </h3>
                            </div>

                            <form onSubmit={handleBulkEditSubmit} className="p-6">
                                <div className="space-y-4">
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
                                        You are updating <strong>{selectedUsers.size}</strong> users.
                                        Select the staff members you want to assign. Leave blank to keep existing.
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Agent</label>
                                        <select
                                            value={bulkEditData.agentId}
                                            onChange={(e) => setBulkEditData({ ...bulkEditData, agentId: e.target.value })}
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                                        >
                                            <option value="">-- No Change --</option>
                                            {systemUsers.filter(u => u.isAgent).map(user => (
                                                <option key={user.id} value={user.id}>{user.username}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Technician</label>
                                        <select
                                            value={bulkEditData.technicianId}
                                            onChange={(e) => setBulkEditData({ ...bulkEditData, technicianId: e.target.value })}
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                                        >
                                            <option value="">-- No Change --</option>
                                            {systemUsers.filter(u => u.isTechnician).map(user => (
                                                <option key={user.id} value={user.id}>{user.username}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => setShowBulkEditModal(false)}
                                            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/30"
                                        >
                                            Update Staff
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>



            {/* Review Modal */}
            <AnimatePresence>
                {showReviewModal && selectedRegistration && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/20 dark:border-white/10"
                        >
                            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                                <Shield size={24} className="text-blue-600" />
                                {selectedRegistration.type === 'delete' ? 'Review Delete Request' :
                                    selectedRegistration.type === 'edit' ? 'Review Edit Request' :
                                        'Review Registration'}
                            </h2>

                            {selectedRegistration.type === 'delete' ? (
                                <div className="space-y-6">
                                    <div className="bg-red-50/30 dark:bg-red-900/30 backdrop-blur-xl border border-red-200/50 dark:border-red-800/50 rounded-lg p-6 shadow-lg">
                                        <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                                            <AlertTriangle className="text-red-600 dark:text-red-400" /> Warning: Delete User
                                        </h3>
                                        <p className="text-red-700 dark:text-red-300 text-lg mb-4">
                                            Are you sure you want to approve the deletion of user <strong>{selectedRegistration.targetUsername}</strong>?
                                        </p>
                                        <p className="text-red-600 dark:text-red-400 text-sm">
                                            This action cannot be undone. The user will be removed from Mikrotik and all customer data will be deleted.
                                        </p>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                        <button
                                            onClick={() => setShowReviewModal(false)}
                                            className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleRegistrationAction(selectedRegistration.username, 'reject')}
                                            className="px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <XCircle size={18} /> Reject
                                        </button>
                                        <button
                                            onClick={() => handleRegistrationAction(selectedRegistration.username, 'approve')}
                                            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <CheckCircle size={18} /> Approve Delete
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* PPPoE Details */}
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">PPPoE Account</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-gray-400">Username</label>
                                                <input
                                                    type="text"
                                                    value={reviewFormData.username}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, username: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-gray-400">Password</label>
                                                <input
                                                    type="text"
                                                    value={reviewFormData.password}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, password: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-gray-400">Profile</label>
                                                <select
                                                    value={reviewFormData.profile}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, profile: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                                                >
                                                    <option value="">-- Select Profile --</option>
                                                    {profiles.map(p => (
                                                        <option key={p.name} value={p.name}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-gray-400">Service</label>
                                                <select
                                                    value={reviewFormData.service}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, service: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                                                >
                                                    <option value="pppoe">pppoe</option>
                                                    <option value="hotspot">hotspot</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-2 mt-2 pt-2 border-t dark:border-gray-600">
                                                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Target Routers</label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                                    {connections.map(conn => (
                                                        <label key={conn.id} className="flex items-center space-x-2 p-2 border dark:border-gray-600 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                                                            <input
                                                                type="checkbox"
                                                                checked={(reviewFormData.routerIds || []).includes(conn.id)}
                                                                onChange={(e) => {
                                                                    const current = reviewFormData.routerIds || [];
                                                                    const newIds = e.target.checked
                                                                        ? [...current, conn.id]
                                                                        : current.filter(id => id !== conn.id);
                                                                    setReviewFormData({ ...reviewFormData, routerIds: newIds });
                                                                }}
                                                                className="rounded text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <div>
                                                                <div className="text-xs font-bold text-gray-700 dark:text-gray-300">{conn.name}</div>
                                                                <div className="text-[10px] text-gray-500">{conn.host}</div>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Customer Details */}
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Customer Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-gray-400">Name</label>
                                                <input
                                                    type="text"
                                                    value={reviewFormData.name}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, name: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-gray-400">Phone</label>
                                                <input
                                                    type="text"
                                                    value={reviewFormData.phone}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, phone: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs text-gray-500 dark:text-gray-400">Address</label>
                                                <input
                                                    type="text"
                                                    value={reviewFormData.address}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, address: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Agent Info */}
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Registration Info</h3>
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 mr-4">
                                                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Registered By (Agent)</label>
                                                <select
                                                    value={reviewFormData.agentId}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, agentId: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                                                >
                                                    <option value="">-- No Agent --</option>
                                                    {systemUsers.filter(u => u.isAgent).map(user => (
                                                        <option key={user.id} value={user.id}>{user.username}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Date: {new Date().toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                        <button
                                            onClick={() => setShowReviewModal(false)}
                                            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleRegistrationAction(selectedRegistration.username, 'reject')}
                                            className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <XCircle size={18} /> Reject
                                        </button>
                                        <button
                                            onClick={() => handleRegistrationAction(selectedRegistration.username, 'approve')}
                                            className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <CheckCircle size={18} /> Approve
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Bulk Edit Modal */}
            <AnimatePresence>
                {showBulkEditModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <UsersIcon className="text-purple-500" />
                                    Bulk Edit Staff
                                </h3>
                                <button onClick={() => setShowBulkEditModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleBulkEditSubmit} className="p-6 space-y-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200 mb-4">
                                    Assigning staff for <strong>{selectedUsers.size}</strong> selected users. Leave a field empty to keep it unchanged.
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Agent</label>
                                    <select
                                        value={bulkEditData.agentId}
                                        onChange={(e) => setBulkEditData({ ...bulkEditData, agentId: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">-- No Change --</option>
                                        {systemUsers.filter(u => u.isAgent).map(u => (
                                            <option key={u.id} value={u.id}>{u.fullName || u.username}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Technician</label>
                                    <select
                                        value={bulkEditData.technicianId}
                                        onChange={(e) => setBulkEditData({ ...bulkEditData, technicianId: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">-- No Change --</option>
                                        {systemUsers.filter(u => u.isTechnician).map(u => (
                                            <option key={u.id} value={u.id}>{u.fullName || u.username}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowBulkEditModal(false)}
                                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : 'Update Users'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Edit Wi-Fi Modal */}
            <AnimatePresence>
                {editingDevice && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 dark:border-gray-700"
                        >
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Wifi className="text-blue-500" /> Edit Wi-Fi Settings
                            </h3>
                            <form onSubmit={handleSaveWifi} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SSID (Network Name)</label>
                                    <input
                                        type="text"
                                        required
                                        value={wifiForm.ssid}
                                        onChange={(e) => setWifiForm({ ...wifiForm, ssid: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                    <input
                                        type="text"
                                        value={wifiForm.password}
                                        onChange={(e) => setWifiForm({ ...wifiForm, password: e.target.value })}
                                        placeholder="Leave blank to keep current"
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Leave blank to keep existing password.</p>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingDevice(null)}
                                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Device Details Modal */}
            <AnimatePresence>
                {showDeviceModal && selectedDevice && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 dark:border-gray-700"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Smartphone className="text-teal-500" /> Device Details
                                </h3>
                                <button
                                    onClick={() => setShowDeviceModal(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Model & Manufacturer</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedDevice.manufacturer} - {selectedDevice.model}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Serial Number (SN)</p>
                                        <p className="text-sm font-mono text-gray-900 dark:text-white bg-white dark:bg-gray-800 px-2 py-1 rounded border dark:border-gray-600 inline-block mt-1">
                                            {selectedDevice.serial}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold mb-1">SSID</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate" title={selectedDevice.ssid}>
                                            {selectedDevice.ssid || '-'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                        <p className="text-xs text-green-600 dark:text-green-400 uppercase font-semibold mb-1">Signal (Rx)</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                            {selectedDevice.rx_power ? `${selectedDevice.rx_power}dBm` : '-'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                        <p className="text-xs text-orange-600 dark:text-orange-400 uppercase font-semibold mb-1">Temperature</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                            {selectedDevice.temp ? `${selectedDevice.temp}°C` : '-'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                        <p className="text-xs text-purple-600 dark:text-purple-400 uppercase font-semibold mb-1">IP Address</p>
                                        <p className="text-sm font-mono font-bold text-gray-900 dark:text-white truncate">
                                            {selectedDevice.ip || '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-xs text-gray-400 text-center pt-2">
                                    Last Inform: {selectedDevice.lastInform ? new Date(selectedDevice.lastInform).toLocaleString() : '-'}
                                </div>
                            </div>

                            <div className="mt-6">
                                <button
                                    onClick={() => setShowDeviceModal(false)}
                                    className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Mobile Details Modal */}
            <AnimatePresence>
                {detailsModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{detailsModal.name}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                        {detailsModal.active?.address || 'Offline'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setDetailsModal(null)}
                                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Body Scroller */}
                            <div className="p-5 overflow-y-auto space-y-4">
                                {/* Connection Stats */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                        <span className="text-xs text-blue-600 dark:text-blue-400 block mb-1">Download</span>
                                        <span className="font-bold text-gray-800 dark:text-white">
                                            {formatBytes(detailsModal.usage?.rx || 0)}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                        <span className="text-xs text-green-600 dark:text-green-400 block mb-1">Upload</span>
                                        <span className="font-bold text-gray-800 dark:text-white">
                                            {formatBytes(detailsModal.usage?.tx || 0)}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-sm text-gray-500">Profile</span>
                                        <span className="text-sm font-medium dark:text-gray-200">{detailsModal.profile}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-sm text-gray-500">Uptime</span>
                                        <span className="text-sm font-medium dark:text-gray-200">
                                            {detailsModal.active ? formatUptime(detailsModal.active.uptime) : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-sm text-gray-500">Caller ID</span>
                                        <span className="text-sm font-medium dark:text-gray-200">
                                            {detailsModal.active ? detailsModal.active['caller-id'] : '-'}
                                        </span>
                                    </div>

                                    {/* ACS Details Section */}
                                    {detailsModal.acs ? (
                                        <div className="pt-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Device Info</span>
                                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">SSID</span>
                                                    <span className="font-medium dark:text-gray-200">{detailsModal.acs.ssid || '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Signal</span>
                                                    <span className={`font-bold ${parseFloat(detailsModal.acs.rx_power) < -25 ? 'text-red-500' : 'text-green-500'}`}>
                                                        {detailsModal.acs.rx_power} dBm
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Temp</span>
                                                    <span className="font-medium dark:text-gray-200">{detailsModal.acs.temp}°C</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">S/N</span>
                                                    <span className="font-mono text-xs dark:text-gray-200">{detailsModal.acs.serial}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg text-center text-sm text-gray-500 italic">
                                            No GenieACS device linked.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        const user = detailsModal;
                                        setDetailsModal(null);
                                        handleEdit(user);
                                    }}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl font-medium hover:bg-blue-200 transition-colors"
                                >
                                    <Edit2 size={18} /> Edit
                                </button>

                                {detailsModal.active?.address && (
                                    <a
                                        href={`http://${detailsModal.active.address}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-teal-100 text-teal-700 rounded-xl font-medium hover:bg-teal-200 transition-colors"
                                    >
                                        <ExternalLink size={18} /> Manage
                                    </a>
                                )}

                                {detailsModal.active ? (
                                    <button
                                        onClick={() => {
                                            const id = detailsModal.active['.id'];
                                            const name = detailsModal.name;
                                            setDetailsModal(null);
                                            handleDisconnect(id, name);
                                        }}
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors"
                                    >
                                        <Power size={18} /> Disconnect
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            const user = detailsModal;
                                            setDetailsModal(null);
                                            handleDelete(user);
                                        }}
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors"
                                    >
                                        <Trash2 size={18} /> Delete
                                    </button>
                                )}

                                {detailsModal.acs && (
                                    <>
                                        <button
                                            onClick={() => {
                                                const acs = detailsModal.acs;
                                                setDetailsModal(null);
                                                openEditWifi(acs);
                                            }}
                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-100 text-indigo-700 rounded-xl font-medium hover:bg-indigo-200 transition-colors"
                                        >
                                            <Wifi size={18} /> WiFi
                                        </button>
                                        <button
                                            onClick={() => {
                                                const acs = detailsModal.acs;
                                                setDetailsModal(null);
                                                handleReboot(acs.id, acs.serial);
                                            }}
                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-100 text-orange-700 rounded-xl font-medium hover:bg-orange-200 transition-colors"
                                        >
                                            <RotateCcw size={18} /> Reboot
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
