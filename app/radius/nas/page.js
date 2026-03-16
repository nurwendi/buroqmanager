
'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Server, Save } from 'lucide-react';

export default function NasPage() {
    const [nasList, setNasList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ nasname: '', secret: '', shortname: '', description: '' });

    useEffect(() => {
        fetchNas();
    }, []);

    const fetchNas = async () => {
        const res = await fetch('/api/radius/nas');
        if (res.ok) setNasList(await res.json());
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/radius/nas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if (res.ok) {
            setShowModal(false);
            setForm({ nasname: '', secret: '', shortname: '', description: '' });
            fetchNas();
        } else {
            alert('Failed to add NAS');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-white drop-shadow-md">
                    <Server className="text-blue-400" /> NAS List (Network Access Servers)
                </h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
                >
                    <Plus size={18} /> Add NAS
                </button>
            </div>

            <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-xl shadow-xl overflow-hidden border border-white/20">
                <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="p-4 font-semibold text-white/70">NAS IP (nasname)</th>
                            <th className="p-4 font-semibold text-white/70">Shortname</th>
                            <th className="p-4 font-semibold text-white/70">Secret</th>
                            <th className="p-4 font-semibold text-white/70">Description</th>
                            <th className="p-4 font-semibold text-white/70">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="p-4 text-center text-white/50">Loading...</td></tr>
                        ) : nasList.length === 0 ? (
                            <tr><td colSpan="5" className="p-4 text-center text-white/50">No NAS found.</td></tr>
                        ) : (
                            nasList.map(nas => (
                                <tr key={nas.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-mono text-blue-400">{nas.nasname}</td>
                                    <td className="p-4 text-white/80">{nas.shortname || '-'}</td>
                                    <td className="p-4">
                                        <span className="font-mono bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-sm text-blue-300 backdrop-blur-md">
                                            {nas.secret}
                                        </span>
                                    </td>
                                    <td className="p-4 text-white/40">{nas.description || '-'}</td>
                                    <td className="p-4">
                                        <button className="text-red-400 hover:text-red-600 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-md p-4">
                    <div className="bg-white/10 dark:bg-black/40 backdrop-blur-xl p-6 rounded-2xl w-full max-w-md shadow-2xl border border-white/20">
                        <h2 className="text-xl font-bold mb-4 text-white">Add New NAS</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-white/80">NAS IP Address</label>
                                <input
                                    required
                                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="192.168.1.1"
                                    value={form.nasname}
                                    onChange={e => setForm({ ...form, nasname: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-white/80">Secret</label>
                                <input
                                    required
                                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="radius-secret"
                                    value={form.secret}
                                    onChange={e => setForm({ ...form, secret: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-white/80">Shortname (Optional)</label>
                                <input
                                    className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="mikrotik-pusat"
                                    value={form.shortname}
                                    onChange={e => setForm({ ...form, shortname: e.target.value })}
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
                                    Save NAS
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
