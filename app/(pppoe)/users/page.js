'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Edit2, Trash2, Users as UsersIcon, Shield, Globe, User, MapPin, Phone, Building, Search, ArrowUpDown, Server, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Mail, Loader2, Activity, ExternalLink, Power, Wifi, RotateCcw, Smartphone, Database, Info, MoreHorizontal, X, ChevronDown } from 'lucide-react';

import { AnimatePresence, motion } from 'framer-motion';
import { useDashboard } from '@/contexts/DashboardContext';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

import { useLanguage } from '@/contexts/LanguageContext';

export default function UsersPage() {
    const { t } = useLanguage();
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
    const [rowsPerPage, setRowsPerPage] = useState(100);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showReviewProfileDropdown, setShowReviewProfileDropdown] = useState(false);
    const profileDropdownRef = useRef(null);
    const reviewProfileDropdownRef = useRef(null);

    // Filter State
    const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'all'); // 'all', 'online', 'offline'

    useEffect(() => {
        const status = searchParams.get('status');
        if (status && ['all', 'online', 'offline'].includes(status)) {
            setFilterStatus(status);
        }
    }, [searchParams]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setShowProfileDropdown(false);
            }
            if (reviewProfileDropdownRef.current && !reviewProfileDropdownRef.current.contains(event.target)) {
                setShowReviewProfileDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Form Data
    const [formData, setFormData] = useState({
        name: '',
        password: '',
        profile: '',
        service: 'pppoe',
        comment: '',
        disabled: false,
        customerId: '',
        customerName: '',
        customerAddress: '',
        customerPhone: '',
        customerEmail: '',
        agentId: '',
        technicianId: '',
        coordinates: '',
        ownerId: ''
    });

    const formatCurrency = (amount) => {
        if (!amount) return 'Rp 0';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

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
                fetch('/api/customers?lite=true'),
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
            setProfiles((profilesData || []).filter(p => p.name !== 'default' && p.name !== 'billing.default'));
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

    useEffect(() => {
        if (showModal && !editMode && connections.length > 0) {
            fetchRouterIdentities(connections);
        }
    }, [showModal, editMode]);

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
    const [routerIdentities, setRouterIdentities] = useState({}); // { [connectionId]: 'identity name' }

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
        if (!confirm(t('messages.confirmWifiUpdate'))) return;

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
        if (!confirm(t('messages.confirmDisconnect') + ' ' + name + '?')) return;
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
        if (!confirm(t('messages.confirmReboot') + ' ' + serial + '?')) return;
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

    const fetchRouterIdentities = async (conns) => {
        if (!conns || conns.length === 0) return;
        const results = {};
        await Promise.all(conns.map(async (conn) => {
            try {
                const res = await fetch(`/api/routers/status?id=${conn.id}`);
                if (res.ok) {
                    const data = await res.json();
                    results[conn.id] = data.identity || conn.name;
                } else {
                    results[conn.id] = null; // offline
                }
            } catch {
                results[conn.id] = null;
            }
        }));
        setRouterIdentities(results);
    };

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
                const data = await res.json();
                setProfiles((data || []).filter(p => p.name !== 'default' && p.name !== 'billing.default'));
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
            const res = await fetch('/api/customers?lite=true');
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
                username: reg.username,
                password: reg.password || '',
                profile: reg.profile || '',
                service: reg.service || 'pppoe',
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
        const searchLower = String(searchTerm).toLowerCase();

        return users.filter(user => {
            // Online filter
            const isActive = activeConnections.some(c => c.name === user.name);
            if (filterStatus === 'online' && !isActive) return false;
            if (filterStatus === 'offline' && isActive) return false;

            const customerName = String(customersData[user.name]?.name || '');
            const customerId = String(customersData[user.name]?.customerId || '');
            const userProfile = String(user.profile || '');
            const userService = String(user.service || '');
            const userNameStr = String(user.name || '');

            return userNameStr.toLowerCase().includes(searchLower) ||
                (userProfile && userProfile.toLowerCase().includes(searchLower)) ||
                (userService && userService.toLowerCase().includes(searchLower)) ||
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
                    aVal = String(a.name || '').toLowerCase();
                    bVal = String(b.name || '').toLowerCase();
                    break;
                case 'customer':
                    aVal = String(getCustomerName(a.name) || '').toLowerCase();
                    bVal = String(getCustomerName(b.name) || '').toLowerCase();
                    break;
                case 'profile':
                    aVal = String(a.profile || '').toLowerCase();
                    bVal = String(b.profile || '').toLowerCase();
                    break;
                case 'staff':
                    aVal = String(getPartnerName(a.name) || '').toLowerCase();
                    bVal = String(getPartnerName(b.name) || '').toLowerCase();
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
                    aVal = aActive ? String(aActive.address || 'z') : 'z';
                    bVal = bActive ? String(bActive.address || 'z') : 'z';
                    break;
                case 'device_signal':
                    const aDevice = getAcsDevice(a.name);
                    const bDevice = getAcsDevice(b.name);
                    // Extract numeric value, default to very low if missing
                    // rx_power is typically negative, so -999 is a safe "no signal" value
                    const aSignal = aDevice && aDevice.rx_power ? parseFloat(aDevice.rx_power) : -999;
                    const bSignal = bDevice && bDevice.rx_power ? parseFloat(bDevice.rx_power) : -999;
                    aVal = aSignal;
                    bVal = bSignal;
                    break;
                case 'id':
                    aVal = String(a._customerId || customersData[a.name]?.customerId || '').toLowerCase();
                    bVal = String(b._customerId || customersData[b.name]?.customerId || '').toLowerCase();
                    break;
                case 'password':
                    aVal = String(a.password || '').toLowerCase();
                    bVal = String(b.password || '').toLowerCase();
                    break;
                default:
                    aVal = String(a[sortConfig.key] || '');
                    bVal = String(b[sortConfig.key] || '');
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [filteredUsers, sortConfig, customersData, systemUsers, activeConnections, acsDevices]);

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
        if (!formData.name) missingFields.push(t('users.username'));
        if (!editMode && !formData.password) missingFields.push(t('users.password'));
        if (!formData.profile || formData.profile === '' || formData.profile === 'default') missingFields.push(t('users.profile'));
        if (!formData.customerName) missingFields.push(t('users.fullName'));
        if (!formData.customerAddress) missingFields.push(t('users.address'));
        // Determine effective Agent/Tech IDs based on role
        const effectiveAgentId = userRole === 'agent' ? currentUserId : formData.agentId;
        const effectiveTechnicianId = userRole === 'technician' ? currentUserId : formData.technicianId;

        if (missingFields.length === 0) {
            // Check specific role-based requirements
            if (!effectiveAgentId && ['superadmin', 'admin', 'manager', 'agent'].includes(userRole)) missingFields.push(t('users.agent'));
            if (!effectiveTechnicianId && ['superadmin', 'admin', 'manager', 'technician'].includes(userRole)) missingFields.push(t('users.technician'));
        }

        if (missingFields.length > 0) {
            alert(t('messages.validationError', { fields: missingFields.join('\n- ') }));
            return;
        }


        // Staff/Editor/Agent/Technician Edit Request
        if (['staff', 'editor', 'agent', 'technician'].includes(userRole) && editMode) {
            const hasPppoeChanges = (
                formData.name !== formData.originalName ||
                (formData.password && formData.password !== '') ||
                formData.profile !== (formData.originalProfile || 'default') ||
                formData.service !== (formData.originalService || 'pppoe')
            );

            if (!hasPppoeChanges) {
                try {
                    const custRes = await fetch('/api/customers', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: formData.originalName,
                            customerId: formData.customerId,
                            name: formData.customerName,
                            address: formData.customerAddress,
                            phone: formData.customerPhone,
                            email: formData.customerEmail,
                            agentId: effectiveAgentId,
                            technicianId: effectiveTechnicianId,
                            ownerId: formData.ownerId
                        })
                    });

                    if (custRes.ok) {
                        alert(t('messages.userSavedSuccess') || 'Updated successfully without needing admin approval.');
                        handleCloseModal();
                        fetchCustomersData();
                    } else {
                        const custData = await custRes.json();
                        alert((t('messages.failedToSaveUser') || 'Failed to update') + ': ' + (custData.error || t('messages.unknownError')));
                    }
                } catch (error) {
                    console.error('Failed to update customer directly', error);
                    alert(t('messages.errorSavingUser') || 'Error updating customer data');
                }
                return;
            }

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
                            agentId: effectiveAgentId,
                            technicianId: effectiveTechnicianId
                        },
                        agentId: currentUserId
                    }),
                });

                if (res.ok) {
                    alert(t('messages.editRequestSubmitted'));
                    handleCloseModal();
                    fetchPendingRegistrations();
                } else {
                    const data = await res.json();
                    alert(t('messages.failedToSubmitEditRequest') + ': ' + data.error);
                }
            } catch (error) {
                console.error('Failed to submit edit request', error);
                alert(t('messages.errorSubmittingRequest'));
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
                    agentId: effectiveAgentId,
                    technicianId: effectiveTechnicianId
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
                        agentId: effectiveAgentId,
                        technicianId: effectiveTechnicianId,
                        ownerId: formData.ownerId
                    })
                });

                if (!custRes.ok) {
                    const custData = await custRes.json();
                    console.error('Failed to save customer data:', custData);
                    alert(t('messages.userSavedRouterFailedDB') + ': ' + (custData.error || t('messages.unknownError')));
                }

                handleCloseModal();
                fetchUsers();
                fetchCustomersData();
                fetchUsers();
                fetchCustomersData();
            } else {
                const data = await res.json();
                alert(t('messages.failedToSaveUser') + ': ' + (data.error || t('messages.unknownError')));
            }
        } catch (error) {
            console.error('Failed to save user', error);
            alert(t('messages.errorSavingUser'));
        }
    };

    const handleEdit = async (user) => {
        setEditMode(true);
        // Robust ID extraction: use .id if available, otherwise try to parse from composite id
        let targetId = user['.id'];
        if (!targetId && user.id && user.id.includes('_')) {
            const parts = user.id.split('_');
            targetId = parts[parts.length - 1]; // Assume last part is the Mikrotik ID (often starts with *)
        }

        console.log('Editing user:', user.name, 'Target ID:', targetId);
        setEditingUserId(targetId);

        // Store original name for edit request
        setFormData(prev => ({ ...prev, originalName: user.name }));

        // Fetch customer details
        try {
            const res = await fetch(`/api/customers/${encodeURIComponent(user.name)}`);
            const customerData = await res.json();

            setFormData({
                originalName: user.name, // Store original name
                originalProfile: user.profile || 'default',
                originalService: user.service || 'pppoe',
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
                originalProfile: user.profile || 'default',
                originalService: user.service || 'pppoe',
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
        if (!confirm(t('messages.confirmDeleteUser', { name: user.name }))) return;

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
            if (agent) parts.push(`${t('pppoe.agentLabel')}: ${agent.fullName || agent.username}`);
        }
        if (technicianId) {
            const tech = systemUsers.find(u => u.id === technicianId);
            if (tech) parts.push(`${t('pppoe.techLabel')}: ${tech.fullName || tech.username}`);
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
        if (!confirm(t('messages.confirmBulkUpdate', { count: selectedUsers.size }))) return;

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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">{t('users.title')}</h1>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    {selectedUsers.size > 0 && !['staff', 'editor', 'agent', 'technician'].includes(userRole) && (
                        <button
                            onClick={() => setShowBulkEditModal(true)}
                            className="bg-purple-600 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors shadow-lg animate-pulse text-sm font-medium"
                        >
                            <UsersIcon size={18} /> {t('pppoe.bulkEdit')} ({selectedUsers.size})
                        </button>
                    )}

                    <button
                        onClick={() => { setShowModal(true); fetchRouterIdentities(connections); }}
                        className="bg-accent text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all text-sm font-medium shadow-lg shadow-accent/20"
                    >
                        <Plus size={18} /> {t('pppoe.addUser')}
                    </button>
                </div>
            </div>

            {/* Pending Registrations (Admin & Staff) */}
            {((userRole === 'admin' || userRole === 'editor' || userRole === 'staff') && pendingRegistrations.length > 0) && (
                <div className="bg-yellow-50/30 dark:bg-yellow-900/30 backdrop-blur-xl border border-yellow-200/50 dark:border-yellow-800/50 rounded-xl p-4 md:p-6 shadow-lg">
                    <h2 className="text-lg md:text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-4 flex items-center gap-2">
                        <Clock className="text-yellow-600 dark:text-yellow-400" size={20} /> {t('pppoe.pendingRegistrations')}
                        <span className="ml-1 px-2 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded-full text-sm font-semibold">
                            {pendingRegistrations.filter(reg => userRole === 'admin' || userRole === 'editor' || (userRole === 'staff' && reg.agentId === currentUserId)).length}
                        </span>
                    </h2>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {pendingRegistrations
                            .filter(reg => userRole === 'admin' || userRole === 'editor' || (userRole === 'staff' && reg.agentId === currentUserId))
                            .map((reg) => {
                                const agent = systemUsers.find(u => u.id === reg.agentId);
                                const typeBadge = reg.type === 'edit'
                                    ? { label: t('common.edit'), cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' }
                                    : reg.type === 'delete'
                                    ? { label: t('common.delete'), cls: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' }
                                    : { label: t('pppoe.register'), cls: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' };
                                return (
                                    <div key={reg.username} className="bg-white dark:bg-gray-800 rounded-xl border border-yellow-200/60 dark:border-yellow-800/40 p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            <div>
                                                <div className="font-bold text-gray-900 dark:text-white text-sm">{reg.targetUsername || reg.username}</div>
                                                {reg.name && <div className="text-xs text-gray-500 mt-0.5">{reg.name}</div>}
                                            </div>
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${typeBadge.cls}`}>{typeBadge.label}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                            <div>
                                                <div className="text-gray-400 mb-0.5">{t('users.profile')}</div>
                                                <div className="font-medium text-gray-700 dark:text-gray-200">{reg.registrationData?.profile || '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-400 mb-0.5">{t('users.service')}</div>
                                                <div className="font-medium text-gray-700 dark:text-gray-200">{reg.registrationData?.service || '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-400 mb-0.5">{t('users.agent')}</div>
                                                <div className="font-medium text-gray-700 dark:text-gray-200">{agent ? (agent.fullName || agent.username) : '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-400 mb-0.5">{t('common.status')}</div>
                                                <div className="font-medium text-yellow-600 dark:text-yellow-400">{t('pppoe.pendingReview')}</div>
                                            </div>
                                        </div>
                                        {(userRole === 'admin' || userRole === 'editor') && (
                                            <button
                                                onClick={() => handleReview(reg)}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                            >
                                                <Edit2 size={15} /> {t('common.review')}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('users.username')}</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('common.type')}</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('users.fullName')}</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('users.agent')}</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('users.profile')}</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('common.status')}</th>
                                    {(userRole === 'admin' || userRole === 'editor') && (
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('common.actions')}</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {pendingRegistrations
                                    .filter(reg => userRole === 'admin' || userRole === 'editor' || (userRole === 'staff' && reg.agentId === currentUserId))
                                    .map((reg) => (
                                        <tr key={reg.username} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-5 py-3.5 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">{reg.targetUsername || reg.username}</td>
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${reg.type === 'delete' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : reg.type === 'edit' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'}`}>
                                                    {reg.type === 'edit' ? t('common.edit') : reg.type === 'delete' ? t('common.delete') : t('pppoe.register')}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{reg.name || '-'}</td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                {(() => { const a = systemUsers.find(u => u.id === reg.agentId); return a ? (a.fullName || a.username) : '-'; })()}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                {reg.registrationData?.profile} / {reg.registrationData?.service}
                                            </td>
                                            <td className="px-5 py-3.5 whitespace-nowrap text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                                                {t('pppoe.pendingReview')}
                                            </td>
                                            {(userRole === 'admin' || userRole === 'editor') && (
                                                <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        onClick={() => handleReview(reg)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-xs font-semibold"
                                                    >
                                                        <Edit2 size={14} /> {t('common.review')}
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
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`p-4 flex flex-col items-center justify-center text-center transition-all duration-200 relative overflow-hidden group
                                ${filterStatus === 'all'
                                    ? 'bg-blue-50/80 dark:bg-blue-900/40 ring-2 ring-inset ring-blue-500/50 z-10 scale-[1.02]'
                                    : 'hover:bg-white/10 dark:hover:bg-white/5 hover:scale-[1.02]'
                                }`}
                        >
                            <UsersIcon
                                size={80}
                                className={`absolute -bottom-4 -right-4 opacity-5 transition-opacity duration-300
                                    ${filterStatus === 'all' ? 'opacity-10 text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:opacity-10'}
                                `}
                            />

                            {filterStatus === 'all' && (
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 z-20" />
                            )}

                            <p className={`text-xl md:text-2xl font-bold transition-colors z-10 ${filterStatus === 'all' ? 'text-blue-700 dark:text-blue-200' : 'text-gray-800 dark:text-white'}`}>{users.length}</p>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider z-10">{t('pppoe.all')}</p>
                        </button>

                        {/* Online */}
                        <button
                            onClick={() => setFilterStatus('online')}
                            className={`p-4 flex flex-col items-center justify-center text-center transition-all duration-200 relative overflow-hidden group
                                ${filterStatus === 'online'
                                    ? 'bg-green-50/80 dark:bg-green-900/40 ring-2 ring-inset ring-green-500/50 z-10 scale-[1.02]'
                                    : 'hover:bg-white/10 dark:hover:bg-white/5 hover:scale-[1.02]'
                                }`}
                        >
                            <Wifi
                                size={80}
                                className={`absolute -bottom-4 -right-4 opacity-5 transition-opacity duration-300
                                    ${filterStatus === 'online' ? 'opacity-10 text-green-600 dark:text-green-400' : 'text-gray-400 group-hover:opacity-10'}
                                `}
                            />

                            {filterStatus === 'online' && (
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-green-500 z-20" />
                            )}

                            <p className={`text-xl md:text-2xl font-bold transition-colors z-10 ${filterStatus === 'online' ? 'text-green-700 dark:text-green-200' : 'text-green-600 dark:text-green-400'}`}>{activeConnections.length}</p>
                            <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider z-10">{t('pppoe.online')}</p>
                        </button>

                        {/* Offline */}
                        <button
                            onClick={() => setFilterStatus('offline')}
                            className={`p-4 flex flex-col items-center justify-center text-center transition-all duration-200 relative overflow-hidden group
                                ${filterStatus === 'offline'
                                    ? 'bg-gray-50/80 dark:bg-gray-800/60 ring-2 ring-inset ring-gray-500/50 z-10 scale-[1.02]'
                                    : 'hover:bg-white/10 dark:hover:bg-white/5 hover:scale-[1.02]'
                                }`}
                        >
                            <Power
                                size={80}
                                className={`absolute -bottom-4 -right-4 opacity-5 transition-opacity duration-300
                                    ${filterStatus === 'offline' ? 'opacity-10 text-gray-500 dark:text-gray-400' : 'text-gray-400 group-hover:opacity-10'}
                                `}
                            />

                            {filterStatus === 'offline' && (
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-gray-500 z-20" />
                            )}

                            <p className={`text-xl md:text-2xl font-bold transition-colors z-10 ${filterStatus === 'offline' ? 'text-gray-700 dark:text-gray-200' : 'text-gray-600 dark:text-gray-300'}`}>{users.length - activeConnections.length}</p>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider z-10">{t('pppoe.offline')}</p>
                        </button>
                    </div>
                </div>

                {/* Search Bar & Filters */}
                <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-4 border border-white/20 dark:border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:flex-1">
                        <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder={t('pppoe.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:placeholder-gray-400"
                        />
                    </div>

                </div>

                {/* Unified Table */}
                <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl overflow-hidden border border-white/20 dark:border-white/5">
                    {/* Mobile Card View */}
                    <div className="md:hidden p-4 flex flex-col gap-3">
                        {loading ? (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
                        ) : sortedUsers.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">{t('pppoe.noOfflineUsers')}</div>
                        ) : (
                            paginatedUsers.map((user) => {
                                const active = getActiveConnection(user.name);
                                const acs = getAcsDevice(user.name);
                                const isOnline = !!active;

                                return (
                                    <div
                                        key={user['.id']}
                                        onClick={() => setDetailsModal({ ...user, acs, active })}
                                        className={`rounded-xl p-3 border transition-shadow cursor-pointer ${isOnline ? 'bg-green-50/40 border-green-100 dark:bg-green-900/10 dark:border-green-800/30' : 'bg-white/50 border-gray-100 dark:bg-gray-800/50 dark:border-gray-700/50'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex gap-2 items-center">
                                                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white text-[15px] leading-tight">{user.name}</h4>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{getCustomerName(user.name) || '-'}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDetailsModal({ ...user, acs, active }); }}
                                                className="p-1 -mr-1 -mt-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                            >
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded text-[10px] font-medium border border-blue-100 dark:border-blue-800/30">
                                                {user.profile || 'Default'}
                                            </span>
                                            {(() => {
                                                const cid = (user._customerId && user._customerId !== '-') ? user._customerId : (customersData[user.name]?.customerId && customersData[user.name]?.customerId !== '-') ? customersData[user.name].customerId : null;
                                                if (!cid) return null;
                                                return (
                                                    <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded text-[10px] font-medium border border-purple-100 dark:border-purple-800/30">
                                                        ID: {cid}
                                                    </span>
                                                );
                                            })()}
                                            {getPartnerName(user.name) && getPartnerName(user.name) !== '-' && (
                                                <span className="px-1.5 py-0.5 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 rounded text-[10px] font-medium flex items-center gap-1 border border-orange-100 dark:border-orange-800/30">
                                                    <User size={10} /> {getPartnerName(user.name)}
                                                </span>
                                            )}
                                        </div>

                                        {isOnline && (
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-gray-600 dark:text-gray-300 mb-2 bg-white/40 dark:bg-black/20 px-2 py-1.5 rounded-lg">
                                                <div className="flex items-center gap-1 font-medium text-green-600 dark:text-green-400 w-full sm:w-auto">
                                                    <Clock size={12} />
                                                    <span>{formatUptime(active.uptime)}</span>
                                                </div>
                                                <div className="flex items-center gap-1 font-mono text-gray-500">
                                                    <Globe size={12} />
                                                    <span>{active.address}</span>
                                                </div>
                                                {active['caller-id'] && (
                                                    <div className="flex items-center gap-1 font-mono text-gray-400">
                                                        <span>|</span>
                                                        <span>{active['caller-id']}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex space-x-3 border-t border-gray-100 dark:border-gray-700/50 pt-2.5">
                                            <div className="flex-1">
                                                <div className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">{t('pppoe.usage')}</div>
                                                <div className="flex gap-2.5">
                                                    <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400 text-[11px] font-medium">
                                                        <ArrowUpDown size={10} className="rotate-180" /> {formatBytes(user.usage?.tx || 0)}
                                                    </span>
                                                    <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 text-[11px] font-medium">
                                                        <ArrowUpDown size={10} /> {formatBytes(user.usage?.rx || 0)}
                                                    </span>
                                                </div>
                                            </div>
                                            {acs && (
                                                <div className="flex-1 border-l border-gray-100 dark:border-gray-700/50 pl-3">
                                                    <div className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">{t('device.signal')}</div>
                                                    <div className={`flex items-center gap-1 text-[11px] font-bold ${parseFloat(acs.rx_power) < -25 ? 'text-red-500' : 'text-green-500'}`}>
                                                        <Wifi size={10} /> {acs.rx_power || '-'} dBm
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
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
                                            {t('common.more')}
                                        </div>
                                    </th>
                                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('common.actions')}</th>
                                    <th
                                        onClick={() => sortData('username')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            {t('users.username')} <ArrowUpDown size={14} className="text-gray-400" />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => sortData('id')}
                                        className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            {t('users.customerId')} <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => sortData('password')}
                                        className="hidden xl:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            {t('users.password')} <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => sortData('device_signal')}
                                        className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            {t('pppoe.device')} <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => sortData('profile')}
                                        className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            {t('pppoe.profile')} <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => sortData('staff')}
                                        className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            {t('pppoe.partner')} <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                                    >
                                        {t('pppoe.session')}
                                    </th>
                                    <th
                                        onClick={() => sortData('usage')}
                                        className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            {t('pppoe.usage')} <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-transparent divide-y divide-gray-200/50 dark:divide-white/10">
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">{t('common.loading')}</td>
                                    </tr>
                                ) : sortedUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">{t('pppoe.noOfflineUsers')}</td>
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

                                                {/* Actions Column (Moved) */}
                                                <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex items-center gap-1">
                                                        {isOnline && (
                                                            <>
                                                                <a
                                                                    href={`http://${active.address}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    title={t('pppoe.manageDeviceTitle')}
                                                                    className="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded transition-colors inline-block"
                                                                >
                                                                    <ExternalLink size={18} />
                                                                </a>
                                                                {acs && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => openDeviceDetails(acs)}
                                                                            title={t('pppoe.deviceDetailsTitle')}
                                                                            className="p-1 text-teal-600 hover:text-teal-800 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded transition-colors"
                                                                        >
                                                                            <Info size={18} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => openEditWifi(acs)}
                                                                            title={t('pppoe.editWifiTitle')}
                                                                            className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                                        >
                                                                            <Wifi size={18} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleReboot(acs.id, acs.serial)}
                                                                            title={t('pppoe.rebootDeviceTitle')}
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
                                                            title={t('pppoe.editUserTitle')}
                                                            className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(user)}
                                                            title={t('pppoe.deleteUserTitle')}
                                                            className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Unified User Column */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                                {customersData[user.name]?.avatar ? (
                                                                    <img src={customersData[user.name].avatar} alt={user.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <User size={14} className="text-gray-400" />
                                                                )}
                                                            </div>
                                                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} title={isOnline ? t('users.online') : t('users.offline')} />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-bold text-gray-900 dark:text-white truncate" title={user.name}>
                                                                {user.name}
                                                            </span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{getCustomerName(user.name)}</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                                                    {(() => {
                                                        const cid = (user._customerId && user._customerId !== '-') ? user._customerId : (customersData[user.name]?.customerId && customersData[user.name]?.customerId !== '-') ? customersData[user.name].customerId : null;
                                                        if (cid) {
                                                            return (
                                                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-md font-medium border border-blue-200 dark:border-blue-800/50">
                                                                    {cid}
                                                                </span>
                                                            );
                                                        }
                                                        return <span className="text-xs text-gray-400">-</span>;
                                                    })()}
                                                </td>

                                                {/* Password Column */}
                                                <td className="hidden xl:table-cell px-6 py-4 whitespace-nowrap">
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono tracking-wide">{user.password || '-'}</span>
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
                                                        {isOnline && (
                                                            <span className="text-[10px] font-mono text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded mt-1 w-fit border border-green-100 dark:border-green-800/30">
                                                                {active.address}
                                                            </span>
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
                                                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium" title={t('pppoe.upload')}>
                                                                <ArrowUpDown size={10} className="rotate-180" /> {formatBytes(user.usage?.tx || 0)}
                                                            </span>
                                                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium" title={t('pppoe.download')}>
                                                                <ArrowUpDown size={10} /> {formatBytes(user.usage?.rx || 0)}
                                                            </span>
                                                        </div>
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
                                {t('billing.showing')} <span className="font-medium mx-1">
                                    {users.length === 0 ? 0 : (currentPage - 1) * (rowsPerPage === 'All' ? filteredUsers.length : rowsPerPage) + 1}
                                </span>
                                {t('billing.to')}
                                <span className="font-medium mx-1">
                                    {rowsPerPage === 'All' ? filteredUsers.length : Math.min(currentPage * rowsPerPage, filteredUsers.length)}
                                </span>
                                {t('billing.of')}
                                <span className="font-medium mx-1">{filteredUsers.length}</span> {t('billing.results')}
                            </div>
                            {rowsPerPage !== 'All' && (
                                <button
                                    onClick={() => setRowsPerPage('All')}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium underline"
                                >
                                    {t('pppoe.showAll')}
                                </button>
                            )}
                            {rowsPerPage === 'All' && (
                                <button
                                    onClick={() => setRowsPerPage(25)}
                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium underline"
                                >
                                    {t('pppoe.pagination')}
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{t('pppoe.rowsPerPage')}</span>
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
                                <option value="All">{t('users.all')}</option>
                            </select>

                            <div className="flex gap-1 ml-4">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1 || rowsPerPage === 'All'}
                                    className="px-3 py-1 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {t('billing.previous')}
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredUsers.length / (rowsPerPage === 'All' ? filteredUsers.length : rowsPerPage)), p + 1))}
                                    disabled={rowsPerPage === 'All' || currentPage >= Math.ceil(filteredUsers.length / rowsPerPage)}
                                    className="px-3 py-1 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {t('billing.next')}
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
                                {editMode ? t('pppoe.editUserTitle') : t('pppoe.addUser')}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* PPPoE Details */}
                                <div className="border-b pb-4">
                                    <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
                                        <Shield size={20} /> {t('users.credentials')}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('users.username')} <span className="text-red-500">*</span></label>
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
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('users.password')} <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                required={!editMode}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                                placeholder={editMode ? t('pppoe.leaveBlankPlaceholder') : ""}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('users.profile')} <span className="text-red-500">*</span></label>
                                            <div className="relative" ref={profileDropdownRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white flex items-center justify-between"
                                                >
                                                    <span className={!formData.profile ? "text-gray-400 dark:text-gray-500" : ""}>
                                                        {formData.profile || t('users.selectProfile')}
                                                    </span>
                                                    <ChevronDown size={18} className={`transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} />
                                                </button>
                                                <AnimatePresence>
                                                    {showProfileDropdown && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                                                        >
                                                            {profiles.map(profile => {
                                                                const price = profile.comment?.toLowerCase().includes('price:') 
                                                                    ? profile.comment.split('price:')[1].split(',')[0].trim() 
                                                                    : 0;
                                                                return (
                                                                    <button
                                                                        key={profile['.id'] || profile.name}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setFormData({ ...formData, profile: profile.name });
                                                                            setShowProfileDropdown(false);
                                                                        }}
                                                                        className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center ${formData.profile === profile.name ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}
                                                                    >
                                                                        <span className="font-medium">{profile.name}</span>
                                                                        {price > 0 && <span className="text-xs opacity-70">{formatCurrency(price)}</span>}
                                                                    </button>
                                                                );
                                                            })}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('users.service')}</label>
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
                                            <Server size={20} /> {t('users.targetRouters')}
                                        </h3>
                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-500 mb-2">{t('users.selectRoutersDesc')}</p>
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
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-sm text-gray-800 dark:text-white">{conn.name}</div>
                                                            <div className="text-xs text-gray-500 font-mono">{conn.host}</div>
                                                            {routerIdentities[conn.id] !== undefined && (
                                                                <div className={`text-xs mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-medium ${
                                                                    routerIdentities[conn.id]
                                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                                                                        : 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                                                                }`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${routerIdentities[conn.id] ? 'bg-green-500' : 'bg-red-500'}`} />
                                                                    {routerIdentities[conn.id] || 'Offline'}
                                                                </div>
                                                            )}
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
                                        <User size={20} /> {t('users.customerInfo')}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                                <Building size={16} /> {t('users.fullName')} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.customerName}
                                                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                                placeholder={t('users.realNamePlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                                <User size={16} /> {t('users.customerId')}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.customerId}
                                                readOnly
                                                disabled
                                                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                                placeholder={t('users.autoGenerated')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                                <Phone size={16} /> {t('users.phone')}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.customerPhone}
                                                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                                placeholder={t('pppoe.phonePlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                                <Mail size={16} /> {t('users.emailAddress')}
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.customerEmail}
                                                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                                placeholder={t('users.emailPlaceholder')}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                                                <MapPin size={16} /> {t('users.address')} <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                required
                                                value={formData.customerAddress}
                                                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                                rows="2"
                                                placeholder={t('users.fullAddressPlaceholder')}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Agent and Technician Selection - Restricted to Admin/Manager */}
                                {['superadmin', 'admin', 'manager'].includes(userRole) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.agent')} <span className="text-red-500">*</span></label>
                                            <select
                                                required
                                                value={formData.agentId}
                                                onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">{t('users.selectAgent')}</option>
                                                {systemUsers.filter(u => u.isAgent).map(user => (
                                                    <option key={user.id} value={user.id}>{user.username}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.technician')} <span className="text-red-500">*</span></label>
                                            <select
                                                required
                                                value={formData.technicianId}
                                                onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">{t('users.selectTechnician')}</option>
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
                                        {t('users.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 transition-all"
                                    >
                                        {editMode ? t('users.updateUser') : t('users.createUser')}
                                    </button>
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
                                {selectedRegistration.type === 'delete' ? t('pppoe.reviewDelete') :
                                    selectedRegistration.type === 'edit' ? t('pppoe.reviewEdit') :
                                        t('pppoe.reviewRegistration')}
                            </h2>

                            {selectedRegistration.type === 'delete' ? (
                                <div className="space-y-6">
                                    <div className="bg-red-50/30 dark:bg-red-900/30 backdrop-blur-xl border border-red-200/50 dark:border-red-800/50 rounded-lg p-6 shadow-lg">
                                        <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                                            <AlertTriangle className="text-red-600 dark:text-red-400" /> {t('pppoe.warningDelete')}
                                        </h3>
                                        <p className="text-red-700 dark:text-red-300 text-lg mb-4">
                                            {t('messages.confirmApproveDelete', { name: selectedRegistration.targetUsername })}
                                        </p>
                                        <p className="text-red-600 dark:text-red-400 text-sm">
                                            {t('messages.deleteWarningInfo')}
                                        </p>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                        <button
                                            onClick={() => setShowReviewModal(false)}
                                            className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            onClick={() => handleRegistrationAction(selectedRegistration.username, 'reject')}
                                            className="px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <XCircle size={18} /> {t('users.reject')}
                                        </button>
                                        <button
                                            onClick={() => handleRegistrationAction(selectedRegistration.username, 'approve')}
                                            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <CheckCircle size={18} /> {t('pppoe.approveDelete')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* PPPoE Details */}
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">{t('pppoe.pppoeAccount')}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-gray-400">{t('users.username')}</label>
                                                <input
                                                    type="text"
                                                    value={reviewFormData.username}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, username: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-gray-400">{t('users.password')}</label>
                                                <input
                                                    type="text"
                                                    value={reviewFormData.password}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, password: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-gray-400">{t('users.profile')}</label>
                                                <div className="relative" ref={reviewProfileDropdownRef}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowReviewProfileDropdown(!showReviewProfileDropdown)}
                                                        className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white flex items-center justify-between min-h-[30px]"
                                                    >
                                                        <span className={!reviewFormData.profile ? "text-gray-400 dark:text-gray-500" : ""}>
                                                            {reviewFormData.profile || t('users.selectProfile')}
                                                        </span>
                                                        <ChevronDown size={14} className={`transition-transform duration-200 ${showReviewProfileDropdown ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    <AnimatePresence>
                                                        {showReviewProfileDropdown && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: -10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -10 }}
                                                                className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-xl max-h-48 overflow-y-auto"
                                                            >
                                                                {profiles.map(p => {
                                                                    const price = p.comment?.toLowerCase().includes('price:') 
                                                                        ? p.comment.split('price:')[1].split(',')[0].trim() 
                                                                        : 0;
                                                                    return (
                                                                        <button
                                                                            key={p.name}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setReviewFormData({ ...reviewFormData, profile: p.name });
                                                                                setShowReviewProfileDropdown(false);
                                                                            }}
                                                                            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center ${reviewFormData.profile === p.name ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}
                                                                        >
                                                                            <span className="truncate mr-2">{p.name}</span>
                                                                            {price > 0 && <span className="text-[10px] opacity-70 whitespace-nowrap">{formatCurrency(price)}</span>}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 dark:text-gray-400">{t('users.service')}</label>
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
                                                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('users.targetRouters')}</label>
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
                                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">{t('pppoe.customerInfo')}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('users.fullName')}</label>
                                                <input
                                                    type="text"
                                                    value={reviewFormData.name}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, name: e.target.value })}
                                                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('users.phone')}</label>
                                                <input
                                                    type="text"
                                                    value={reviewFormData.phone}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, phone: e.target.value })}
                                                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('users.address')}</label>
                                                <input
                                                    type="text"
                                                    value={reviewFormData.address}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, address: e.target.value })}
                                                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Agent Info */}
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">{t('pppoe.registrationInfo')}</h3>
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 mr-4">
                                                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{t('pppoe.registeredBy')}</label>
                                                <select
                                                    value={reviewFormData.agentId}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, agentId: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                                                >
                                                    <option value="">{t('pppoe.noAgent')}</option>
                                                    {systemUsers.filter(u => u.isAgent).map(user => (
                                                        <option key={user.id} value={user.id}>{user.username}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {t('common.date')}: {new Date().toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                        <button
                                            onClick={() => setShowReviewModal(false)}
                                            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            onClick={() => handleRegistrationAction(selectedRegistration.username, 'reject')}
                                            className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <XCircle size={18} /> {t('pppoe.reject')}
                                        </button>
                                        <button
                                            onClick={() => handleRegistrationAction(selectedRegistration.username, 'approve')}
                                            className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <CheckCircle size={18} /> {t('pppoe.approve')}
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
                                    {t('pppoe.bulkEditStaff')}
                                </h3>
                                <button onClick={() => setShowBulkEditModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleBulkEditSubmit} className="p-6 space-y-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200 mb-4">
                                    {t('pppoe.bulkUpdateInfo', { count: selectedUsers.size })}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('pppoe.assignAgent')}</label>
                                    <select
                                        value={bulkEditData.agentId}
                                        onChange={(e) => setBulkEditData({ ...bulkEditData, agentId: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">{t('pppoe.noChange')}</option>
                                        {systemUsers.filter(u => u.isAgent).map(u => (
                                            <option key={u.id} value={u.id}>{u.fullName || u.username}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('pppoe.assignTechnician')}</label>
                                    <select
                                        value={bulkEditData.technicianId}
                                        onChange={(e) => setBulkEditData({ ...bulkEditData, technicianId: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">{t('pppoe.noChange')}</option>
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
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                                    >
                                        {loading ? t('common.saving') : t('pppoe.updateStaff')}
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
                                <Wifi className="text-blue-500" /> {t('users.editWifi')}
                            </h3>
                            <form onSubmit={handleSaveWifi} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('device.ssid')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={wifiForm.ssid}
                                        onChange={(e) => setWifiForm({ ...wifiForm, ssid: e.target.value })}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('users.password')}</label>
                                    <input
                                        type="text"
                                        value={wifiForm.password}
                                        onChange={(e) => setWifiForm({ ...wifiForm, password: e.target.value })}
                                        placeholder={t('device.leaveBlank')}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{t('device.leaveBlank')}</p>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingDevice(null)}
                                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        {t('common.save')}
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
                                    <Smartphone className="text-teal-500" /> {t('users.deviceDetails')}
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
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">{t('device.model')}</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedDevice.manufacturer} - {selectedDevice.model}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">{t('device.sn')}</p>
                                        <p className="text-sm font-mono text-gray-900 dark:text-white bg-white dark:bg-gray-800 px-2 py-1 rounded border dark:border-gray-600 inline-block mt-1">
                                            {selectedDevice.serial}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold mb-1">{t('device.ssid') || 'SSID'}</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate" title={selectedDevice.ssid}>
                                            {selectedDevice.ssid || '-'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                        <p className="text-xs text-green-600 dark:text-green-400 uppercase font-semibold mb-1">{t('device.signal') || 'Signal (Rx)'}</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                            {selectedDevice.rx_power ? `${selectedDevice.rx_power}dBm` : '-'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                        <p className="text-xs text-orange-600 dark:text-orange-400 uppercase font-semibold mb-1">{t('device.temp') || 'Temperature'}</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                            {selectedDevice.temp ? `${selectedDevice.temp}°C` : '-'}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                        <p className="text-xs text-purple-600 dark:text-purple-400 uppercase font-semibold mb-1">{t('device.ip') || 'IP Address'}</p>
                                        <p className="text-sm font-mono font-bold text-gray-900 dark:text-white truncate">
                                            {selectedDevice.ip || '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-xs text-gray-400 text-center pt-2">
                                    {t('device.lastInform')}: {selectedDevice.lastInform ? new Date(selectedDevice.lastInform).toLocaleString(resolvedLanguage === 'id' ? 'id-ID' : 'en-US') : '-'}
                                </div>
                            </div>

                            <div className="mt-6">
                                <button
                                    onClick={() => setShowDeviceModal(false)}
                                    className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                                >
                                    {t('common.close')}
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
                                        <span className="text-xs text-blue-600 dark:text-blue-400 block mb-1">{t('pppoe.download')}</span>
                                        <span className="font-bold text-gray-800 dark:text-white">
                                            {formatBytes(detailsModal.usage?.rx || 0)}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                        <span className="text-xs text-green-600 dark:text-green-400 block mb-1">{t('pppoe.upload')}</span>
                                        <span className="font-bold text-gray-800 dark:text-white">
                                            {formatBytes(detailsModal.usage?.tx || 0)}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-sm text-gray-500">{t('common.profile')}</span>
                                        <span className="text-sm font-medium dark:text-gray-200">{detailsModal.profile}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-sm text-gray-500">{t('common.uptime')}</span>
                                        <span className="text-sm font-medium dark:text-gray-200">
                                            {detailsModal.active ? formatUptime(detailsModal.active.uptime) : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                                        <span className="text-sm text-gray-500">{t('common.callerId')}</span>
                                        <span className="text-sm font-medium dark:text-gray-200">
                                            {detailsModal.active ? detailsModal.active['caller-id'] : '-'}
                                        </span>
                                    </div>

                                    {/* ACS Details Section */}
                                    {detailsModal.acs ? (
                                        <div className="pt-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">{t('pppoe.deviceDetailsTitle')}</span>
                                            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">{t('device.ssid')}</span>
                                                    <span className="font-medium dark:text-gray-200">{detailsModal.acs.ssid || '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">{t('device.signal')}</span>
                                                    <span className={`font-bold ${parseFloat(detailsModal.acs.rx_power) < -25 ? 'text-red-500' : 'text-green-500'}`}>
                                                        {detailsModal.acs.rx_power} dBm
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">{t('device.temp')}</span>
                                                    <span className="font-medium dark:text-gray-200">{detailsModal.acs.temp}°C</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">{t('device.sn')}</span>
                                                    <span className="font-mono text-xs dark:text-gray-200">{detailsModal.acs.serial}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg text-center text-sm text-gray-500 italic">
                                            {t('users.noAcsDevice')}
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
                                    <Edit2 size={18} /> {t('common.edit')}
                                </button>

                                {detailsModal.active?.address && (
                                    <a
                                        href={`http://${detailsModal.active.address}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-teal-100 text-teal-700 rounded-xl font-medium hover:bg-teal-200 transition-colors"
                                    >
                                        <ExternalLink size={18} /> {t('users.manage')}
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
                                        <Power size={18} /> {t('users.disconnect')}
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
                                        <Trash2 size={18} /> {t('common.delete')}
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
                                            <Wifi size={18} /> {t('users.wifiSettingsShort') || 'WiFi'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                const acs = detailsModal.acs;
                                                setDetailsModal(null);
                                                handleReboot(acs.id, acs.serial);
                                            }}
                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-100 text-orange-700 rounded-xl font-medium hover:bg-orange-200 transition-colors"
                                        >
                                            <RotateCcw size={18} /> {t('users.rebootShort') || 'Reboot'}
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
