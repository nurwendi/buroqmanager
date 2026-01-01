
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
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Server /> NAS List (Network Access Servers)
                </h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
                >
                    <Plus size={18} /> Add NAS
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-gray-700">NAS IP (nasname)</th>
                            <th className="p-4 font-semibold text-gray-700">Shortname</th>
                            <th className="p-4 font-semibold text-gray-700">Secret</th>
                            <th className="p-4 font-semibold text-gray-700">Description</th>
                            <th className="p-4 font-semibold text-gray-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="p-4 text-center">Loading...</td></tr>
                        ) : nasList.length === 0 ? (
                            <tr><td colSpan="5" className="p-4 text-center text-gray-500">No NAS found.</td></tr>
                        ) : (
                            nasList.map(nas => (
                                <tr key={nas.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-mono text-blue-600">{nas.nasname}</td>
                                    <td className="p-4">{nas.shortname || '-'}</td>
                                    <td className="p-4 font-mono bg-gray-100 rounded px-2 py-1 text-sm">{nas.secret}</td>
                                    <td className="p-4 text-gray-500">{nas.description || '-'}</td>
                                    <td className="p-4">
                                        <button className="text-red-500 hover:text-red-700">
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Add New NAS</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">NAS IP Address</label>
                                <input
                                    required
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="192.168.1.1"
                                    value={form.nasname}
                                    onChange={e => setForm({ ...form, nasname: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Secret</label>
                                <input
                                    required
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="radius-secret"
                                    value={form.secret}
                                    onChange={e => setForm({ ...form, secret: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Shortname (Optional)</label>
                                <input
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="mikrotik-pusat"
                                    value={form.shortname}
                                    onChange={e => setForm({ ...form, shortname: e.target.value })}
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
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
