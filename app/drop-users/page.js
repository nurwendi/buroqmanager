
'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

export default function DropUsersPage() {
    const [activeTab, setActiveTab] = useState('unpaid'); // 'unpaid' or 'dropped'
    const [usersToDrop, setUsersToDrop] = useState([]);
    const [droppedUsers, setDroppedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/drop-users');
            const data = await res.json();
            if (data.usersToDrop) setUsersToDrop(data.usersToDrop);
            if (data.droppedUsers) setDroppedUsers(data.droppedUsers);
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Failed to fetch data', error);
            alert('Gagal mengambil data user.');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (e, list) => {
        if (e.target.checked) {
            setSelectedIds(new Set(list.map(u => u.username)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (username) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(username)) {
            newSelected.delete(username);
        } else {
            newSelected.add(username);
        }
        setSelectedIds(newSelected);
    };

    const handleProcess = async (action) => {
        const list = action === 'drop' ? usersToDrop : droppedUsers;
        const selectedUsers = list.filter(u => selectedIds.has(u.username));

        if (selectedUsers.length === 0) return;

        if (!confirm(`Apakah Anda yakin ingin melakukan ${action.toUpperCase()} pada ${selectedUsers.length} user?`)) return;

        setProcessing(true);
        try {
            const res = await fetch('/api/drop-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    users: selectedUsers
                })
            });
            const result = await res.json();

            if (result.success) {
                alert(`Berhasil memproses ${result.results.length} user.`);
                fetchData();
            } else {
                alert('Terjadi kesalahan: ' + result.error);
            }
        } catch (error) {
            console.error('Process failed', error);
            alert('Gagal memproses permintaan.');
        } finally {
            setProcessing(false);
        }
    };

    const renderTable = (data, type) => (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left">
                                <input
                                    type="checkbox"
                                    onChange={(e) => handleSelectAll(e, data)}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Username</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{type === 'drop' ? 'Current Profile' : 'Original Profile'}</th>
                            {type === 'drop' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name (DB)</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">Tidak ada data.</td>
                            </tr>
                        ) : (
                            data.map((user) => (
                                <tr key={user.username} className={selectedIds.has(user.username) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(user.username)}
                                            onChange={() => handleSelectOne(user.username)}
                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        {type === 'drop' ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                {user.currentProfile}
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                {user.originalProfile}
                                            </span>
                                        )}
                                    </td>
                                    {type === 'drop' && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.name}</td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <ShieldAlert className="w-8 h-8 mr-2 text-red-600" />
                        Manajemen Isolir (Drop Users)
                    </h1>
                    <button onClick={fetchData} className="p-2 bg-white dark:bg-gray-800 rounded-full shadow hover:bg-gray-100 transition-colors">
                        <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => { setActiveTab('unpaid'); setSelectedIds(new Set()); }}
                        className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === 'unpaid'
                                ? 'text-red-600 border-b-2 border-red-600'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                    >
                        <div className="flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Belum Bayar (Perlu Isolir)
                            <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
                                {usersToDrop.length}
                            </span>
                        </div>
                    </button>
                    <button
                        onClick={() => { setActiveTab('dropped'); setSelectedIds(new Set()); }}
                        className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === 'dropped'
                                ? 'text-green-600 border-b-2 border-green-600'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                    >
                        <div className="flex items-center">
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            Sedang Diisolir (Dropped)
                            <span className="ml-2 bg-green-100 text-green-600 py-0.5 px-2 rounded-full text-xs">
                                {droppedUsers.length}
                            </span>
                        </div>
                    </button>
                </div>

                {/* Toolbar */}
                {selectedIds.size > 0 && (
                    <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center justify-between animate-fade-in-up">
                        <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                            {selectedIds.size} user terpilih
                        </span>
                        <div className="flex space-x-2">
                            {activeTab === 'unpaid' ? (
                                <button
                                    onClick={() => handleProcess('drop')}
                                    disabled={processing}
                                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                >
                                    {processing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                                    DROP (Isolir)
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleProcess('restore')}
                                    disabled={processing}
                                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                >
                                    {processing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                    RESTORE (Kembalikan)
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Content */}
                {loading && usersToDrop.length === 0 && droppedUsers.length === 0 ? (
                    <div className="text-center py-12">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500">Memuat data...</p>
                    </div>
                ) : (
                    activeTab === 'unpaid' ? renderTable(usersToDrop, 'drop') : renderTable(droppedUsers, 'restore')
                )}
            </div>
        </div>
    );
}
