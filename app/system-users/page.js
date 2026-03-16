'use client';

import { useState, useEffect } from 'react';
import { Edit2, Plus, Trash2, Shield, ShieldAlert, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SystemUsersPage() {
    const { t, resolvedLanguage } = useLanguage();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'staff',
        isAgent: false,
        isTechnician: false,
        agentRate: 0,
        technicianRate: 0,
        prefix: '',
        fullName: '',
        phone: '',
        address: '',
        agentNumber: ''
    });
    const [error, setError] = useState('');

    const [currentUserRole, setCurrentUserRole] = useState(null);

    useEffect(() => {
        fetchUsers();
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => setCurrentUserRole(data.user.role))
            .catch(err => console.error('Failed to fetch user role', err));
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const url = editMode ? `/api/admin/users/${selectedUser.id}` : '/api/admin/users';
            const method = editMode ? 'PUT' : 'POST';

            const body = { ...formData };
            if (editMode && !body.password) {
                delete body.password;
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (res.ok) {
                setShowModal(false);
                resetForm();
                fetchUsers();
            } else {
                setError(data.error || t('messages.unknownError'));
            }
        } catch (error) {
            setError(t('messages.errorSavingUser'));
        }
    };

    const handleEdit = (user) => {
        setSelectedUser(user);
        setFormData({
            username: user.username || '',
            password: '',
            role: user.role || 'viewer',
            isAgent: user.isAgent || false,
            isTechnician: user.isTechnician || false,
            agentRate: user.agentRate || 0,
            technicianRate: user.technicianRate || 0,
            prefix: user.prefix || '',
            fullName: user.fullName || '',
            phone: user.phone || '',
            address: user.address || '',
            agentNumber: user.agentNumber || ''
        });
        setEditMode(true);
        setShowModal(true);
        setError('');
    };

    const handleDelete = (user) => {
        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        try {
            const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setShowDeleteModal(false);
                setUserToDelete(null);
                fetchUsers();
            } else {
                alert(t('messages.failedToDeleteUser'));
            }
        } catch (error) {
            console.error('Failed to delete user', error);
            alert(t('messages.failedToDeleteUser'));
        }
    };

    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            role: 'staff',
            isAgent: false,
            isTechnician: false,
            agentRate: 0,
            technicianRate: 0,
            prefix: '',
            fullName: '',
            phone: '',
            address: '',
            agentNumber: ''
        });
        setEditMode(false);
        setSelectedUser(null);
        setError('');
    };

    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-800';
            case 'manager': return 'bg-teal-100 text-teal-800';
            case 'editor': return 'bg-blue-100 text-blue-800';
            case 'staff': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-md">{t('systemUsers.title')}</h1>
                <button
                    onClick={() => {
                        setEditMode(false);
                        const defaultRole = currentUserRole === 'superadmin' ? 'admin' : 'staff';
                        setFormData({ username: '', password: '', role: defaultRole, isAgent: false, isTechnician: false, agentRate: 0, technicianRate: 0, prefix: '' });
                        setShowModal(true);
                    }}
                    className="w-full md:w-auto bg-accent text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all font-medium shadow-lg shadow-accent/20"
                >
                    <Plus size={20} /> {t('systemUsers.addUser')}
                </button>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-lg shadow-2xl overflow-hidden border border-white/20">
                {/* Mobile Card View */}
                <div className="md:hidden p-4 flex flex-col gap-3">
                    {loading ? (
                        <div className="text-center py-4 text-white/60 font-medium">{t('messages.loading')}</div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-4 text-white/60 font-medium">{t('systemUsers.noUsers')}</div>
                    ) : (
                        users.map((user) => (
                            <div
                                key={user.id}
                                className="rounded-xl p-3 bg-white/5 border border-white/10 shadow-lg"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-400/20 p-2 rounded-lg border border-white/10">
                                            <User size={18} className="text-blue-300" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-[15px]">{user.username}</div>
                                            {user.fullName && <div className="text-[11px] text-blue-100 font-bold">{user.fullName}</div>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="p-1.5 bg-white/10 text-blue-300 rounded-lg hover:bg-white/20 border border-white/10 transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        {user.username !== 'admin' && (
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="p-1.5 bg-red-400/10 text-red-300 rounded-lg hover:bg-red-400/20 border border-white/10 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 mb-3">
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${getRoleBadgeColor(user.role).replace('text-', 'text-Opacity-').replace('bg-', 'bg-opacity-20 ')} bg-white/10 text-white border border-white/10`}>
                                        {user.role === 'admin' ? t('systemUsers.adminOwner') :
                                            user.role === 'manager' ? t('systemUsers.managerNoUsers') :
                                                user.role === 'editor' ? t('systemUsers.editorCanEdit') :
                                                    user.role === 'staff' ? t('systemUsers.staffAgentTech') :
                                                        user.role === 'viewer' ? t('systemUsers.viewerReadOnly') : user.role}
                                    </span>
                                    {user.isAgent && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-400/10 text-green-300 border border-white/10">
                                            {t('systemUsers.agent')}
                                        </span>
                                    )}
                                    {user.isTechnician && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-400/10 text-indigo-300 border border-white/10">
                                            {t('systemUsers.tech')}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    {user.isAgent && (
                                        <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                                            <p className="text-[9px] text-green-300/60 uppercase font-bold mb-0.5">{t('systemUsers.agent')} Rate</p>
                                            <p className="text-[13px] font-mono font-bold text-green-300">{user.agentRate}%</p>
                                        </div>
                                    )}
                                    {user.isTechnician && (
                                        <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                                            <p className="text-[9px] text-indigo-300/60 uppercase font-bold mb-0.5">{t('systemUsers.tech')} Rate</p>
                                            <p className="text-[13px] font-mono font-bold text-indigo-300">{user.technicianRate}%</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pt-2.5 border-t border-white/10">
                                    {user.phone ? (
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-blue-100 uppercase tracking-wider font-bold">{t('systemUsers.phone')}</span>
                                            <span className="text-[11px] font-bold text-white">{user.phone}</span>
                                        </div>
                                    ) : <div></div>}
                                    <div className="text-right flex flex-col">
                                        <span className="text-[9px] text-blue-100 uppercase tracking-wider font-bold">{t('systemUsers.createdAt')}</span>
                                        <span className="text-[11px] font-bold text-white">
                                            {new Date(user.createdAt).toLocaleDateString(resolvedLanguage === 'id' ? 'id-ID' : 'en-US')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-blue-100 uppercase tracking-wider">{t('systemUsers.username')}</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-blue-100 uppercase tracking-wider">{t('systemUsers.role')}</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-blue-100 uppercase tracking-wider">{t('systemUsers.businessRoles')}</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-blue-100 uppercase tracking-wider">{t('systemUsers.rates')}</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-blue-100 uppercase tracking-wider">{t('systemUsers.createdAt')}</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-blue-100 uppercase tracking-wider">{t('systemUsers.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-transparent divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-4 text-center text-white/40">{t('messages.loading')}</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-4 text-center text-white/40">{t('systemUsers.noUsers')}</td></tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white/5 p-2 rounded-full border border-white/5 group-hover:bg-blue-400/20 group-hover:border-blue-400/20 transition-all">
                                                    <User size={20} className="text-white/60 group-hover:text-blue-300 transition-colors" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{user.username}</div>
                                                    {user.fullName && <div className="text-xs text-blue-100 font-bold">{user.fullName}</div>}
                                                    {user.phone && <div className="text-xs text-white/80 font-medium">{user.phone}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role).replace('bg-', 'bg-opacity-20 ')} bg-white/10 text-white border border-white/10`}>
                                                {user.role === 'admin' ? t('systemUsers.adminOwner') :
                                                    user.role === 'manager' ? t('systemUsers.managerNoUsers') :
                                                        user.role === 'editor' ? t('systemUsers.editorCanEdit') :
                                                            user.role === 'staff' ? t('systemUsers.staffAgentTech') :
                                                                user.role === 'viewer' ? t('systemUsers.viewerReadOnly') : user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex gap-2">
                                                {user.isAgent && (
                                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-400/20 text-green-300 border border-white/10">
                                                        {t('systemUsers.agent')}
                                                    </span>
                                                )}
                                                {user.isTechnician && (
                                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-400/20 text-indigo-300 border border-white/10">
                                                        {t('systemUsers.tech')}
                                                    </span>
                                                )}
                                                {!user.isAgent && !user.isTechnician && (
                                                    <span className="text-white/30">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-white/50 text-sm">
                                            <div className="flex flex-col gap-1">
                                                {user.isAgent && (
                                                    <span className="text-xs font-medium text-green-300/80">{t('systemUsers.agent')}: {user.agentRate}%</span>
                                                )}
                                                {user.isTechnician && (
                                                    <span className="text-xs font-medium text-indigo-300/80">{t('systemUsers.tech')}: {user.technicianRate}%</span>
                                                )}
                                                {!user.isAgent && !user.isTechnician && (
                                                    <span className="text-white/30">-</span>
                                                )}
                                                {user.agentNumber && (
                                                    <span className="text-xs text-blue-300 font-bold">{t('systemUsers.id')}: {user.agentNumber}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80 font-medium">
                                            {new Date(user.createdAt).toLocaleDateString(resolvedLanguage === 'id' ? 'id-ID' : 'en-US')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="text-blue-300 hover:text-blue-200 p-1.5 rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                                                    title={t('common.edit')}
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                {user.username !== 'admin' && (
                                                    <button
                                                        onClick={() => handleDelete(user)}
                                                        className="text-red-300 hover:text-red-200 p-1.5 rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                                                        title={t('common.delete')}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-black/80 backdrop-blur-3xl p-6 pb-24 rounded-lg w-full max-w-md shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 text-white">
                            {editMode ? t('systemUsers.editUserTitle') : t('systemUsers.addNewUserTitle')}
                        </h2>

                        {error && (
                            <div className="mb-4 p-3 bg-red-400/20 backdrop-blur-md border border-white/10 text-red-300 rounded text-sm flex items-center gap-2 shadow-xl">
                                <ShieldAlert size={16} />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4 text-white">
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-white">{t('systemUsers.username')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.username ?? ''}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full border border-white/10 rounded p-2 bg-white/5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none disabled:opacity-50"
                                        disabled={editMode && currentUserRole !== 'admin' && currentUserRole !== 'superadmin'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-white">{t('systemUsers.fullName')}</label>
                                    <input
                                        type="text"
                                        value={formData.fullName ?? ''}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full border border-white/10 rounded p-2 bg-white/5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                        placeholder={t('systemUsers.namePlaceholder')}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold mb-1 text-white">{t('systemUsers.phone')}</label>
                                        <input
                                            type="text"
                                            value={formData.phone ?? ''}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full border border-white/10 rounded p-2 bg-white/5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none placeholder-white/60"
                                            placeholder={t('systemUsers.phonePlaceholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1 text-white">{t('systemUsers.agentNumber')}</label>
                                        <input
                                            type="text"
                                            value={formData.agentNumber ?? ''}
                                            onChange={(e) => setFormData({ ...formData, agentNumber: e.target.value })}
                                            className="w-full border border-white/10 rounded p-2 bg-white/5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none placeholder-white/60"
                                            placeholder={t('systemUsers.agentNumberPlaceholder')}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-white">{t('systemUsers.address')}</label>
                                    <textarea
                                        value={formData.address ?? ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full border border-white/10 rounded p-2 bg-white/5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none placeholder-white/60"
                                        placeholder={t('systemUsers.addressPlaceholder')}
                                        rows="2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-white">
                                        {t('systemUsers.password')} {editMode && <span className="text-blue-100 text-xs font-bold">({t('systemUsers.keepBlank')})</span>}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editMode}
                                        value={formData.password ?? ''}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full border border-white/10 rounded p-2 bg-white/5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-white">{t('systemUsers.systemRole')}</label>
                                    <select
                                        value={formData.role ?? (currentUserRole === 'superadmin' ? 'admin' : 'staff')}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full border border-white/10 rounded p-2 bg-white/5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none"
                                        disabled={currentUserRole === 'superadmin'}
                                    >
                                        {currentUserRole === 'superadmin' ? (
                                            <>
                                                <option value="admin">{t('systemUsers.adminOwner')}</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="manager">{t('systemUsers.managerNoUsers')}</option>
                                                <option value="staff">{t('systemUsers.staffAgentTech')}</option>
                                            </>
                                        )}
                                    </select>
                                    <p className="text-xs text-blue-100 font-bold mt-1">
                                        {currentUserRole === 'superadmin'
                                            ? t('systemUsers.superadminInfo')
                                            : t('systemUsers.adminInfo')}
                                    </p>
                                </div>

                                <div className="mb-6 space-y-4 border-t border-white/10 pt-4">
                                    <h3 className="text-sm font-medium text-white">{t('systemUsers.businessRoles')}</h3>

                                    {/* Agent Role Checkbox */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex items-center h-5">
                                            <input
                                                id="isAgent"
                                                type="checkbox"
                                                checked={formData.isAgent ?? false}
                                                onChange={(e) => setFormData({ ...formData, isAgent: e.target.checked })}
                                                className="w-4 h-4 text-blue-500 border-white/20 rounded focus:ring-blue-500 bg-white/5 accent-blue-500"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label htmlFor="isAgent" className="text-sm text-white font-bold">{t('systemUsers.isAgent')}</label>
                                            {formData.isAgent && (
                                                <div className="mt-2">
                                                    <label className="block text-xs font-medium mb-1 text-white/40">{t('systemUsers.commissionRate', { type: t('systemUsers.agent') })}</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={formData.agentRate ?? 0}
                                                        onChange={(e) => setFormData({ ...formData, agentRate: Number(e.target.value) })}
                                                        className="w-full border border-white/10 rounded p-2 bg-white/5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Technician Role Checkbox */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex items-center h-5">
                                            <input
                                                id="isTechnician"
                                                type="checkbox"
                                                checked={formData.isTechnician ?? false}
                                                onChange={(e) => setFormData({ ...formData, isTechnician: e.target.checked })}
                                                className="w-4 h-4 text-blue-500 border-white/20 rounded focus:ring-blue-500 bg-white/5 accent-blue-500"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label htmlFor="isTechnician" className="text-sm text-white font-bold">{t('systemUsers.isTechnician')}</label>
                                            {formData.isTechnician && (
                                                <div className="mt-2">
                                                    <label className="block text-xs font-medium mb-1 text-white/40">{t('systemUsers.commissionRate', { type: t('systemUsers.tech') })}</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={formData.technicianRate ?? 0}
                                                        onChange={(e) => setFormData({ ...formData, technicianRate: Number(e.target.value) })}
                                                        className="w-full border border-white/10 rounded p-2 bg-white/5 text-white focus:ring-2 focus:ring-blue-500/50 outline-none text-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-white/50 hover:bg-white/10 rounded transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-accent text-white rounded hover:opacity-90 transition-all"
                                >
                                    {editMode ? t('systemUsers.update') : t('systemUsers.create')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-black/80 backdrop-blur-3xl p-6 rounded-lg w-full max-w-sm shadow-2xl border border-white/20">
                        <div className="flex items-center gap-3 mb-4 text-red-400">
                            <ShieldAlert size={24} />
                            <h2 className="text-xl font-bold">{t('systemUsers.deleteUser')}</h2>
                        </div>
                        <p className="text-white/60 mb-6">
                            {t('systemUsers.confirmDeleteUser', { name: userToDelete?.username })}
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setUserToDelete(null);
                                }}
                                className="px-4 py-2 text-white/50 hover:bg-white/10 rounded transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                                {t('systemUsers.deleteUser')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
