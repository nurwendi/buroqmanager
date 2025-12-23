'use client';

import { useState, useEffect } from 'react';
import { Edit2, Plus, Trash2, Shield, ShieldAlert, User } from 'lucide-react';

export default function SystemUsersPage() {
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
        role: 'viewer',
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
                setError(data.error || 'Operation failed');
            }
        } catch (error) {
            setError('Failed to save user');
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
                alert('Failed to delete user');
            }
        } catch (error) {
            console.error('Failed to delete user', error);
            alert('Failed to delete user');
        }
    };

    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            role: 'viewer',
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
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">System Users</h1>
                <button
                    onClick={() => {
                        setEditMode(false);
                        const defaultRole = currentUserRole === 'superadmin' ? 'admin' : 'viewer';
                        setFormData({ username: '', password: '', role: defaultRole, isAgent: false, isTechnician: false, agentRate: 0, technicianRate: 0, prefix: '' });
                        setShowModal(true);
                    }}
                    className="w-full md:w-auto bg-accent text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                >
                    <Plus size={20} /> Add User
                </button>
            </div>

            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl overflow-hidden border border-white/20 dark:border-white/5">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-black/5 dark:bg-white/5">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Business Roles</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rates</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created At</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-transparent divide-y divide-gray-200/50 dark:divide-white/10">
                        {loading ? (
                            <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">Loading...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No users found</td></tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                                                <User size={20} className="text-gray-600 dark:text-gray-300" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{user.username}</div>
                                                {user.fullName && <div className="text-xs text-gray-500 dark:text-gray-400">{user.fullName}</div>}
                                                {user.phone && <div className="text-xs text-gray-500 dark:text-gray-400">{user.phone}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex gap-2">
                                            {user.isAgent && (
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                    Agent
                                                </span>
                                            )}
                                            {user.isTechnician && (
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                                    Tech
                                                </span>
                                            )}
                                            {!user.isAgent && !user.isTechnician && (
                                                <span className="text-gray-400 dark:text-gray-500">-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 text-sm">
                                        <div className="flex flex-col gap-1">
                                            {user.isAgent && (
                                                <span className="text-xs">Agent: {user.agentRate}%</span>
                                            )}
                                            {user.isTechnician && (
                                                <span className="text-xs">Tech: {user.technicianRate}%</span>
                                            )}
                                            {!user.isAgent && !user.isTechnician && (
                                                <span className="text-gray-400 dark:text-gray-500">-</span>
                                            )}
                                            {user.prefix && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">Prefix: {user.prefix}</span>
                                            )}
                                            {user.agentNumber && (
                                                <span className="text-xs text-blue-600">ID: {user.agentNumber}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                title="Edit User"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            {user.username !== 'admin' && (
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    title="Delete User"
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

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl p-6 pb-24 rounded-lg w-full max-w-md shadow-2xl border border-white/20 dark:border-white/10 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                            {editMode ? 'Edit User' : 'Add New User'}
                        </h2>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50/30 dark:bg-red-900/30 backdrop-blur-xl border border-red-200/50 dark:border-red-800/50 text-red-700 dark:text-red-300 rounded text-sm flex items-center gap-2 shadow-lg">
                                <ShieldAlert size={16} />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Username</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.username ?? ''}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                                        disabled={editMode && currentUserRole !== 'admin' && currentUserRole !== 'superadmin'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.fullName ?? ''}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Phone</label>
                                        <input
                                            type="text"
                                            value={formData.phone ?? ''}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            placeholder="08123456789"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Agent Number</label>
                                        <input
                                            type="text"
                                            value={formData.agentNumber ?? ''}
                                            onChange={(e) => setFormData({ ...formData, agentNumber: e.target.value })}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            placeholder="AG-001"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Address</label>
                                    <textarea
                                        value={formData.address ?? ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="Full address..."
                                        rows="2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                        Password {editMode && <span className="text-gray-500 dark:text-gray-400 text-xs">(leave blank to keep current)</span>}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editMode}
                                        value={formData.password ?? ''}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">System Role</label>
                                    <select
                                        value={formData.role ?? (currentUserRole === 'superadmin' ? 'admin' : 'viewer')}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        disabled={currentUserRole === 'superadmin'} // Superadmin only creates Admin, so lock it? Or just show 1 option.
                                    >
                                        {currentUserRole === 'superadmin' ? (
                                            <>
                                                <option value="admin">Admin (Owner)</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="manager">Manager (No System Users)</option>
                                                <option value="editor">Editor (Can Edit)</option>
                                                <option value="staff">Staff (Agent/Technician)</option>
                                                <option value="viewer">Viewer (Read Only)</option>
                                            </>
                                        )}
                                    </select>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {currentUserRole === 'superadmin'
                                            ? "Superadmin can only create Admins (Owners)."
                                            : "Admins manage operational roles."}
                                    </p>
                                </div>

                                <div className="mb-6 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Business Roles</h3>

                                    {/* Agent Role Checkbox */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex items-center h-5">
                                            <input
                                                id="isAgent"
                                                type="checkbox"
                                                checked={formData.isAgent ?? false}
                                                onChange={(e) => setFormData({ ...formData, isAgent: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 accent-blue-600"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label htmlFor="isAgent" className="text-sm text-gray-700 dark:text-gray-300">Is Agent</label>
                                            {formData.isAgent && (
                                                <div className="mt-2">
                                                    <label className="block text-xs font-medium mb-1 text-gray-500">Agent Commission Rate (%)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={formData.agentRate ?? 0}
                                                        onChange={(e) => setFormData({ ...formData, agentRate: Number(e.target.value) })}
                                                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                                                    />
                                                </div>
                                            )}
                                            {formData.isAgent && (
                                                <div className="hidden"></div>
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
                                                className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 accent-blue-600"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label htmlFor="isTechnician" className="text-sm text-gray-700 dark:text-gray-300">Is Technician</label>
                                            {formData.isTechnician && (
                                                <div className="mt-2">
                                                    <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Technician Commission Rate (%)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={formData.technicianRate ?? 0}
                                                        onChange={(e) => setFormData({ ...formData, technicianRate: Number(e.target.value) })}
                                                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
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
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-accent text-white rounded hover:opacity-90 transition-all"
                                >
                                    {editMode ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl p-6 rounded-lg w-full max-w-sm shadow-2xl border border-white/20 dark:border-white/10">
                        <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
                            <ShieldAlert size={24} />
                            <h2 className="text-xl font-bold">Delete User?</h2>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete user <span className="font-semibold text-gray-900 dark:text-white">{userToDelete?.username}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setUserToDelete(null);
                                }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
