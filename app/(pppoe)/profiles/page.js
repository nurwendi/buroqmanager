'use client';
import { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Gauge, Save, Edit2, Search } from 'lucide-react';

export default function ProfilesPage() {
    const [profiles, setProfiles] = useState([]);
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [form, setForm] = useState({
        id: null,
        name: '',
        price: 0,
        speedUp: 1024,
        speedDown: 2048,
        localAddress: '',
        remoteAddress: '',
        comment: ''
    });
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        fetch('/api/auth/me').then(res => res.json()).then(data => setUserRole(data.user.role));
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [profilesRes, poolsRes] = await Promise.all([
                fetch('/api/pppoe/profiles'),
                fetch('/api/ip/pools')
            ]);

            if (profilesRes.ok) {
                const data = await profilesRes.json();
                // Parse rate-limit for display
                const parsed = data.map(p => {
                    let down = 0, up = 0;
                    if (p['rate-limit']) {
                        const parts = p['rate-limit'].split('/');
                        if (parts.length >= 1) up = parseSpeed(parts[0]);
                        if (parts.length >= 2) down = parseSpeed(parts[1]);
                    }
                    return {
                        ...p,
                        speedUp: up,
                        speedDown: down,
                        localAddress: p['local-address'] || '',
                        remoteAddress: p['remote-address'] || ''
                    };
                });
                setProfiles(parsed);
            }

            if (poolsRes.ok) {
                setPools(await poolsRes.json());
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const parseSpeed = (str) => {
        if (!str) return 0;
        str = str.toLowerCase();
        if (str.endsWith('m')) return parseFloat(str) * 1024;
        if (str.endsWith('k')) return parseFloat(str);
        return parseFloat(str) / 1024; // assume bits if no suffix? usually k/M in Mikrotik
    };

    const handleEdit = (profile) => {
        setForm({
            id: profile['.id'],
            name: profile.name,
            price: parseInt(profile.price) || 0,
            speedUp: profile.speedUp,
            speedDown: profile.speedDown,
            localAddress: profile.localAddress || '',
            remoteAddress: profile.remoteAddress || '',
            comment: profile.comment || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Construct rate-limit string (k for kbps is standard)
        const rateLimit = `${form.speedUp}k/${form.speedDown}k`;

        const method = form.id ? 'PATCH' : 'POST';
        const body = {
            name: form.name,
            price: form.price,
            rateLimit: rateLimit,
            localAddress: form.localAddress,
            remoteAddress: form.remoteAddress,
            comment: `price:${form.price}`
        };
        if (form.id) body.id = form.id;

        const res = await fetch('/api/pppoe/profiles', {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            setShowModal(false);
            setForm({ id: null, name: '', price: 0, speedUp: 1024, speedDown: 2048, localAddress: '', remoteAddress: '', comment: '' });
            fetchData();
        } else {
            const err = await res.json();
            alert('Failed to save profile: ' + (err.error || 'Unknown error'));
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Delete profile ${name}? This may disconnect users using it.`)) return;
        try {
            // Pass .id (Mikrotik ID) if available, else name
            const params = new URLSearchParams();
            if (id) params.append('id', id);
            if (name) params.append('name', name);

            const res = await fetch(`/api/pppoe/profiles?${params.toString()}`, { method: 'DELETE' });
            if (res.ok) {
                fetchData();
            } else {
                const err = await res.json();
                alert('Failed to delete: ' + err.error);
            }
        } catch (e) {
            alert('Error: ' + e.message);
        }
    };

    const filteredProfiles = profiles.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Gauge className="text-purple-600" /> Bandwidth Profiles
                </h1>

                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search profiles..."
                            className="pl-10 pr-4 py-2 border rounded-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {['superadmin', 'admin', 'manager'].includes(userRole) && (
                        <button
                            onClick={() => {
                                setForm({ id: null, name: '', price: 0, speedUp: 1024, speedDown: 2048, localAddress: '', remoteAddress: '', comment: '' });
                                setShowModal(true);
                            }}
                            className="bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-purple-700"
                        >
                            <Plus size={18} /> Add Profile
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">Loading profiles...</div>
            ) : profiles.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No profiles found on the router.</div>
            ) : (
                <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate Limit (Up/Down)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address Pool</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredProfiles.map(p => (
                                <tr key={p['.id'] || p.name} className="hover:bg-gray-50 group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {['superadmin', 'admin', 'manager'].includes(userRole) && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(p)}
                                                    className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p['.id'], p.name)}
                                                    className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-medium text-gray-900">{p.name}</div>
                                        {p.comment && p.comment !== `price:${p.price}` && (
                                            <div className="text-xs text-gray-500">{p.comment.replace(`price:${p.price}`, '')}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col text-sm">
                                            <div className="flex items-center gap-1.5 text-green-600">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                Down: {p.speedDown} Kbps
                                            </div>
                                            <div className="flex items-center gap-1.5 text-blue-600">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                Up: {p.speedUp} Kbps
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                        {p.price ? `Rp ${parseInt(p.price).toLocaleString()}` : <span className="text-gray-400 italic">No Price</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {(p.localAddress || p.remoteAddress) ? (
                                            <div className="flex flex-col gap-0.5">
                                                {p.localAddress && <div><span className="text-xs text-gray-400">Local:</span> {p.localAddress}</div>}
                                                {p.remoteAddress && <div><span className="text-xs text-gray-400">Remote:</span> {p.remoteAddress}</div>}
                                            </div>
                                        ) : <span className="text-gray-400">-</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl overflow-y-auto max-h-[90vh]">
                        <h2 className="text-xl font-bold mb-4">{form.id ? 'Edit Profile' : 'Create New Profile'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Profile Name</label>
                                <input
                                    required
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="e.g. 10M_HOME"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value.replace(/\s+/g, '_') })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Local Address</label>
                                    <input
                                        type="text"
                                        list="ip-pools"
                                        className="w-full border rounded px-3 py-2"
                                        placeholder="IP or Pool"
                                        value={form.localAddress}
                                        onChange={e => setForm({ ...form, localAddress: e.target.value })}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Gateway IP or Pool</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Remote Address</label>
                                    <input
                                        type="text"
                                        list="ip-pools"
                                        className="w-full border rounded px-3 py-2"
                                        placeholder="IP or Pool"
                                        value={form.remoteAddress}
                                        onChange={e => setForm({ ...form, remoteAddress: e.target.value })}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Client IP or Pool</p>
                                </div>
                            </div>

                            <datalist id="ip-pools">
                                {pools.map(pool => (
                                    <option key={pool['.id'] || pool.name} value={pool.name}>{pool.ranges}</option>
                                ))}
                            </datalist>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Download (Kbps)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full border rounded px-3 py-2"
                                        value={form.speedDown}
                                        onChange={e => setForm({ ...form, speedDown: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Upload (Kbps)</label>
                                    <input
                                        type="number"
                                        required
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
                                    required
                                    className="w-full border rounded px-3 py-2"
                                    value={form.price}
                                    onChange={e => setForm({ ...form, price: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">Saved in comment as "price:XXXX"</p>
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
                                    {form.id ? 'Update Profile' : 'Save to Router'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
