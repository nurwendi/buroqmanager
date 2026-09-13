'use client';

import { useState, useEffect } from 'react';
import { Shield, Copy, Settings, Terminal, Info, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OltScriptPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUserComment, setSelectedUserComment] = useState('');
    const [updatingComment, setUpdatingComment] = useState(false);

    const [oltData, setOltData] = useState({
        username: '',
        password: '',
        noInterface: '',
        noOnu: '',
        sn: '',
        tcon: '3',
        oltProfile: '10M'
    });

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
            setOltData({ ...oltData, username: '', password: '' });
            setSelectedUserComment('');
            return;
        }

        const user = users.find(u => u.name === selectedUsername);
        if (user) {
            setOltData({
                ...oltData,
                username: user.name,
                password: user.password || '',
            });
            setSelectedUserComment(user.comment || '');
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
tcont ${oltData.tcon || '[tcon]'} profile ${oltData.oltProfile || '[profile]'}
gemport 1 tcont 3
gemport 1 traffic-limit upstream ${oltData.oltProfile || '[profile]'} downstream ${oltData.oltProfile || '[profile]'}
service-port 1 vport 1 user-vlan 143 vlan 143
exit

pon-onu-mng gpon-onu_1/1/${oltData.noInterface || '[noInterface]'}:${oltData.noOnu || '[noOnu]'}
service 1 gemport 1 vlan 143
wan-ip 1 mode pppoe username ${oltData.username || '[username]'} password ${oltData.password || '[password]'} vlan-profile netmedia143 host 1
exit

exit
write`;

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedOltScript);
        alert('Script berhasil dicopy!');
    };

    const handleUpdateComment = async () => {
        if (!oltData.username) return alert('Pilih pelanggan terlebih dahulu!');
        
        const user = users.find(u => u.name === oltData.username);
        if (!user || !user['.id']) return alert('Data pelanggan tidak valid!');

        const commentToAdd = `1/1/${oltData.noInterface || ''}:${oltData.noOnu || ''} ${oltData.sn || ''}`.trim();
        const existingComment = selectedUserComment || '';
        
        let newComment = commentToAdd;
        if (existingComment) {
            if (existingComment.includes(commentToAdd)) {
                return alert('Komentar OLT ini sudah ada di Mikrotik!');
            }
            newComment = `${existingComment} ${commentToAdd}`;
        }

        setUpdatingComment(true);
        try {
            const res = await fetch(`/api/pppoe/users/${encodeURIComponent(user['.id'])}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: newComment })
            });

            if (res.ok) {
                alert('Komentar berhasil ditambahkan ke Mikrotik!');
                setSelectedUserComment(newComment);
                setUsers(users.map(u => u.name === user.name ? { ...u, comment: newComment } : u));
            } else {
                const data = await res.json();
                alert('Gagal mengupdate komentar: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error(error);
            alert('Terjadi kesalahan saat mengupdate komentar');
        } finally {
            setUpdatingComment(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <Terminal className="text-blue-500" size={32} />
                    OLT ZTE Script Generator
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Buat script konfigurasi OLT ZTE secara otomatis dari daftar pelanggan Mikrotik.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-6"
                >
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800 dark:text-white">
                        <Settings size={20} className="text-blue-500" />
                        Parameter Script
                    </h2>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username PPPoE (Pilih)</label>
                                <div className="relative">
                                    <select 
                                        value={oltData.username} 
                                        onChange={handleUserSelect} 
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all appearance-none"
                                        disabled={loading}
                                    >
                                        <option value="">-- Pilih Pelanggan --</option>
                                        {users.map(u => (
                                            <option key={u['.id'] || u.name} value={u.name}>{u.name}</option>
                                        ))}
                                    </select>
                                    {loading && <Loader2 size={16} className="absolute right-3 top-3 animate-spin text-gray-400" />}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password PPPoE</label>
                                <input type="text" value={oltData.password} onChange={(e) => setOltData({...oltData, password: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all" placeholder="pass123" />
                            </div>
                        </div>



                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No Interface</label>
                                <input type="text" value={oltData.noInterface} onChange={(e) => setOltData({...oltData, noInterface: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all" placeholder="Contoh: 2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No ONU</label>
                                <input type="text" value={oltData.noOnu} onChange={(e) => setOltData({...oltData, noOnu: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all" placeholder="Contoh: 5" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SN (Serial Number)</label>
                            <input type="text" value={oltData.sn} onChange={(e) => setOltData({...oltData, sn: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all" placeholder="ZTEG..." />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TCONT</label>
                                <input type="text" value={oltData.tcon} onChange={(e) => setOltData({...oltData, tcon: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all" placeholder="Contoh: 3" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profile OLT</label>
                                <input type="text" value={oltData.oltProfile} onChange={(e) => setOltData({...oltData, oltProfile: e.target.value})} className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all" placeholder="Profile" />
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg p-4 flex flex-col gap-3 mt-4">
                            <div className="flex items-start gap-2">
                                <Info size={18} className="text-blue-500 shrink-0" />
                                <div className="flex flex-col gap-2 w-full">
                                    <div>
                                        <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Komentar Lama (Mikrotik):</p>
                                        <p className="text-sm text-blue-900 dark:text-blue-200 mt-0.5">{selectedUserComment || <i>(Tidak ada komentar)</i>}</p>
                                    </div>
                                    <div className="pt-2 border-t border-blue-200 dark:border-blue-800/50">
                                        <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Komentar Baru (Akan ditambahkan):</p>
                                        <p className="text-sm font-mono bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded text-blue-900 dark:text-blue-200 mt-1 inline-block">
                                            1/1/{oltData.noInterface || '[noInterface]'}:{oltData.noOnu || '[noOnu]'} {oltData.sn || '[SN]'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleUpdateComment}
                                disabled={updatingComment || !oltData.username}
                                className="mt-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full flex items-center justify-center gap-2"
                            >
                                {updatingComment ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
                                Tambah Komentar
                            </button>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-gray-900 rounded-xl shadow-sm border border-gray-800 overflow-hidden flex flex-col"
                >
                    <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
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
                            <Copy size={14} /> Copy Script
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
