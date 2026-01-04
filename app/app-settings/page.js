'use client';

import { useState, useEffect } from 'react';
import { Upload, Save, User, Key, Image as ImageIcon, Palette, Clock, Gauge, Globe, LogOut, Bell, Shield, Moon, Sun, Monitor, Camera, MapPin, Phone, Mail, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDashboard } from '@/contexts/DashboardContext';
import { useTheme, accentColors } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import PaymentGatewaySettings from '@/components/settings/PaymentGatewaySettings';

export default function AppSettingsPage() {
    const { language, setLanguage, t } = useLanguage();
    const { theme, updateTheme, setAccentColor } = useTheme();

    const modes = [
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
        { value: 'system', label: 'System', icon: Monitor }
    ];

    const { preferences: contextPreferences, updatePreferences } = useDashboard(); // Rename context pref

    const router = useRouter();

    const [userRole, setUserRole] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');

    // Define restricted roles (Everyone except Superadmin)
    // const isRestricted = userRole !== 'superadmin';

    // ADJUSTED: Admin/Owner should be able to see settings related to them
    const isRestricted = userRole === 'viewer' || userRole === 'technician' || userRole === 'agent';


    const tabs = [
        { id: 'profile', label: 'User Profile', icon: User },
        { id: 'appearance', label: 'Appearance', icon: Palette, hidden: isRestricted },
        { id: 'payment', label: 'Payment Gateway', icon: CreditCard, hidden: isRestricted },
        { id: 'system', label: 'System', icon: Gauge, hidden: isRestricted },
        { id: 'security', label: 'Security', icon: Shield, hidden: isRestricted },
    ].filter(tab => !tab.hidden);

    const [settings, setSettings] = useState({
        appName: 'Mikrotik Manager',
        logoUrl: '',
        adminUsername: '',
        adminPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Local state for form editing
    const [preferences, setPreferences] = useState({
        display: {
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24h',
            timezone: 'Asia/Jakarta',
            bandwidthUnit: 'auto',
            memoryUnit: 'auto',
            temperatureUnit: 'celsius'
        },
        dashboard: {
            refreshInterval: 5000
        },
        tables: {
            rowsPerPage: 25
        },
        notifications: {
            enabled: false,
            highCpu: true,
            cpuThreshold: 80,

            voltageLow: true
        },
        security: {
            sessionTimeout: 30
        }
    });

    const [profile, setProfile] = useState({
        username: '',
        fullName: '',
        phone: '',
        address: '',
        avatar: '',
        password: '',
        confirmPassword: ''
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Sync local state with context when context loads
    useEffect(() => {
        if (contextPreferences) {
            setPreferences(prev => ({
                ...prev,
                ...contextPreferences,
                display: { ...prev.display, ...(contextPreferences.display || {}) },
                dashboard: { ...prev.dashboard, ...(contextPreferences.dashboard || {}) },
                tables: { ...prev.tables, ...(contextPreferences.tables || {}) },
                notifications: { ...prev.notifications, ...(contextPreferences.notifications || {}) },
                security: { ...prev.security, ...(contextPreferences.security || {}) }
            }));
        }
    }, [contextPreferences]);

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Failed to fetch user');
            })
            .then(data => setUserRole(data.user.role))
            .catch(() => setUserRole(null));
        fetchSettings();
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/profile');
            if (res.ok) {
                const data = await res.json();
                setProfile(prev => ({
                    ...prev,
                    ...data,
                    password: '',
                    confirmPassword: ''
                }));
            }
        } catch (error) {
            console.error('Failed to fetch profile', error);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/app-settings');
            if (res.ok) {
                const data = await res.json();
                setSettings(prev => ({
                    ...prev,
                    appName: data.appName || 'Mikrotik Manager',
                    logoUrl: data.logoUrl || ''
                }));
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
        }
    };



    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        if (profile.password && profile.password !== profile.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match!' });
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                if (profile.password) {
                    setProfile(prev => ({ ...prev, password: '', confirmPassword: '' }));
                }
                // Refresh profile data
                fetchProfile();
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error updating profile' });
        } finally {
            setLoading(false);
        }
    };

    const handleProfileAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const data = new FormData();
        data.append('file', file);

        try {
            const res = await fetch('/api/profile/upload', {
                method: 'POST',
                body: data,
            });
            if (res.ok) {
                const result = await res.json();
                setProfile(prev => ({ ...prev, avatar: result.avatarUrl }));
                setMessage({ type: 'success', text: 'Avatar uploaded successfully!' });
            } else {
                const errorData = await res.json();
                setMessage({ type: 'error', text: errorData.error || 'Failed to upload avatar' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error uploading avatar' });
        }
    };

    const handleSaveAppearance = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/app-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appName: settings.appName,
                    logoUrl: settings.logoUrl
                }),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Appearance settings saved successfully!' });
                setTimeout(() => window.location.reload(), 1000);
            } else {
                setMessage({ type: 'error', text: 'Failed to save settings' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error saving settings' });
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const data = new FormData();
        data.append('file', file);
        data.append('type', type);

        try {
            const res = await fetch('/api/settings/upload', {
                method: 'POST',
                body: data,
            });
            if (res.ok) {
                setMessage({ type: 'success', text: `${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully. Refresh to see changes.` });
                // If logo, update the preview
                if (type === 'logo') {
                    // Assuming the upload API saves it to a predictable path or returns the path
                    // For now, just reload to see changes as the previous code did
                    setTimeout(() => window.location.reload(), 1000);
                }
            } else {
                setMessage({ type: 'error', text: 'Failed to upload file' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error uploading file' });
        }
    };

    const handleSavePreferences = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await updatePreferences(preferences);
            setMessage({ type: 'success', text: 'Preferences saved successfully' });
        } catch (error) {
            console.error('Failed to save preferences', error);
            setMessage({ type: 'error', text: 'Failed to save preferences' });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        if (settings.newPassword !== settings.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match!' });
            setLoading(false);
            return;
        }

        if (settings.newPassword.length < 4) {
            setMessage({ type: 'error', text: 'Password must be at least 4 characters!' });
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/app-settings/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: settings.adminUsername,
                    newPassword: settings.newPassword
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setSettings(prev => ({
                    ...prev,
                    adminUsername: '',
                    newPassword: '',
                    confirmPassword: ''
                }));
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to change password' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error changing password' });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    return (
        <div className="w-full space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Application Settings</h1>

            {message.text && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {message.text}
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Sidebar */}
                <div className="w-full lg:w-64 shrink-0 space-y-2 sticky top-4">
                    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-xl p-3 border border-gray-200 dark:border-gray-700 space-y-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700'
                                    }`}
                            >
                                <tab.icon size={18} />
                                <span>{tab.label}</span>
                            </button>
                        ))}

                        <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-medium"
                            >
                                <LogOut size={18} />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 space-y-6 w-full">

                    {activeTab === 'profile' && (<>
                        {/* User Profile Settings (New) */}
                        <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
                            <div className="flex items-center gap-3 mb-6">
                                <User className="text-indigo-600 dark:text-indigo-400" size={24} />
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">User Profile</h2>
                            </div>

                            <form onSubmit={handleSaveProfile} className="space-y-6">
                                {/* Avatar Upload */}
                                <div className="flex items-center gap-6">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                            {profile.avatar ? (
                                                <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={40} className="text-gray-400" />
                                            )}
                                        </div>
                                        <label className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white cursor-pointer shadow-lg hover:bg-blue-700 transition-colors">
                                            <Camera size={16} />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleProfileAvatarUpload}
                                            />
                                        </label>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">Profile Picture</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Click the camera icon to update your avatar</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Username
                                            {userRole !== 'admin' && userRole !== 'superadmin' && (
                                                <span className="text-xs text-red-500 ml-2">(Contact Admin to change)</span>
                                            )}
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.username}
                                            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800 cursor-not-allowed"
                                            required
                                            disabled={userRole !== 'admin' && userRole !== 'superadmin'}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                                        <input
                                            type="text"
                                            value={profile.fullName}
                                            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                                        <div className="relative">
                                            <Phone size={18} className="absolute left-3 top-3 text-gray-400" />
                                            <input
                                                type="text"
                                                value={profile.phone}
                                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                placeholder="0812..."
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                                        <div className="relative">
                                            <MapPin size={18} className="absolute left-3 top-3 text-gray-400" />
                                            <input
                                                type="text"
                                                value={profile.address}
                                                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                placeholder="Street address..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Change Password (Optional)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                                            <input
                                                type="password"
                                                value={profile.password}
                                                onChange={(e) => setProfile({ ...profile, password: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                placeholder="Leave blank to keep current"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm Password</label>
                                            <input
                                                type="password"
                                                value={profile.confirmPassword}
                                                onChange={(e) => setProfile({ ...profile, confirmPassword: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                placeholder="Confirm new password"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-all shadow-md"
                                >
                                    <Save size={18} />
                                    {loading ? 'Saving Review...' : 'Save Profile Changes'}
                                </button>
                            </form>
                        </div>

                    </>)}
                    {activeTab === 'appearance' && !isRestricted && (<>

                        <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
                            <div className="flex items-center gap-3 mb-4">
                                <ImageIcon className="text-blue-600 dark:text-blue-400" size={24} />
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Appearance</h2>
                            </div>

                            <form onSubmit={handleSaveAppearance}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Application Name
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.appName}
                                        onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Mikrotik Manager"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Upload Logo (PNG)
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/png"
                                            onChange={(e) => handleFileUpload(e, 'logo')}
                                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Replaces the app logo. Recommended size: 512x512px.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Upload Favicon (ICO)
                                        </label>
                                        <input
                                            type="file"
                                            accept=".ico"
                                            onChange={(e) => handleFileUpload(e, 'favicon')}
                                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Replaces the browser tab icon.</p>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Or use Logo URL
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.logoUrl}
                                        onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="https://example.com/logo.png"
                                    />
                                </div>

                                {settings.logoUrl && (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Logo Preview
                                        </label>
                                        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                                            <img
                                                src={settings.logoUrl}
                                                alt="Logo preview"
                                                className="h-12 object-contain"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'block';
                                                }}
                                            />
                                            <p className="text-red-500 text-sm hidden">Failed to load image</p>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center gap-2 bg-accent text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:bg-gray-400 transition-all"
                                >
                                    <Save size={18} />
                                    {loading ? 'Saving...' : 'Save Appearance'}
                                </button>
                            </form>
                        </div>

                        {/* Language Settings */}
                        <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
                            <div className="flex items-center gap-3 mb-4">
                                <Globe className="text-green-600 dark:text-green-400" size={24} />
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{t('appSettings.language')}</h2>
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('appSettings.selectLanguage')}</p>
                                <div className="grid grid-cols-2 gap-4 max-w-md">
                                    <button
                                        type="button"
                                        onClick={() => setLanguage('id')}
                                        className={`p-4 rounded-lg border-2 flex items-center gap-3 transition-all ${language === 'id'
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        <span className="text-2xl">🇮🇩</span>
                                        <span className="font-medium">{t('appSettings.indonesian')}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLanguage('en')}
                                        className={`p-4 rounded-lg border-2 flex items-center gap-3 transition-all ${language === 'en'
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        <span className="text-2xl">🇺🇸</span>
                                        <span className="font-medium">{t('appSettings.english')}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Theme Settings (Available to ALL) */}
                        <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
                            <div className="flex items-center gap-3 mb-6">
                                <Palette className="text-purple-600 dark:text-purple-400" size={24} />
                                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Theme Settings</h2>
                            </div>

                            <div className="space-y-8">
                                {/* Mode Selection */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Mode</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        {modes.map((mode) => {
                                            const Icon = mode.icon;
                                            const isActive = theme.mode === mode.value;
                                            return (
                                                <button
                                                    key={mode.value}
                                                    onClick={() => updateTheme({ mode: mode.value })}
                                                    className={`
                                            flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
                                            ${isActive
                                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                                            : 'border-transparent bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                        }
                                        `}
                                                >
                                                    <Icon size={24} className="mb-2" />
                                                    <span className="text-sm font-medium">{mode.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Accent Color Selection */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Accent Color</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                        {Object.entries(accentColors).map(([name, color]) => (
                                            <button
                                                key={name}
                                                onClick={() => setAccentColor(name)}
                                                className={`
                                        group relative p-3 rounded-lg border-2 transition-all flex items-center justify-center
                                        ${theme.accentName === name ? 'border-gray-400 dark:border-gray-500 bg-white/50 dark:bg-gray-800/50' : 'border-transparent hover:bg-white/50 dark:hover:bg-gray-800/50'}
                                    `}
                                            >
                                                <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                                                <span className="ml-2 text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>


                    </>)}

                    {activeTab === 'payment' && !isRestricted && (
                        <PaymentGatewaySettings />
                    )}

                    {/* Display Preferences */}
                    {
                        activeTab === 'system' && !isRestricted && (
                            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
                                <div className="flex items-center gap-3 mb-4">
                                    <Clock className="text-blue-600 dark:text-blue-400" size={24} />
                                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Display Preferences</h2>
                                </div>

                                <form onSubmit={handleSavePreferences} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Date Format
                                            </label>
                                            <select
                                                value={preferences.display.dateFormat}
                                                onChange={(e) => setPreferences({
                                                    ...preferences,
                                                    display: { ...preferences.display, dateFormat: e.target.value }
                                                })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Time Format
                                            </label>
                                            <select
                                                value={preferences.display.timeFormat}
                                                onChange={(e) => setPreferences({
                                                    ...preferences,
                                                    display: { ...preferences.display, timeFormat: e.target.value }
                                                })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                <option value="12h">12-hour</option>
                                                <option value="24h">24-hour</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Bandwidth Unit
                                            </label>
                                            <select
                                                value={preferences.display.bandwidthUnit}
                                                onChange={(e) => setPreferences({
                                                    ...preferences,
                                                    display: { ...preferences.display, bandwidthUnit: e.target.value }
                                                })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                <option value="auto">Auto</option>
                                                <option value="bps">bps</option>
                                                <option value="Kbps">Kbps</option>
                                                <option value="Mbps">Mbps</option>
                                                <option value="Gbps">Gbps</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Memory Unit
                                            </label>
                                            <select
                                                value={preferences.display.memoryUnit}
                                                onChange={(e) => setPreferences({
                                                    ...preferences,
                                                    display: { ...preferences.display, memoryUnit: e.target.value }
                                                })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                <option value="auto">Auto</option>
                                                <option value="B">Bytes</option>
                                                <option value="KB">KB</option>
                                                <option value="MB">MB</option>
                                                <option value="GB">GB</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Temperature Unit
                                            </label>
                                            <select
                                                value={preferences.display.temperatureUnit}
                                                onChange={(e) => setPreferences({
                                                    ...preferences,
                                                    display: { ...preferences.display, temperatureUnit: e.target.value }
                                                })}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                <option value="celsius">Celsius (°C)</option>
                                                <option value="fahrenheit">Fahrenheit (°F)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center gap-2 bg-accent text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:bg-gray-400 transition-all"
                                    >
                                        <Save size={18} />
                                        {loading ? 'Saving...' : 'Save Preferences'}
                                    </button>
                                </form>
                            </div>
                        )
                    }



                    {/* Security Settings */}
                    {
                        activeTab === 'security' && !isRestricted && (
                            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
                                <div className="flex items-center gap-3 mb-4">
                                    <Shield className="text-red-600 dark:text-red-400" size={24} />
                                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Security Settings</h2>
                                </div>

                                <form onSubmit={handleSavePreferences} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Session Timeout (Auto Logout)
                                        </label>
                                        <select
                                            value={preferences.security?.sessionTimeout || 0}
                                            onChange={(e) => setPreferences({
                                                ...preferences,
                                                security: { ...preferences.security, sessionTimeout: parseInt(e.target.value) }
                                            })}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="0">Disabled</option>
                                            <option value="15">15 Minutes</option>
                                            <option value="30">30 Minutes</option>
                                            <option value="60">1 Hour</option>
                                            <option value="240">4 Hours</option>
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">Automatically logs out inactive users after specified time.</p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center gap-2 bg-accent text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:bg-gray-400 transition-all"
                                    >
                                        <Save size={18} />
                                        {loading ? 'Saving...' : 'Save Security Settings'}
                                    </button>
                                </form>
                            </div>
                        )
                    }

                    {/* Dashboard Settings */}
                    {
                        activeTab === 'system' && !isRestricted && (
                            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
                                <div className="flex items-center gap-3 mb-4">
                                    <Gauge className="text-blue-600 dark:text-blue-400" size={24} />
                                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Dashboard Settings</h2>
                                </div>

                                <form onSubmit={handleSavePreferences} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Auto-Refresh Interval
                                        </label>
                                        <select
                                            value={preferences.dashboard.refreshInterval}
                                            onChange={(e) => setPreferences({
                                                ...preferences,
                                                dashboard: { ...preferences.dashboard, refreshInterval: parseInt(e.target.value) }
                                            })}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="0">Disabled</option>
                                            <option value="5000">5 seconds</option>
                                            <option value="10000">10 seconds</option>
                                            <option value="30000">30 seconds</option>
                                            <option value="60000">1 minute</option>
                                            <option value="300000">5 minutes</option>
                                        </select>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center gap-2 bg-accent text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:bg-gray-400 transition-all"
                                    >
                                        <Save size={18} />
                                        {loading ? 'Saving...' : 'Save Dashboard Settings'}
                                    </button>
                                </form>
                            </div>
                        )
                    }

                    {/* Notification Settings */}
                    {
                        activeTab === 'system' && userRole !== 'viewer' && (
                            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
                                <div className="flex items-center gap-3 mb-4">
                                    <Bell className="text-yellow-600 dark:text-yellow-400" size={24} />
                                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Notification Settings</h2>
                                </div>

                                <form onSubmit={handleSavePreferences} className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <div>
                                            <h3 className="font-medium text-gray-900 dark:text-white">Browser Notifications</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Enable push notifications for critical alerts</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const { requestNotificationPermission } = await import('@/components/NotificationManager');
                                                const granted = await requestNotificationPermission();
                                                if (granted) {
                                                    setPreferences(prev => ({
                                                        ...prev,
                                                        notifications: { ...prev.notifications, enabled: true }
                                                    }));
                                                    alert('Notifications enabled!');
                                                } else {
                                                    alert('Permission denied. Please enable notifications in your browser settings.');
                                                }
                                            }}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.notifications?.enabled ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.notifications?.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={preferences.notifications?.highCpu !== false}
                                                        onChange={(e) => setPreferences({
                                                            ...preferences,
                                                            notifications: { ...preferences.notifications, highCpu: e.target.checked }
                                                        })}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    High CPU Alert
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-500">Threshold:</span>
                                                    <input
                                                        type="number"
                                                        min="50"
                                                        max="100"
                                                        value={preferences.notifications?.cpuThreshold || 80}
                                                        onChange={(e) => setPreferences({
                                                            ...preferences,
                                                            notifications: { ...preferences.notifications, cpuThreshold: parseInt(e.target.value) }
                                                        })}
                                                        className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    />
                                                    <span className="text-sm text-gray-500">%</span>
                                                </div>
                                            </div>



                                            <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <input
                                                    type="checkbox"
                                                    checked={preferences.notifications?.voltageLow !== false}
                                                    onChange={(e) => setPreferences({
                                                        ...preferences,
                                                        notifications: { ...preferences.notifications, voltageLow: e.target.checked }
                                                    })}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                System Voltage Low Alert (&lt; 10V)
                                            </label>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center gap-2 bg-accent text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:bg-gray-400 transition-all"
                                    >
                                        <Save size={18} />
                                        {loading ? 'Saving...' : 'Save Notification Settings'}
                                    </button>
                                </form>
                            </div>
                        )
                    }



                    {/* Admin User Settings */}
                    {
                        activeTab === 'security' && userRole === 'admin' && (
                            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
                                <div className="flex items-center gap-3 mb-4">
                                    <Key className="text-blue-600 dark:text-blue-400" size={24} />
                                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Change Admin Password</h2>
                                </div>

                                <form onSubmit={handleChangePassword}>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Admin Username
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.adminUsername}
                                            onChange={(e) => setSettings({ ...settings, adminUsername: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="admin"
                                            required
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            New Password
                                        </label>
                                        <input
                                            type="password"
                                            value={settings.newPassword}
                                            onChange={(e) => setSettings({ ...settings, newPassword: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="Enter new password"
                                            required
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Confirm Password
                                        </label>
                                        <input
                                            type="password"
                                            value={settings.confirmPassword}
                                            onChange={(e) => setSettings({ ...settings, confirmPassword: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="Confirm new password"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center gap-2 bg-accent text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:bg-gray-400 transition-all"
                                    >
                                        <User size={18} />
                                        {loading ? 'Changing...' : 'Change Password'}
                                    </button>
                                </form>
                            </div>
                        )
                    }
                </div>
            </div>
        </div >
    );
}
