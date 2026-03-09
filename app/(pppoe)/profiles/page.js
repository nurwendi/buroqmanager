'use client';
import { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Gauge, Search, Save, Edit2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProfilesPage() {
    const { t, resolvedLanguage } = useLanguage();
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
            alert(t('messages.failedToSaveProfile', { error: err.error || t('messages.unknownError') }));
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(t('messages.confirmDeleteProfile', { name }))) return;
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
                alert(t('messages.failedToDeleteProfile', { error: err.error }));
            }
        } catch (e) {
            alert(t('messages.error') + ': ' + e.message);
        }
    };

    const filteredProfiles = profiles.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Gauge className="text-purple-600" /> {t('profiles.title')}
                </h1>

                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder={t('profiles.searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
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
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
                        >
                            <Plus size={18} /> {t('profiles.addProfile')}
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">{t('messages.loading')}</div>
            ) : profiles.length === 0 ? (
                <div className="text-center py-10 text-gray-500">{t('profiles.noProfiles')}</div>
            ) : (
            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl overflow-hidden border border-white/20 dark:border-white/5">
                {/* Mobile Card View */}
                <div className="md:hidden p-4 flex flex-col gap-3">
                    {filteredProfiles.map(p => (
                        <div
                            key={p['.id'] || p.name}
                            className="rounded-xl p-3 bg-white/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 shadow-sm"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex gap-2 items-center">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                                        <Gauge size={16} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-[15px] leading-tight">{p.name}</h4>
                                        {p.comment && p.comment !== `price:${p.price}` && (
                                            <p className="text-[10px] text-gray-500 mt-0.5">{p.comment.replace(`price:${p.price}`, '')}</p>
                                        )}
                                    </div>
                                </div>
                                {['superadmin', 'admin', 'manager'].includes(userRole) && (
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => handleEdit(p)}
                                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(p['.id'], p.name)}
                                            className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-3 mt-1">
                                <div className="p-2 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-100/50 dark:border-green-800/20">
                                    <p className="text-[9px] text-green-600 dark:text-green-400 uppercase tracking-wider font-bold mb-0.5">{t('profiles.down')}</p>
                                    <p className="text-[13px] font-mono font-bold text-green-700 dark:text-green-300">{p.speedDown} Kbps</p>
                                </div>
                                <div className="p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-800/20">
                                    <p className="text-[9px] text-blue-600 dark:text-blue-400 uppercase tracking-wider font-bold mb-0.5">{t('profiles.up')}</p>
                                    <p className="text-[13px] font-mono font-bold text-blue-700 dark:text-blue-300">{p.speedUp} Kbps</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2.5 border-t border-gray-100 dark:border-gray-700/50">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-gray-400 uppercase tracking-wider">{t('users.price')}</span>
                                    <span className="text-[13px] font-bold text-orange-600 dark:text-orange-400">
                                        {p.price ? `Rp ${parseInt(p.price).toLocaleString(resolvedLanguage === 'id' ? 'id-ID' : 'en-US')}` : t('profiles.noPrice')}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] text-gray-400 uppercase tracking-wider block">{t('profiles.addressPool')}</span>
                                    <span className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
                                        {p.remoteAddress || p.localAddress || '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">{t('users.actions')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('profiles.profileName')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('profiles.rateLimit')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('users.price')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('profiles.addressPool')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {filteredProfiles.map(p => (
                                <tr key={p['.id'] || p.name} className="hover:bg-gray-50 dark:hover:bg-white/5 group transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {['superadmin', 'admin', 'manager'].includes(userRole) && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(p)}
                                                    className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
                                                    title={t('common.edit')}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(p['.id'], p.name)}
                                                    className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                                                    title={t('common.delete')}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-medium">{p.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col text-sm">
                                            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                {t('profiles.down')}: {p.speedDown} Kbps
                                            </div>
                                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                {t('profiles.up')}: {p.speedUp} Kbps
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                        {p.price ? `Rp ${parseInt(p.price).toLocaleString(resolvedLanguage === 'id' ? 'id-ID' : 'en-US')}` : <span className="text-gray-400 italic">{t('profiles.noPrice')}</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                                        {p.remoteAddress || p.localAddress || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl overflow-y-auto max-h-[90vh]">
                        <h2 className="text-xl font-bold mb-4">{form.id ? t('profiles.editProfile') : t('profiles.createProfile')}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('profiles.profileName')}</label>
                                <input
                                    required
                                    className="w-full border rounded px-3 py-2"
                                    placeholder={t('profiles.namePlaceholder')}
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value.replace(/\s+/g, '_') })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('profiles.localAddress')}</label>
                                    <input
                                        type="text"
                                        list="ip-pools"
                                        className="w-full border rounded px-3 py-2"
                                        placeholder={t('profiles.addressPlaceholder')}
                                        value={form.localAddress}
                                        onChange={e => setForm({ ...form, localAddress: e.target.value })}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">{t('profiles.gatewayInfo')}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('profiles.remoteAddress')}</label>
                                    <input
                                        type="text"
                                        list="ip-pools"
                                        className="w-full border rounded px-3 py-2"
                                        placeholder={t('profiles.addressPlaceholder')}
                                        value={form.remoteAddress}
                                        onChange={e => setForm({ ...form, remoteAddress: e.target.value })}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">{t('profiles.clientInfo')}</p>
                                </div>
                            </div>

                            <datalist id="ip-pools">
                                {pools.map(pool => (
                                    <option key={pool['.id'] || pool.name} value={pool.name}>{pool.ranges}</option>
                                ))}
                            </datalist>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('profiles.downloadKbps')}</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full border rounded px-3 py-2"
                                        value={form.speedDown}
                                        onChange={e => setForm({ ...form, speedDown: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('profiles.uploadKbps')}</label>
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
                                <label className="block text-sm font-medium mb-1">{t('profiles.priceIdr')}</label>
                                <input
                                    type="number"
                                    required
                                    className="w-full border rounded px-3 py-2"
                                    value={form.price}
                                    onChange={e => setForm({ ...form, price: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">{t('profiles.priceCommentInfo')}</p>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                                >
                                    {form.id ? t('profiles.updateProfile') : t('profiles.saveRouter')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
