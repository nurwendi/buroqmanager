'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Plus, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOlt } from '@/contexts/OltContext';

export default function RegisterOnuPage() {
    const { t } = useLanguage();
    const { selectedOltId } = useOlt();
    const [uncfg, setUncfg] = useState([]);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);

    // Form State
    const [selectedOnu, setSelectedOnu] = useState(null);
    const [formData, setFormData] = useState({
        user: '',
        password: '',
        vlan: '',
        profile: '',
        type: 'ZTE-F609', // Default type
        name: ''
    });
    const [registering, setRegistering] = useState(false);

    // Dynamic VLAN State
    const [vlans, setVlans] = useState([]);
    const [addingVlan, setAddingVlan] = useState(false);
    const [newVlanInput, setNewVlanInput] = useState('');

    // Dynamic VLAN Profile State
    const [vlanProfiles, setVlanProfiles] = useState([]);
    const [addingProfile, setAddingProfile] = useState(false);

    const scanUnconfigured = async () => {
        if (!selectedOltId) return toast.error("No OLT Selected");
        setScanning(true);
        try {
            const res = await fetch(`/api/olt/uncfg?oltId=${selectedOltId}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setUncfg(data);
                if (data.length === 0) toast(t('olt.noDevicesFound'));
            } else {
                toast.error('Failed to scan: ' + (data.error || 'Unknown error'));
            }
        } catch (e) {
            toast.error('Scan failed: ' + e.message);
        } finally {
            setScanning(false);
        }
    };

    useEffect(() => {
        // Fetch VLANs
        fetch('/api/settings/vlans')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setVlans(data);
            })
            .catch(err => console.error(err));

        // Fetch Profiles
        fetch('/api/settings/vlan-profiles')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setVlanProfiles(data);
            })
            .catch(err => console.error(err));
    }, []);

    // Auto-select profile when VLAN changes if strictly matching netmedia<ID> exists
    useEffect(() => {
        if (!formData.vlan) return;
        const target = `netmedia${formData.vlan}`;
        // If the calculated profile is in our list, select it automatically
        if (vlanProfiles.includes(target)) {
            setFormData(prev => ({ ...prev, vlanProfile: target }));
        } else if (vlanProfiles.includes('default')) {
            // Optional: fallback to default or keep empty? User said "default netmedia143"
            // Use logic to set it to target even if not in list? No, should pick from list.
            // Or maybe just PRE-FILL the value for adding? 
            // Let's just set the text value so it appears selected if compatible, or just leave it for user.
        }
    }, [formData.vlan, vlanProfiles]);

    const handleAddVlan = async () => {
        if (!newVlanInput) return;
        setAddingVlan(true);
        try {
            const res = await fetch('/api/settings/vlans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vlan: newVlanInput })
            });
            const data = await res.json();
            if (data.success) {
                setVlans(data.vlans);
                setFormData(prev => ({ ...prev, vlan: newVlanInput }));
                setNewVlanInput('');
                toast.success('VLAN added');
            }
        } catch (e) {
            toast.error('Failed to add VLAN');
        } finally {
            setAddingVlan(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!selectedOnu) return;

        setRegistering(true);
        try {
            const payload = {
                onuId: selectedOnu.onuId,
                sn: selectedOnu.sn,
                oltId: selectedOltId,
                ...formData
            };

            const res = await fetch('/api/olt/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (result.success) {
                toast.success('ONU Registered Successfully!');
                setSelectedOnu(null); // Close form
                scanUnconfigured(); // Refresh list
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            toast.error('Registration failed: ' + e.message);
        } finally {
            setRegistering(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Register New ONUs</h1>

            {/* Search / Scan Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">{t('olt.scanUnconfigured')}</h3>
                    <button
                        onClick={scanUnconfigured}
                        disabled={scanning}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                    >
                        {scanning ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                        {scanning ? t('olt.scanning') : t('olt.scanUnconfigured')}
                    </button>
                </div>

                {uncfg.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Wifi size={48} className="mx-auto mb-3 opacity-20" />
                        <p>{t('olt.noDevicesFound')}</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {uncfg.map((onu) => (
                            <div key={onu.sn} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                                        <Plus size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold">{onu.sn}</h4>
                                        <p className="text-sm text-gray-500">{onu.interface}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedOnu(onu)}
                                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                                >
                                    Configure
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Registration Modal/Form */}
            {selectedOnu && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
                        <h2 className="text-xl font-bold mb-4">{t('olt.registerOnu')}: {selectedOnu.sn}</h2>
                        <form onSubmit={handleRegister} className="space-y-4">
                            {/* Read-only Interface ID */}
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('olt.onuInterface')}</label>
                                <input
                                    readOnly
                                    disabled
                                    className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:border-gray-700 cursor-not-allowed font-mono text-sm"
                                    value={selectedOnu.interface}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name / Owner</label>
                                    <input
                                        required
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="Customer Name"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{t('olt.deviceType')}</label>
                                    <input
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">VLAN ID</label>
                                    <div className="flex gap-2">
                                        <select
                                            required
                                            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                            value={formData.vlan}
                                            onChange={e => setFormData({ ...formData, vlan: e.target.value })}
                                        >
                                            <option value="">Select VLAN</option>
                                            {vlans.map(v => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const v = prompt("Enter new VLAN ID:");
                                                    if (v) {
                                                        setNewVlanInput(v);
                                                        // Using timeout to allow state update before calling handler if needed, 
                                                        // but here we can just call logic directly.
                                                        // Let's reuse the handler logic slightly modified or just duplicate for simplicity of prompt flow
                                                        // actually prompt is blocking.
                                                        if (!v) return;
                                                        // Call API directly
                                                        fetch('/api/settings/vlans', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ vlan: v })
                                                        })
                                                            .then(res => res.json())
                                                            .then(data => {
                                                                if (data.success) {
                                                                    setVlans(data.vlans);
                                                                    setFormData(prev => ({ ...prev, vlan: v }));
                                                                    toast.success("Added");
                                                                }
                                                            });
                                                    }
                                                }}
                                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg"
                                                title="Add New VLAN"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Bandwidth Profile</label>
                                    <input
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        placeholder="e.g. 10M, 20M, 1GB"
                                        value={formData.profile}
                                        onChange={e => setFormData({ ...formData, profile: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">VLAN Profile</label>
                                <div className="flex gap-2">
                                    <select
                                        required
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        value={formData.vlanProfile}
                                        onChange={e => setFormData({ ...formData, vlanProfile: e.target.value })}
                                    >
                                        <option value="">Select Profile</option>
                                        {vlanProfiles.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const suggestion = formData.vlan ? `netmedia${formData.vlan}` : '';
                                                const p = prompt("Enter new VLAN Profile:", suggestion);
                                                if (p) {
                                                    fetch('/api/settings/vlan-profiles', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ profile: p })
                                                    })
                                                        .then(res => res.json())
                                                        .then(data => {
                                                            if (data.success) {
                                                                setVlanProfiles(data.profiles);
                                                                setFormData(prev => ({ ...prev, vlanProfile: p }));
                                                                toast.success("Profile Added");
                                                            }
                                                        });
                                                }
                                            }}
                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg"
                                            title="Add New Profile"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Required. Default recommendation: netmedia{formData.vlan || '(vlan_id)'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">PPPoE User</label>
                                    <input
                                        required
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        value={formData.user}
                                        onChange={e => setFormData({ ...formData, user: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">PPPoE Password</label>
                                    <input
                                        required
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setSelectedOnu(null)}
                                    className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={registering}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                                >
                                    {registering && <Loader2 className="animate-spin" size={16} />}
                                    Register Device
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
