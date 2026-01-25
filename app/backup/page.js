'use client';

import { useState, useEffect } from 'react';
import { Save, Download, RotateCcw, Trash2, ArrowLeft, Database, AlertCircle, Upload } from 'lucide-react';
import Link from 'next/link';

export default function BackupPage() {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [confirmRestore, setConfirmRestore] = useState(null);

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user?.role !== 'superadmin') {
                    window.location.href = '/';
                } else {
                    fetchBackups();
                }
            })
            .catch(() => window.location.href = '/');
    }, []);

    const fetchBackups = async () => {
        try {
            const res = await fetch('/api/backup');
            if (res.ok) {
                const data = await res.json();
                setBackups(data);
            }
        } catch (error) {
            console.error('Failed to fetch backups', error);
        }
    };

    const handleCreateBackup = async () => {
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/backup', {
                method: 'POST',
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Backup created successfully!' });
                await fetchBackups();
            } else {
                setMessage({ type: 'error', text: 'Failed to create backup' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error creating backup' });
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setMessage({ type: '', text: '' });

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/backup/upload', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Backup uploaded successfully!' });
                await fetchBackups();
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error || 'Failed to upload backup' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error uploading backup' });
        } finally {
            setLoading(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleDownload = (filename) => {
        window.open(`/api/backup/${filename}`, '_blank');
    };

    const handleRestore = async (filename) => {
        setLoading(true);
        setMessage({ type: '', text: '' });
        setConfirmRestore(null);

        try {
            const res = await fetch(`/api/backup/${filename}`, {
                method: 'POST',
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Backup restored successfully! Refreshing...' });
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                setMessage({ type: 'error', text: 'Failed to restore backup' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error restoring backup' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (filename) => {
        setLoading(true);
        setMessage({ type: '', text: '' });
        setConfirmDelete(null);

        try {
            const res = await fetch(`/api/backup/${filename}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Backup deleted successfully!' });
                await fetchBackups();
            } else {
                setMessage({ type: 'error', text: 'Failed to delete backup' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error deleting backup' });
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/settings" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Backup & Restore</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kelola backup data aplikasi Anda</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <label className="cursor-pointer w-full md:w-auto flex items-center justify-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
                        <Upload size={18} />
                        <span>Upload Backup</span>
                        <input
                            type="file"
                            accept=".zip"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={loading}
                        />
                    </label>
                    <button
                        onClick={handleCreateBackup}
                        disabled={loading}
                        className="w-full md:w-auto flex items-center justify-center gap-2 bg-accent text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:bg-gray-400 disabled:dark:bg-gray-600 transition-all shadow-lg shadow-accent/30"
                    >
                        <Database size={18} />
                        {loading ? 'Creating...' : 'Create Backup'}
                    </button>
                </div>
            </div>

            {message.text && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                    <div className="flex items-center gap-2">
                        <AlertCircle size={18} />
                        {message.text}
                    </div>
                </div>
            )}

            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl overflow-hidden border border-white/20 dark:border-white/5">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Available Backups</h2>

                    {backups.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <Database size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No backups available</p>
                            <p className="text-sm mt-2">Create your first backup to get started</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-black/5 dark:bg-white/5">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Filename
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Date Created
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Size
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-transparent divide-y divide-gray-200/50 dark:divide-white/10">
                                    {backups.map((backup) => (
                                        <tr key={backup.filename} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                {backup.filename}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {formatDate(backup.date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {formatSize(backup.size)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleDownload(backup.filename)}
                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                        title="Download"
                                                    >
                                                        <Download size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmRestore(backup.filename)}
                                                        disabled={loading}
                                                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors disabled:opacity-50"
                                                        title="Restore"
                                                    >
                                                        <RotateCcw size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDelete(backup.filename)}
                                                        disabled={loading}
                                                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Dialogs */}
            {confirmRestore && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl border border-white/20 dark:border-white/10">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Restore</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Are you sure you want to restore from this backup? Current data will be replaced.
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            <strong>Note:</strong> A safety backup of current state will be created automatically.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setConfirmRestore(null)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleRestore(confirmRestore)}
                                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-500/30"
                            >
                                Restore
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDelete && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Are you sure you want to delete this backup? This action cannot be undone.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDelete)}
                                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
