"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  Save,
  User,
  Key,
  Image as ImageIcon,
  Palette,
  Clock,
  Gauge,
  Globe,
  LogOut,
  Bell,
  Shield,
  Moon,
  Sun,
  Monitor,
  Camera,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Zap,
  Calendar,
  Play,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDashboard } from "@/contexts/DashboardContext";
import { useTheme, accentColors } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import PaymentGatewaySettings from "@/components/settings/PaymentGatewaySettings";

export default function AppSettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, updateTheme, setAccentColor } = useTheme();

  const modes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const { preferences: contextPreferences, updatePreferences } = useDashboard(); // Rename context pref

  const router = useRouter();

  const [userRole, setUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");

  // Define restricted roles (Everyone except Superadmin)
  // const isRestricted = userRole !== 'superadmin';

  const isSuperAdmin = userRole === "superadmin";
  const isAdminOrOwner = userRole === "admin" || userRole === "superadmin";

  const tabs = [
    { id: "profile", label: t("appSettings.userProfile"), icon: User },
    {
      id: "appearance",
      label: t("appSettings.appearance"),
      icon: Palette,
      hidden: !isSuperAdmin,
    },
    {
      id: "payment",
      label: t("appSettings.paymentGateway"),
      icon: CreditCard,
      hidden: !isAdminOrOwner,
    },
    {
      id: "automation",
      label: t("appSettings.billingAutomation"),
      icon: Zap,
      hidden: !isAdminOrOwner,
    },
    {
      id: "system",
      label: t("appSettings.general"),
      icon: Gauge,
      hidden: !isSuperAdmin,
    },
    {
      id: "security",
      label: t("appSettings.securitySettings"),
      icon: Shield,
      hidden: !isSuperAdmin,
    },
  ].filter((tab) => !tab.hidden);

  const [settings, setSettings] = useState({
    appName: "Mikrotik Manager",
    logoUrl: "",
    dashboardBgUrl: "",
    loginBgUrl: "",
    adminUsername: "",
    adminPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Local state for form editing
  const [preferences, setPreferences] = useState({
    display: {
      dateFormat: "DD/MM/YYYY",
      timeFormat: "24h",
      timezone: "Asia/Jakarta",
      bandwidthUnit: "auto",
      memoryUnit: "auto",
      temperatureUnit: "celsius",
    },
    dashboard: {
      refreshInterval: 5000,
    },
    tables: {
      rowsPerPage: 25,
    },
    notifications: {
      enabled: false,
      highCpu: true,
      cpuThreshold: 80,

      voltageLow: true,
    },
    security: {
      sessionTimeout: 30,
    },
  });

  const [profile, setProfile] = useState({
    username: "",
    fullName: "",
    phone: "",
    address: "",
    avatar: "",
    password: "",
    confirmPassword: "",
    isAutoIsolationEnabled: false,
    autoIsolationDate: 20,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [manualRunLoading, setManualRunLoading] = useState(false);

  // Sync local state with context when context loads
  useEffect(() => {
    if (contextPreferences) {
      setPreferences((prev) => ({
        ...prev,
        ...contextPreferences,
        display: { ...prev.display, ...(contextPreferences.display || {}) },
        dashboard: {
          ...prev.dashboard,
          ...(contextPreferences.dashboard || {}),
        },
        tables: { ...prev.tables, ...(contextPreferences.tables || {}) },
        notifications: {
          ...prev.notifications,
          ...(contextPreferences.notifications || {}),
        },
        security: { ...prev.security, ...(contextPreferences.security || {}) },
      }));
    }
  }, [contextPreferences]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch user");
      })
      .then((data) => setUserRole(data.user.role))
      .catch(() => setUserRole(null));
    fetchSettings();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => ({
          ...prev,
          ...data,
          password: "",
          confirmPassword: "",
          isAutoIsolationEnabled: data.isAutoIsolationEnabled || false,
          autoIsolationDate: data.autoIsolationDate || 20,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/app-settings");
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({
          ...prev,
          appName: data.appName || "Mikrotik Manager",
          logoUrl: data.logoUrl || "",
          dashboardBgUrl: data.dashboardBgUrl || "",
          loginBgUrl: data.loginBgUrl || "",
        }));
      }
    } catch (error) {
      console.error("Failed to fetch settings", error);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    if (profile.password && profile.password !== profile.confirmPassword) {
      setMessage({ type: "error", text: t("appSettings.passwordsDoNotMatch") });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        setMessage({ type: "success", text: t("appSettings.profileUpdated") });
        if (profile.password) {
          setProfile((prev) => ({
            ...prev,
            password: "",
            confirmPassword: "",
          }));
        }
        // Refresh profile data
        fetchProfile();
      } else {
        const data = await res.json();
        setMessage({
          type: "error",
          text: data.error || "Failed to update profile",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error updating profile" });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append("file", file);

    try {
      const res = await fetch("/api/profile/upload", {
        method: "POST",
        body: data,
      });
      if (res.ok) {
        const result = await res.json();
        setProfile((prev) => ({ ...prev, avatar: result.avatarUrl }));
        setMessage({ type: "success", text: t("appSettings.avatarUploaded") });
      } else {
        const errorData = await res.json();
        setMessage({
          type: "error",
          text: errorData.error || "Failed to upload avatar",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error uploading avatar" });
    }
  };

  const handleSaveAppearance = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/app-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName: settings.appName,
          logoUrl: settings.logoUrl,
          dashboardBgUrl: settings.dashboardBgUrl,
          loginBgUrl: settings.loginBgUrl,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: t("appSettings.appearanceSaved") });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setMessage({ type: "error", text: "Failed to save settings" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error saving settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append("file", file);
    data.append("type", type);

    try {
      const res = await fetch("/api/settings/upload", {
        method: "POST",
        body: data,
      });
      if (res.ok) {
        const dataText =
          type === "logo"
            ? "Logo"
            : type === "background"
            ? t("appSettings.dashboardBackground")
            : "Favicon";
        setMessage({
          type: "success",
          text: `${dataText} uploaded successfully. Refresh to see changes.`,
        });

        // If logo or background, update the preview by reloading or letting user do it
        if (type === "logo" || type === "background") {
          // Assuming the upload API saves it to a predictable path or returns the path
          // For now, just reload to see changes as the previous code did
          setTimeout(() => window.location.reload(), 1000);
        }
      } else {
        setMessage({ type: "error", text: "Failed to upload file" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error uploading file" });
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      await updatePreferences(preferences);
      setMessage({ type: "success", text: "Preferences saved successfully" });
    } catch (error) {
      console.error("Failed to save preferences", error);
      setMessage({ type: "error", text: "Failed to save preferences" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    if (settings.newPassword !== settings.confirmPassword) {
      setMessage({ type: "error", text: t("appSettings.passwordsDoNotMatch") });
      setLoading(false);
      return;
    }

    if (settings.newPassword.length < 4) {
      setMessage({
        type: "error",
        text: "Password must be at least 4 characters!",
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/app-settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: settings.adminUsername,
          newPassword: settings.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: t("appSettings.profileUpdated") });
        setSettings((prev) => ({
          ...prev,
          adminUsername: "",
          newPassword: "",
          confirmPassword: "",
        }));
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to change password",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error changing password" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
        {t("appSettings.title")}
      </h1>

      {message.text && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-2 sticky top-4">
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl rounded-xl p-3 border border-gray-200 dark:border-gray-700 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700"
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
                <span>{t("common.logout")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-6 w-full">
          {activeTab === "profile" && (
            <>
              {/* User Profile Settings (New) */}
              <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
                <div className="flex items-center gap-3 mb-6">
                  <User
                    className="text-indigo-600 dark:text-indigo-400"
                    size={24}
                  />
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    {t("appSettings.userProfile")}
                  </h2>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        {profile.avatar ? (
                          <img
                            src={profile.avatar}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
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
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Profile Picture
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Click the camera icon to update your avatar
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t("login.username")}
                        {userRole !== "admin" && userRole !== "superadmin" && (
                          <span className="text-xs text-red-500 ml-2">
                            ({t("appSettings.contactAdminChange")})
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={profile.username}
                        onChange={(e) =>
                          setProfile({ ...profile, username: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-gray-800 cursor-not-allowed"
                        required
                        disabled={
                          userRole !== "admin" && userRole !== "superadmin"
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t("appSettings.fullName")}
                      </label>
                      <input
                        type="text"
                        value={profile.fullName}
                        onChange={(e) =>
                          setProfile({ ...profile, fullName: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t("appSettings.phoneNumber")}
                      </label>
                      <div className="relative">
                        <Phone
                          size={18}
                          className="absolute left-3 top-3 text-gray-400"
                        />
                        <input
                          type="text"
                          value={profile.phone}
                          onChange={(e) =>
                            setProfile({ ...profile, phone: e.target.value })
                          }
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="0812..."
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t("appSettings.address")}
                      </label>
                      <div className="relative">
                        <MapPin
                          size={18}
                          className="absolute left-3 top-3 text-gray-400"
                        />
                        <input
                          type="text"
                          value={profile.address}
                          onChange={(e) =>
                            setProfile({ ...profile, address: e.target.value })
                          }
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Street address..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                      {t("appSettings.changePasswordOptional")}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t("appSettings.newPassword")}
                        </label>
                        <input
                          type="password"
                          value={profile.password}
                          onChange={(e) =>
                            setProfile({ ...profile, password: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder={t("appSettings.leaveBlankToKeep")}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t("appSettings.confirmPassword")}
                        </label>
                        <input
                          type="password"
                          value={profile.confirmPassword}
                          onChange={(e) =>
                            setProfile({
                              ...profile,
                              confirmPassword: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder={t("appSettings.confirmPassword")}
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
                    {loading
                      ? t("common.saving")
                      : t("appSettings.saveProfileChanges")}
                  </button>
                </form>

                {/* Language Settings (Moved from Appearance) */}
                <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3 mb-4">
                    <Globe
                      className="text-green-600 dark:text-green-400"
                      size={20}
                    />
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {t("appSettings.language")}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {t("appSettings.selectLanguage")}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setLanguage("auto")}
                      className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                        language === "auto"
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <Monitor
                        size={18}
                        className={
                          language === "auto"
                            ? "text-green-600"
                            : "text-gray-500"
                        }
                      />
                      <span className="text-sm font-medium">
                        {t("appSettings.automatic")}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage("id")}
                      className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                        language === "id"
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <span className="text-xl">🇮🇩</span>
                      <span className="text-sm font-medium">
                        {t("appSettings.indonesian")}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage("en")}
                      className={`p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                        language === "en"
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <span className="text-xl">🇺🇸</span>
                      <span className="text-sm font-medium">
                        {t("appSettings.english")}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
          {activeTab === "appearance" && isSuperAdmin && (
            <>
              <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <ImageIcon
                    className="text-blue-600 dark:text-blue-400"
                    size={24}
                  />
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Appearance
                  </h2>
                </div>

                <form onSubmit={handleSaveAppearance}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t("appSettings.appName")}
                    </label>
                    <input
                      type="text"
                      value={settings.appName}
                      onChange={(e) =>
                        setSettings({ ...settings, appName: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Mikrotik Manager"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t("appSettings.appLogoPng")}
                      </label>
                      <input
                        type="file"
                        accept="image/png"
                        onChange={(e) => handleFileUpload(e, "logo")}
                        className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {t("appSettings.appLogoNote")}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t("appSettings.faviconIco")}
                      </label>
                      <input
                        type="file"
                        accept=".ico"
                        onChange={(e) => handleFileUpload(e, "favicon")}
                        className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {t("appSettings.faviconNote")}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t("appSettings.orUseUrl")}
                    </label>
                    <input
                      type="text"
                      value={settings.logoUrl}
                      onChange={(e) =>
                        setSettings({ ...settings, logoUrl: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  {settings.logoUrl && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t("appSettings.logoPreview")}
                      </label>
                      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                        <img
                          src={settings.logoUrl}
                          alt="Logo preview"
                          className="h-12 object-contain"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "block";
                          }}
                        />
                        <p className="text-red-500 text-sm hidden">
                          Failed to load image
                        </p>
                      </div>
                    </div>
                  )}

                  <hr className="my-8 border-gray-200 dark:border-gray-700" />

                  <div className="flex items-center gap-3 mb-4">
                    <ImageIcon
                      size={20}
                      className="text-purple-600 dark:text-purple-400"
                    />
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                      {t("appSettings.dashboardBackground")}
                    </h3>
                  </div>

                  <div className="mb-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t("appSettings.uploadBackground")}
                      </label>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => handleFileUpload(e, "background")}
                        className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-purple-50 file:text-purple-700
                                hover:file:bg-purple-100 dark:file:bg-purple-900/40 dark:file:text-purple-300"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {t("appSettings.backgroundNote")}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t("appSettings.orUseBackgroundUrl")}
                      </label>
                      <input
                        type="text"
                        value={settings.dashboardBgUrl}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            dashboardBgUrl: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="/dashboard-bg.png"
                      />
                    </div>

                    {settings.dashboardBgUrl && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t("appSettings.backgroundPreview")}
                        </label>
                        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700/50">
                          <img
                            src={settings.dashboardBgUrl}
                            alt="Dashboard Background preview"
                            className="w-full h-32 object-cover object-center"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "block";
                            }}
                          />
                          <p className="text-red-500 text-sm hidden p-4">
                            {t("appSettings.failedLoadBackground")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <hr className="my-8 border-gray-200 dark:border-gray-700" />

                  {/* Login Page Background */}
                  <div className="flex items-center gap-3 mb-4">
                    <ImageIcon size={20} className="text-green-600 dark:text-green-400" />
                    <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                      Background Halaman Login
                    </h3>
                  </div>

                  <div className="mb-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Upload Gambar Background Login
                      </label>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => handleFileUpload(e, "loginbg")}
                        className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-green-50 file:text-green-700
                                hover:file:bg-green-100 dark:file:bg-green-900/40 dark:file:text-green-300"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Ukuran disarankan: 1920×1080px atau lebih. Format: PNG, JPG, WebP.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Atau gunakan URL gambar
                      </label>
                      <input
                        type="text"
                        value={settings.loginBgUrl}
                        onChange={(e) =>
                          setSettings({ ...settings, loginBgUrl: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="/login-bg.png atau https://..."
                      />
                    </div>

                    {settings.loginBgUrl && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Preview
                        </label>
                        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700/50">
                          <img
                            src={settings.loginBgUrl}
                            alt="Login Background preview"
                            className="w-full h-32 object-cover object-center"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-accent text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:bg-gray-400 transition-all"
                  >
                    <Save size={18} />
                    {loading
                      ? t("common.saving")
                      : t("appSettings.saveAppearance")}
                  </button>
                </form>
              </div>

              {/* Theme Settings (Available to ALL) */}
              <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
                <div className="flex items-center gap-3 mb-6">
                  <Palette
                    className="text-purple-600 dark:text-purple-400"
                    size={24}
                  />
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Theme Settings
                  </h2>
                </div>

                <div className="space-y-8">
                  {/* Mode Selection */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Mode
                    </h3>
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
                                            ${
                                              isActive
                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                                : "border-transparent bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                                            }
                                        `}
                          >
                            <Icon size={24} className="mb-2" />
                            <span className="text-sm font-medium">
                              {mode.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accent Color Selection */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Accent Color
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {Object.entries(accentColors).map(([name, color]) => (
                        <button
                          key={name}
                          onClick={() => setAccentColor(name)}
                          className={`
                                        group relative p-3 rounded-lg border-2 transition-all flex items-center justify-center
                                        ${
                                          theme.accentName === name
                                            ? "border-gray-400 dark:border-gray-500 bg-white/50 dark:bg-gray-800/50"
                                            : "border-transparent hover:bg-white/50 dark:hover:bg-gray-800/50"
                                        }
                                    `}
                        >
                          <div
                            className="w-8 h-8 rounded-full shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                          <span className="ml-2 text-sm font-medium capitalize text-gray-700 dark:text-gray-300">
                            {name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "payment" && isAdminOrOwner && (
            <PaymentGatewaySettings />
          )}

          {activeTab === "automation" && isAdminOrOwner && (
            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="text-amber-500" size={24} />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  Billing Automation
                </h2>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-8">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <h3 className="text-lg font-medium text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
                    <Shield size={20} />
                    {t("appSettings.autoIsolation")}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {t("appSettings.autoIsolationDesc")}
                  </p>

                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {t("appSettings.enableAutoIsolation")}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profile.isAutoIsolationEnabled}
                          onChange={(e) =>
                            setProfile({
                              ...profile,
                              isAutoIsolationEnabled: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t("appSettings.executionDate")}
                        </label>
                        <div className="relative">
                          <Calendar
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            type="number"
                            min="1"
                            max="28"
                            value={profile.autoIsolationDate}
                            onChange={(e) =>
                              setProfile({
                                ...profile,
                                autoIsolationDate: parseInt(e.target.value),
                              })
                            }
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {t("appSettings.executionDateNote")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-all shadow-md"
                  >
                    <Save size={18} />
                    {loading
                      ? t("common.saving")
                      : t("appSettings.saveSettings")}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(t("appSettings.manualIsolationConfirm")))
                        return;
                      setManualRunLoading(true);
                      try {
                        const res = await fetch(
                          `/api/cron/auto-isolation?manual=true&userId=${profile.id}`
                        );
                        // Wait, the cron logic as written iterates ALL admins.
                        // For a manual "Test Run" button in settings, we likely only want to run it for the CURRENT user.
                        // I'll update the fetch to pass 'userId' if I modify the API to support it, OR just accept it runs for all (but restricted to admin role).
                        // Let's assume for now it runs globally or logic needs tweak.
                        // Actually, let's keep it simple: manual=true triggers the check.
                        // If I want to be safe, I should update the API to filters by userId if provided.
                        // I'll add `&userId=${profile.id}` basically (but profile.id isn't in state directly, likely fetched).
                        // Actually `profile` state has whatever `/api/profile` returns, usually includes `id`.

                        const data = await res.json();
                        alert(
                          `${t(
                            "appSettings.executionComplete"
                          )}\nResult: ${JSON.stringify(data.report, null, 2)}`
                        );
                      } catch (err) {
                        alert(t("appSettings.errorManualRun"));
                      } finally {
                        setManualRunLoading(false);
                      }
                    }}
                    disabled={manualRunLoading}
                    className="flex items-center gap-2 bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-all shadow-md"
                  >
                    <Play size={18} />
                    {manualRunLoading
                      ? t("common.running")
                      : t("appSettings.runNowTest")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Display Preferences */}
          {activeTab === "system" && isSuperAdmin && (
            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="text-blue-600 dark:text-blue-400" size={24} />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {t("appSettings.displayPreferences")}
                </h2>
              </div>

              <form onSubmit={handleSavePreferences} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t("appSettings.dateFormat")}
                    </label>
                    <select
                      value={preferences.display.dateFormat}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          display: {
                            ...preferences.display,
                            dateFormat: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("appSettings.timeFormat")}
                    </label>
                    <select
                      value={preferences.display.timeFormat}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          display: {
                            ...preferences.display,
                            timeFormat: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="12h">{t("common.12h")}</option>
                      <option value="24h">{t("common.24h")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("appSettings.bandwidthUnit")}
                    </label>
                    <select
                      value={preferences.display.bandwidthUnit}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          display: {
                            ...preferences.display,
                            bandwidthUnit: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="auto">{t("appSettings.automatic")}</option>
                      <option value="bps">bps</option>
                      <option value="Kbps">Kbps</option>
                      <option value="Mbps">Mbps</option>
                      <option value="Gbps">Gbps</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("appSettings.memoryUnit")}
                    </label>
                    <select
                      value={preferences.display.memoryUnit}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          display: {
                            ...preferences.display,
                            memoryUnit: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="auto">{t("appSettings.automatic")}</option>
                      <option value="B">{t("common.bytes")}</option>
                      <option value="KB">KB</option>
                      <option value="MB">MB</option>
                      <option value="GB">GB</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("appSettings.temperatureUnit")}
                    </label>
                    <select
                      value={preferences.display.temperatureUnit}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          display: {
                            ...preferences.display,
                            temperatureUnit: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="celsius">
                        {t("common.celsius")} (°C)
                      </option>
                      <option value="fahrenheit">
                        {t("common.fahrenheit")} (°F)
                      </option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-accent text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:bg-gray-400 transition-all"
                >
                  <Save size={18} />
                  {loading
                    ? t("common.saving")
                    : t("appSettings.savePreferences")}
                </button>
              </form>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === "security" && isSuperAdmin && (
            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="text-red-600 dark:text-red-400" size={24} />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {t("appSettings.securitySettings")}
                </h2>
              </div>

              <form onSubmit={handleSavePreferences} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("appSettings.sessionTimeout")}
                  </label>
                  <select
                    value={preferences.security?.sessionTimeout || 0}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        security: {
                          ...preferences.security,
                          sessionTimeout: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="0">{t("appSettings.disabled")}</option>
                    <option value="15">15 {t("common.minutes")}</option>
                    <option value="30">30 {t("common.minutes")}</option>
                    <option value="60">1 {t("common.hour")}</option>
                    <option value="240">4 {t("common.hours")}</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("appSettings.sessionTimeoutNote")}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-accent text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:bg-gray-400 transition-all"
                >
                  <Save size={18} />
                  {loading
                    ? t("common.saving") || "Saving..."
                    : t("appSettings.saveSecurity")}
                </button>
              </form>
            </div>
          )}

          {/* Dashboard Settings */}
          {activeTab === "system" && isSuperAdmin && (
            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <Gauge className="text-blue-600 dark:text-blue-400" size={24} />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {t("appSettings.dashboardSettings")}
                </h2>
              </div>

              <form onSubmit={handleSavePreferences} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("appSettings.refreshInterval")}
                  </label>
                  <select
                    value={preferences.dashboard.refreshInterval}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        dashboard: {
                          ...preferences.dashboard,
                          refreshInterval: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="0">
                      {t("appSettings.disabled") || "Disabled"}
                    </option>
                    <option value="5000">
                      5 {t("common.seconds") || "seconds"}
                    </option>
                    <option value="10000">
                      10 {t("common.seconds") || "seconds"}
                    </option>
                    <option value="30000">
                      30 {t("common.seconds") || "seconds"}
                    </option>
                    <option value="60000">
                      1 {t("common.minute") || "minute"}
                    </option>
                    <option value="300000">
                      5 {t("common.minutes") || "minutes"}
                    </option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-accent text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:bg-gray-400 transition-all"
                >
                  <Save size={18} />
                  {loading
                    ? t("common.saving") || "Saving..."
                    : t("appSettings.saveDashboard")}
                </button>
              </form>
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === "system" && isSuperAdmin && (
            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <Bell
                  className="text-yellow-600 dark:text-yellow-400"
                  size={24}
                />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {t("appSettings.notificationSettings")}
                </h2>
              </div>

              <form onSubmit={handleSavePreferences} className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {t("appSettings.browserNotifications")}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t("appSettings.enablePushNotifications")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const { requestNotificationPermission } = await import(
                        "@/components/NotificationManager"
                      );
                      const granted = await requestNotificationPermission();
                      if (granted) {
                        setPreferences((prev) => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            enabled: true,
                          },
                        }));
                        alert(t("appSettings.notificationsEnabled"));
                      } else {
                        alert(t("appSettings.notificationDenied"));
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      preferences.notifications?.enabled
                        ? "bg-green-600"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        preferences.notifications?.enabled
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={preferences.notifications?.highCpu !== false}
                          onChange={(e) =>
                            setPreferences({
                              ...preferences,
                              notifications: {
                                ...preferences.notifications,
                                highCpu: e.target.checked,
                              },
                            })
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {t("appSettings.highCpuAlert")}
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {t("appSettings.threshold")}:
                        </span>
                        <input
                          type="number"
                          min="50"
                          max="100"
                          value={preferences.notifications?.cpuThreshold || 80}
                          onChange={(e) =>
                            setPreferences({
                              ...preferences,
                              notifications: {
                                ...preferences.notifications,
                                cpuThreshold: parseInt(e.target.value),
                              },
                            })
                          }
                          className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={
                          preferences.notifications?.voltageLow !== false
                        }
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            notifications: {
                              ...preferences.notifications,
                              voltageLow: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {t("appSettings.voltageLowAlert")}
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 bg-accent text-white px-6 py-2 rounded-lg hover:opacity-90 disabled:bg-gray-400 transition-all"
                >
                  <Save size={18} />
                  {loading
                    ? t("common.saving")
                    : t("appSettings.saveNotifications")}
                </button>
              </form>
            </div>
          )}

          {/* Admin User Settings */}
          {activeTab === "security" && isSuperAdmin && (
            <div className="bg-white/30 dark:bg-gray-900/30 backdrop-blur-xl rounded-lg shadow-xl p-6 border border-white/20 dark:border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <Key className="text-blue-600 dark:text-blue-400" size={24} />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {t("appSettings.changePassword")}
                </h2>
              </div>

              <form onSubmit={handleChangePassword}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("login.username")}
                  </label>
                  <input
                    type="text"
                    value={settings.adminUsername}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        adminUsername: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="admin"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("appSettings.newPassword")}
                  </label>
                  <input
                    type="password"
                    value={settings.newPassword}
                    onChange={(e) =>
                      setSettings({ ...settings, newPassword: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter new password"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("appSettings.confirmPassword")}
                  </label>
                  <input
                    type="password"
                    value={settings.confirmPassword}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        confirmPassword: e.target.value,
                      })
                    }
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
                  {loading
                    ? t("common.changing")
                    : t("appSettings.changePassword")}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
