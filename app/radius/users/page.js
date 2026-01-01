
'use client';
import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Search } from 'lucide-react';

export default function RadiusUsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);

    const [form, setForm] = useState({
        username: '',
        password: '',
        ipAddress: '' // Will be mapped to Framed-IP-Address
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/radius/users');
            if (res.ok) setUsers(await res.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const attributes = [];
        if (form.ipAddress) {
            attributes.push({ name: 'Framed-IP-Address', value: form.ipAddress, op: '=' });
        }

        const res = await fetch('/api/radius/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: form.username,
                password: form.password,
                attributes
            })
        });

        if (res.ok) {
            setShowModal(false);
            setForm({ username: '', password: '', ipAddress: '' });
            fetchUsers();
        } else {
            alert('Failed to create user');
        }
    };

    const handleDelete = async (username) => {
        if (!confirm(`Delete user ${username}?`)) return;
        await fetch(`/api/radius/users?username=${username}`, { method: 'DELETE' });
        fetchUsers();
    }

    const filteredUsers = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users /> Radius Users
                </h1>

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            className="pl-10 pr-4 py-2 border rounded-lg w-full md:w-64"
                            placeholder="Search username..."
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 whitespace-nowrap"
                    >
                        <Plus size={18} /> Add User
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-gray-700">Username</th>
                            <th className="p-4 font-semibold text-gray-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="2" className="p-4 text-center">Loading...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan="2" className="p-4 text-center text-gray-500">No users found.</td></tr>
                        ) : (
                            filteredUsers.map((u, i) => (
                                <tr key={i} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-medium">{u.username}</td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => handleDelete(u.username)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <div className="p-4 bg-gray-50 text-xs text-gray-500 text-center">
                    Showing first 100 users (Optimization required for 100k+)
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Add New Radius User</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Username</label>
                                <input
                                    required
                                    className="w-full border rounded px-3 py-2"
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Password</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full border rounded px-3 py-2 font-mono"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Framed-IP-Address (Optional)</label>
                                <input
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="10.5.50.2"
                                    value={form.ipAddress}
                                    onChange={e => setForm({ ...form, ipAddress: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
