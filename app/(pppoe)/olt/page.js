'use client';

import { useState, useEffect } from 'react';
import { Shield, Copy, Settings, Terminal, Info, Loader2, Search, Wifi, Zap, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function OltScriptPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUserComment, setSelectedUserComment] = useState('');
    const [updatingComment, setUpdatingComment] = useState(false);
    
    // For searchable dropdown
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const [oltData, setOltData] = useState({
        username: '',
        password: '',
        noInterface: '',
        noOnu: '',
        sn: '',
        tcon: '3',
        oltProfile: '10M',
        vlan: '143',
        vlanProfile: 'netmedia143',
        name: ''
    });

    const [scanning, setScanning] = useState(false);
    const [unconfiguredOnus, setUnconfiguredOnus] = useState([]);
    const [executingCommand, setExecutingCommand] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/pppoe/users');
                if (res.ok) {
                    const data = await res.json();
                    setUsers(data);
                }
            } catch (error) {
                console.error('Failed to fetch users', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleUserSelect = (e) => {
        const selectedUsername = e.target.value;
        if (!selectedUsername) {
            setOltData({ ...oltData, username: '', password: '', name: '' });
            setSelectedUserComment('');
            return;
        }

        const user = users.find(u => u.name === selectedUsername);
        if (user) {
            setOltData({
                ...oltData,
                username: user.name,
                password: user.password || '',
                name: user.name
            });
            setSelectedUserComment(user.comment || '');
        }
    };

    const handleScanOnu = async () => {
        setScanning(true);
        setUnconfiguredOnus([]);
        try {
            const res = await fetch('/api/olt/unconfigured', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ olt: 'olt1' })
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                setUnconfiguredOnus(data.onus);
                toast.success(`Ditemukan ${data.onus.length} ONU yang belum terkonfigurasi`);
            } else {
                toast.error(data.message || 'Gagal mencari ONU');
            }
        } catch (error) {
            toast.error('Terjadi kesalahan saat scanning ONU');
        } finally {
            setScanning(false);
        }
    };

    const handleSelectUnconfigured = async (onu) => {
        setOltData(prev => ({
            ...prev,
            sn: onu.serial,
            noInterface: onu.slot_port.replace('1/1/', '') // asumsi format 1/1/x
        }));
        
        // Auto fetch ONU ID
        try {
            toast.info('Mencari ID ONU yang tersedia...');
            const res = await fetch('/api/olt/details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    olt: 'olt1', 
                    slot_port: onu.slot_port,
                    serial: onu.serial
                })
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                setOltData(prev => ({ ...prev, noOnu: data.onu_id.toString() }));
                toast.success(`ID ONU otomatis diset ke: ${data.onu_id}`);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleExecuteOlt = async () => {
        if (!oltData.noInterface || !oltData.noOnu || !oltData.sn) {
            return toast.error('Harap lengkapi No Interface, No ONU, dan SN terlebih dahulu!');
        }

        setExecutingCommand(true);
        try {
            const res = await fetch('/api/olt/configure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    olt: 'olt1',
                    slot_port: `1/1/${oltData.noInterface}`,
                    onu_id: oltData.noOnu,
                    serial: oltData.sn,
                    name: oltData.name || oltData.username,
                    pppoe_user: oltData.username,
                    pppoe_pass: oltData.password,
                    vlan: oltData.vlan,
                    profile: oltData.oltProfile,
                    vlan_profile: oltData.vlanProfile
                })
            });

            const data = await res.json();
            if (res.ok && data.status === 'success') {
                toast.success('Berhasil mengirim konfigurasi ke OLT!');
                console.log(data.details);
            } else {
                toast.error('Gagal: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            toast.error('Terjadi kesalahan eksekusi perintah OLT');
        } finally {
            setExecutingCommand(false);
        }
    };

    const handleEnableRemote = async () => {
        if (!oltData.noInterface || !oltData.noOnu) {
            return toast.error('Lengkapi No Interface dan No ONU');
        }
        
        const slot_port = `1/1/${oltData.noInterface}:${oltData.noOnu}`;
        
        try {
            const res = await fetch('/api/olt/remote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ olt: 'olt1', slot_port })
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                toast.success('Remote Web berhasil diaktifkan!');
            } else {
                toast.error(data.message || 'Gagal mengaktifkan remote');
            }
        } catch (error) {
            toast.error('Error saat menghubungi server OLT');
        }
    };

    const generatedOltScript = `conf t
interface gpon-olt_1/1/${oltData.noInterface || '[noInterface]'}
no onu ${oltData.noOnu || '[noOnu]'}
end

conf t

interface gpon-olt_1/1/${oltData.noInterface || '[noInterface]'}
onu ${oltData.noOnu || '[noOnu]'} type ZTE sn ${oltData.sn || '[SN]'}
exit

interface gpon-onu_1/1/${oltData.noInterface || '[noInterface]'}:${oltData.noOnu || '[noOnu]'}
name ${oltData.name || oltData.username || '[name]'}
tcont ${oltData.tcon || '[tcon]'} profile ${oltData.oltProfile || '[profile]'}
gemport 1 name INET tcont 1
service-port 1 vport 1 user-vlan ${oltData.vlan || '[vlan]'} vlan ${oltData.vlan || '[vlan]'}
exit

pon-onu-mng gpon-onu_1/1/${oltData.noInterface || '[noInterface]'}:${oltData.noOnu || '[noOnu]'}
service INET gemport 1 vlan ${oltData.vlan || '[vlan]'}
wan-ip 1 mode pppoe username ${oltData.username || '[username]'} password ${oltData.password || '[password]'} vlan-profile ${oltData.vlanProfile || '[vlanProfile]'} host 1
wan 1 service internet host 1
end
write`;

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedOltScript);
        toast.success('Script berhasil dicopy!');
    };

    const handleUpdateComment = async () => {
        if (!oltData.username) return toast.error('Pilih pelanggan terlebih dahulu!');
        
        const user = users.find(u => u.name === oltData.username);
        if (!user || !user['.id']) return toast.error('Data pelanggan tidak valid!');

        const commentToAdd = `1/1/${oltData.noInterface || ''} : ${oltData.noOnu || ''} ${oltData.sn || ''}`.trim();
        let newComment = commentToAdd;

        setUpdatingComment(true);
        try {
            const res = await fetch(`/api/pppoe/users/${encodeURIComponent(user['.id'])}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: newComment })
            });

            if (res.ok) {
                toast.success('Komentar berhasil ditambahkan ke Mikrotik!');
                setSelectedUserComment(newComment);
                setUsers(users.map(u => u.name === user.name ? { ...u, comment: newComment } : u));
            } else {
                const data = await res.json();
                toast.error('Gagal mengupdate komentar: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error(error);
            toast.error('Terjadi kesalahan saat mengupdate komentar');
        } finally {
            setUpdatingComment(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Terminal className="text-blue-500" size={32} />
                        Manajemen OLT ZTE
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Konfigurasi otomatis OLT ZTE via Telnet langsung dari dashboard.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleScanOnu}
                        disabled={scanning}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-70"
                    >
                        {scanning ? <Loader2 size={18} className="animate-spin" /> : <Wifi size={18} />}
                        Scan Unconfigured ONU
                    </button>
                </div>
            </motion.div>

            {unconfiguredOnus.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 shadow-sm"
                >
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                        <Zap size={18} /> ONU Ditemukan ({unconfiguredOnus.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {unconfiguredOnus.map((onu, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-indigo-50 dark:bg-gray-900 p-3 rounded-lg border border-indigo-100 dark:border-gray-700">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{onu.serial}</p>
                                    <p className="text-xs text-gray-500">{onu.slot_port}</p>
                                </div>
                                <button
                                    onClick={() => handleSelectUnconfigured(onu)}
                                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded transition-colors"
                                >
                                    Pilih
                                </button>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-7 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-6"
                >
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800 dark:text-white">
                        <Settings size={20} className="text-blue-500" />
                        Parameter Konfigurasi
                    </h2>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username PPPoE (Cari)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setShowDropdown(true);
                                            if (e.target.value === '') {
                                                setOltData({ ...oltData, username: '', password: '', name: '' });
                                                setSelectedUserComment('');
                                            }
                                        }}
                                        onFocus={() => setShowDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                        placeholder={loading ? "Memuat pelanggan..." : "Ketik untuk mencari..."}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all pr-10"
                                        disabled={loading}
                                    />
                                    {loading ? (
                                        <Loader2 size={16} className="absolute right-3 top-3 animate-spin text-gray-400" />
                                    ) : (
                                        <Search size={16} className="absolute right-3 top-3 text-gray-400" />
                                    )}
                                </div>
                                
                                {showDropdown && filteredUsers.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {filteredUsers.map(u => (
                                            <div 
                                                key={u['.id'] || u.name}
                                                onClick={() => {
                                                    setSearchTerm(u.name);
                                                    setOltData({
                                                        ...oltData,
                                                        username: u.name,
                                                        password: u.password || '',
                                                        name: u.name
                                                    });
                                                    setSelectedUserComment(u.comment || '');
                                                    setShowDropdown(false);
                                                }}
                                                className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-800 dark:text-gray-200"
                                            >
                                                {u.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password PPPoE</label>
                                <input type="text" value={oltData.password} onChange={(e) => setOltData({...oltData, password: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all" placeholder="pass123" />
                            </div>
                        </div>



                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No Interface (cth: 2)</label>
                                <input type="text" value={oltData.noInterface} onChange={(e) => setOltData({...oltData, noInterface: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all" placeholder="2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No ONU</label>
                                <input type="text" value={oltData.noOnu} onChange={(e) => setOltData({...oltData, noOnu: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all" placeholder="1" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SN (Serial Number)</label>
                            <input type="text" value={oltData.sn} onChange={(e) => setOltData({...oltData, sn: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all" placeholder="ZTEG..." />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VLAN ID</label>
                                <input type="text" value={oltData.vlan} onChange={(e) => setOltData({...oltData, vlan: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all" placeholder="143" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VLAN Profile</label>
                                <input type="text" value={oltData.vlanProfile} onChange={(e) => setOltData({...oltData, vlanProfile: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all" placeholder="netmedia143" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TCONT</label>
                                <input type="text" value={oltData.tcon} onChange={(e) => setOltData({...oltData, tcon: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all" placeholder="3" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profile OLT</label>
                                <input type="text" value={oltData.oltProfile} onChange={(e) => setOltData({...oltData, oltProfile: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all" placeholder="10M" />
                            </div>
                        </div>
                        
                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={handleExecuteOlt}
                                disabled={executingCommand}
                                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-md"
                            >
                                {executingCommand ? <Loader2 size={18} className="animate-spin" /> : <Terminal size={18} />}
                                Konfigurasi ke Mesin OLT
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 mt-2">
                             <button
                                onClick={handleEnableRemote}
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Globe size={18} /> Enable Remote Web
                            </button>
                             <button
                                onClick={handleUpdateComment}
                                disabled={updatingComment || !oltData.username}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {updatingComment ? <Loader2 size={18} className="animate-spin" /> : <Settings size={18} />}
                                Simpan Komentar Mikrotik
                            </button>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-5 bg-gray-900 rounded-xl shadow-sm border border-gray-800 overflow-hidden flex flex-col h-[600px] lg:h-auto"
                >
                    <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <span className="text-gray-400 text-sm ml-2 font-mono">Result Script</span>
                        </div>
                        <button 
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md font-medium transition-colors"
                        >
                            <Copy size={14} /> Copy
                        </button>
                    </div>
                    <div className="p-4 flex-1 overflow-auto">
                        <pre className="text-green-400 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                            {generatedOltScript}
                        </pre>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
