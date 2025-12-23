'use client';

import { useState, useEffect } from 'react';
import { Save, ArrowLeft, Building, MapPin, Phone, FileText, Image, Calendar, Mail, FileCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function InvoiceSettingsPage() {
    const [settings, setSettings] = useState({
        companyName: '',
        companyAddress: '',
        companyContact: '',
        invoiceFooter: '',
        logoUrl: '',
        autoDropDate: 10,
        email: {
            host: 'smtp.gmail.com',
            port: '587',
            user: '',
            password: '',
            secure: false
        }
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [logoFile, setLogoFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const router = useRouter();

    useEffect(() => {
        // Strict Role Check
        fetch('/api/auth/me')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Failed to fetch user');
            })
            .then(data => {
                if (data.user.role !== 'superadmin') {
                    router.push('/'); // Redirect if not superadmin
                } else {
                    setUserRole(data.user.role);
                    fetchSettings(); // Only fetch settings if allowed
                }
            })
            .catch(() => router.push('/login'));
    }, [router]);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/billing/settings');
            if (res.ok) {
                const data = await res.json();
                setSettings(prev => ({ ...prev, ...data }));
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // Upload logo first if there's a new file
            let logoUrl = settings.logoUrl;
            if (logoFile) {
                setUploading(true);
                const formData = new FormData();
                formData.append('logo', logoFile);

                const uploadRes = await fetch('/api/billing/upload-logo', {
                    method: 'POST',
                    body: formData
                });

                if (uploadRes.ok) {
                    const { logoUrl: newLogoUrl } = await uploadRes.json();
                    logoUrl = newLogoUrl;
                } else {
                    setMessage({ type: 'error', text: 'Failed to upload logo' });
                    setLoading(false);
                    setUploading(false);
                    return;
                }
                setUploading(false);
            }

            const res = await fetch('/api/billing/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...settings, logoUrl }),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Invoice settings saved successfully!' });
                setLogoFile(null);
                fetchSettings();
            } else {
                setMessage({ type: 'error', text: 'Failed to save settings' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error saving settings' });
        } finally {
            setLoading(false);
        }
    };

    if (userRole !== 'superadmin') {
        return null; // Don't render anything while checking/redirecting
    }

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                        <FileCheck size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Centralized Invoice Settings</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Configure global invoice templates and billing parameters</p>
                    </div>
                </div>
            </div>

            {message.text && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success'
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <FileCheck size={20} /> : <span className="font-bold">!</span>}
                    {message.text}
                </div>
            )}

            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 dark:border-white/5 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Company Settings */}
                        <div className="md:col-span-2">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <Building size={20} className="text-blue-500" /> Company Information
                            </h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Name</label>
                            <input
                                type="text"
                                value={settings.companyName}
                                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                placeholder="My ISP"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <Mail size={16} /> Company Email
                            </label>
                            <input
                                type="email"
                                value={settings.companyContact}
                                onChange={(e) => setSettings({ ...settings, companyContact: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                placeholder="billing@net.id"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Address</label>
                            <textarea
                                value={settings.companyAddress}
                                onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                rows="2"
                                placeholder="Jalan..."
                            />
                        </div>

                        {/* Invoice Template */}
                        <div className="md:col-span-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <FileText size={20} className="text-purple-500" /> Invoice Template
                            </h3>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Invoice Footer Note</label>
                            <textarea
                                value={settings.invoiceFooter}
                                onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                rows="2"
                                placeholder="Thank you for your business..."
                            />
                            <p className="text-xs text-gray-500 mt-1">This text will appear at the bottom of every invoice.</p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Logo</label>
                            <div className="space-y-3">
                                {(settings.logoUrl || logoFile) && (
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                                        <p className="text-xs text-gray-500 mb-2">Current Logo:</p>
                                        <img
                                            src={logoFile ? URL.createObjectURL(logoFile) : settings.logoUrl}
                                            alt="Company Logo"
                                            className="max-h-24 object-contain"
                                        />
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setLogoFile(e.target.files[0])}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                <p className="text-xs text-gray-500">Upload your company logo (PNG, JPG, max 2MB)</p>
                            </div>
                        </div>

                        {/* Automation */}
                        <div className="md:col-span-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <Calendar size={20} className="text-red-500" /> Automation
                            </h3>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Auto-Drop Date</label>
                            <input
                                type="number"
                                min="1"
                                max="31"
                                value={settings.autoDropDate || ''}
                                onChange={(e) => setSettings({ ...settings, autoDropDate: parseInt(e.target.value) || 10 })}
                                className="w-full md:w-1/3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                placeholder="10"
                            />
                            <p className="text-xs text-gray-500 mt-1">Day of the month (1-31) when the system should automatically drop users with unpaid invoices</p>
                        </div>

                        {/* Email Settings */}
                        <div className="md:col-span-2 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2">
                                <Mail size={20} className="text-orange-500" /> Email Configuration (SMTP)
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SMTP Host</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        placeholder="smtp.gmail.com"
                                        value={settings.email?.host || ''}
                                        onChange={(e) => setSettings({ ...settings, email: { ...settings.email, host: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SMTP Port</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        placeholder="587"
                                        value={settings.email?.port || ''}
                                        onChange={(e) => setSettings({ ...settings, email: { ...settings.email, port: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SMTP Email/User</label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        placeholder="your-email@gmail.com"
                                        value={settings.email?.user || ''}
                                        onChange={(e) => setSettings({ ...settings, email: { ...settings.email, user: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SMTP Password / App Password</label>
                                    <input
                                        type="password"
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                        placeholder={settings.email?.password ? "******" : "Enter App Password"}
                                        value={settings.email?.password || ''}
                                        onChange={(e) => setSettings({ ...settings, email: { ...settings.email, password: e.target.value } })}
                                    />
                                </div>
                                <div className="md:col-span-2 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="secure"
                                        checked={settings.email?.secure || false}
                                        onChange={(e) => setSettings({ ...settings, email: { ...settings.email, secure: e.target.checked } })}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="secure" className="text-sm text-gray-700 dark:text-gray-300">Use Secure Connection (SSL/TLS - Usually for port 465)</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-70 transition-all shadow-md"
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Global Invoice Settings'}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}
