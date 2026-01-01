
'use client';
import { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Gauge, Save } from 'lucide-react';

export default function ProfilesPage() {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', price: 0, speedUp: 1024, speedDown: 2048, description: '' });

    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        // Fetch User Role logic (or get from session)
        fetch('/api/auth/me').then(res => res.json()).then(data => setUserRole(data.user.role));
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        const res = await fetch('/api/profiles');
        if (res.ok) setProfiles(await res.json());
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if (res.ok) {
            setShowModal(false);
            setForm({ name: '', price: 0, speedUp: 1024, speedDown: 2048, description: '' });
            fetchProfiles();
        } else {
            alert('Failed to create profile. Only Superadmin can create profiles.');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Gauge className="text-purple-600" /> Bandwidth Profiles
                </h1>

                {/* Only Superadmin can Add */}
                {userRole === 'superadmin' && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-purple-700"
                    >
                        <Plus size={18} /> Add Profile
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profiles.map(p => (
                    <div key={p.id} className="bg-white rounded-xl shadow p-6 border border-gray-100 flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 bg-purple-100 text-purple-700 px-3 py-1 text-xs font-bold rounded-bl-lg">
                            Rp {p.price.toLocaleString()}
                        </div>

                        <h3 className="text-lg font-bold mb-2">{p.name}</h3>
                        <p className="text-gray-500 text-sm mb-4">{p.description || "No description"}</p>

                        <div className="flex items-center gap-4 text-sm font-medium text-gray-700 mb-4 bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Down: {p.speedDown} Kbps
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                Up: {p.speedUp} Kbps
                                Up: {p.speedUp} Kbps
                            </div>
                        </div>

                        {/* Delete Button - Superadmin Only */}
                        {userRole === 'superadmin' && (
                            <button
                                onClick={async () => {
                                    if (confirm('Delete this profile?')) {
                                        await fetch(`/api/profiles?id=${p.id}`, { method: 'DELETE' });
                                        fetchProfiles();
                                    }
                                }}
                                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Create New Profile</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Profile Name</label>
                                <input
                                    required
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="e.g. 5MBPS-HOME"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
                                />
                                <p className="text-xs text-gray-500 mt-1">Used as Radius Group Name (No spaces recommended)</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Download (Kbps)</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded px-3 py-2"
                                        value={form.speedDown}
                                        onChange={e => setForm({ ...form, speedDown: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Upload (Kbps)</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded px-3 py-2"
                                        value={form.speedUp}
                                        onChange={e => setForm({ ...form, speedUp: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Price (IDR)</label>
                                <input
                                    type="number"
                                    className="w-full border rounded px-3 py-2"
                                    value={form.price}
                                    onChange={e => setForm({ ...form, price: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    className="w-full border rounded px-3 py-2"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
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
                                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                                >
                                    Save Profile
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
