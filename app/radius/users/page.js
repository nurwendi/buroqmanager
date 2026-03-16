
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

    const filteredUsers = users.filter(u => (u.username || '').toLowerCase().includes((search || '').toLowerCase()));

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-white drop-shadow-md">
                    <Users className="text-blue-400" /> Radius Users
                </h1>

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-white/50" size={18} />
                        <input
                            className="pl-10 pr-4 py-2 border border-white/20 rounded-lg w-full md:w-64 bg-white/5 backdrop-blur-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-white/30"
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

            <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-xl shadow-xl overflow-hidden border border-white/20">
                <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="p-4 font-semibold text-white/70">Username</th>
                            <th className="p-4 font-semibold text-white/70">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="2" className="p-4 text-center text-white/50">Loading...</td></tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr><td colSpan="2" className="p-4 text-center text-white/50">No users found.</td></tr>
                        ) : (
                            filteredUsers.map((u, i) => (
                                <tr key={i} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-medium text-white">{u.username}</td>
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
                <div className="p-4 bg-white/5 text-xs text-white/40 text-center border-t border-white/10">
                    Showing first 100 users (Optimization required for 100k+)
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-md p-4">
                    <div className="bg-white/10 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl w-full max-w-md shadow-2xl border border-white/20">
                        <h2 className="text-xl font-bold mb-4 text-white">Add New Radius User</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-white/80">Username</label>
                                <input
                                    required
                                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    value={form.username}
                                    onChange={e => setForm({ ...form, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-white/80">Password</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-white/80">Framed-IP-Address (Optional)</label>
                                <input
                                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="10.5.50.2"
                                    value={form.ipAddress}
                                    onChange={e => setForm({ ...form, ipAddress: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6 border-t border-white/10 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-white/70 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
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
