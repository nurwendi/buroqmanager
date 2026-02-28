'use client';

import { Edit2, Plus, Trash2, Shield, ShieldAlert, User, Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SystemAdminPage() {
    const { t } = useLanguage();
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Form Data - tailored for Admin (Owner) creation
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'admin', // Hardcoded
        fullName: '',
        phone: '',
        address: '',
        phone: '',
        address: '',
        agentNumber: '', // Auto-generated usually, but editable?
        radiusPool: '', // New field for Radius IP Pool
    });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            const res = await fetch('/api/admin/users?role=admin'); // API might need to support finding ALL admins or filtering on client
            const data = await res.json();
            if (Array.isArray(data)) {
                // Filter client side if API doesn't support query param yet, 
                // but since Superadmin can see all, we can filter here.
                // Or better, let's assume the API returns what we need or filter it.
                // The current API /api/admin/users returns:
                // If Superadmin: All users (including admins and their staff).
                // We only want Admins here.
                const adminList = data.filter(u => u.role === 'admin');
                setAdmins(adminList);
            }
        } catch (error) {
            console.error('Failed to fetch admins', error);
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

            const body = { ...formData, role: 'admin' }; // Enforce role
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
                fetchAdmins();
            } else {
                setError(data.error || t('common.error'));
            }
        } catch (error) {
            setError(t('appSettings.errorManualRun')); // Fallback to a generic error message
        }
    };

    const handleEdit = (user) => {
        setSelectedUser(user);
        setFormData({
            username: user.username || '',
            password: '',
            role: 'admin',
            fullName: user.fullName || '',
            phone: user.phone || '',
            address: user.address || '',
            phone: user.phone || '',
            address: user.address || '',
            agentNumber: user.agentNumber || '',
            radiusPool: user.radiusPool || '',
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
                fetchAdmins();
            } else {
                alert(t('common.error'));
            }
        } catch (error) {
            console.error('Failed to delete admin', error);
            alert(t('common.error'));
        }
    };



    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            role: 'admin',
            fullName: '',
            phone: '',
            address: '',
            phone: '',
            address: '',
            agentNumber: '',
            radiusPool: '',
        });
        setEditMode(false);
        setSelectedUser(null);
        setError('');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t('sidebar.systemUsers')}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('sidebar.owners')}</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30"
                >
                    <Plus size={20} /> {t('common.add')} {t('sidebar.owners')}
                </button>
            </div>

            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl overflow-hidden border border-white/20 dark:border-white/5">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-black/5 dark:bg-white/5">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('common.name')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agent ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('appSettings.phone')}</th>

                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('common.date')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('common.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-transparent divide-y divide-gray-200/50 dark:divide-white/10">
                        {loading ? (
                            <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-500">{t('common.loading')}</td></tr>
                        ) : admins.length === 0 ? (
                            <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-500">{t('common.noData')}</td></tr>
                        ) : (
                            admins.map((admin) => (
                                <tr key={admin.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                                                <Shield size={20} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">{admin.username}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{admin.fullName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
                                            {admin.agentNumber || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col">
                                            <span>{admin.phone || '-'}</span>
                                            <span className="text-xs truncate max-w-[150px]">{admin.address}</span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(admin.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(admin)}
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 p-1"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(admin)}
                                                className="text-red-600 dark:text-red-400 hover:text-red-800 p-1"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

            </div>



            {/* Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl p-6 rounded-lg w-full max-w-md shadow-2xl border border-white/20 dark:border-white/10">
                            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                                {editMode ? t('common.edit') + ' ' + t('sidebar.owners') : t('common.add') + ' ' + t('sidebar.owners')}
                            </h2>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm flex items-center gap-2">
                                    <ShieldAlert size={16} />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('login.username')}</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={editMode}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('appSettings.fullName')}</label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{t('appSettings.phone')}</label>
                                        <input
                                            type="text"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Agent ID (Auto)</label>
                                        <input
                                            type="text"
                                            value={formData.agentNumber}
                                            onChange={(e) => setFormData({ ...formData, agentNumber: e.target.value })}
                                            className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-gray-50 dark:bg-gray-800 text-gray-500"
                                            placeholder="Auto-generated"
                                            readOnly={!editMode} // Usually read-only on create
                                        />
                                    </div>
                                </div>


                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Radius Pool (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.radiusPool}
                                        onChange={(e) => setFormData({ ...formData, radiusPool: e.target.value })}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. pool-tenant-1"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">If set, new users for this admin will automatically get Framed-Pool = [this value]</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                        {t('common.password')} {editMode && <span className="text-gray-500 text-xs">({t('appSettings.leaveBlankToKeep')})</span>}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editMode}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>



                                <div className="pt-4 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        {editMode ? t('common.save') : t('common.submit')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg w-full max-w-sm shadow-xl">
                        <h2 className="text-xl font-bold text-red-600 mb-2">{t('common.confirm')} {t('common.delete')}</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            {t('billing.confirmDelete')} <strong>{userToDelete?.username}</strong>?
                        </p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-gray-600">{t('common.cancel')}</button>
                            <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded">{t('common.delete')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
