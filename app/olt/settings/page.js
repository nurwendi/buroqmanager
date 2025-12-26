"use client";

import { useOlt } from "@/contexts/OltContext";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Edit2, Plus, Server, Save, X } from "lucide-react";

export default function OltSettingsPage() {
    const { olts, refreshOlts } = useOlt();
    const [editingId, setEditingId] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        host: "",
        port: 23,
        username: "",
        password: ""
    });

    const resetForm = () => {
        setFormData({ name: "", host: "", port: 23, username: "", password: "" });
        setEditingId(null);
        setIsAdding(false);
    };

    const handleEdit = (olt) => {
        setFormData({ ...olt, password: "" }); // Clear password for security
        setEditingId(olt.id);
        setIsAdding(false);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this OLT?")) return;

        try {
            const res = await fetch(`/api/settings/olt/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            toast.success("OLT Deleted");
            refreshOlts();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const url = editingId ? `/api/settings/olt/${editingId}` : "/api/settings/olt";
            const method = editingId ? "PUT" : "POST";

            // For updates, we send password only if changed (handled by backend logic mostly, but frontend clears it)
            // If password empty on edit, backend retains old one.

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save");
            }

            toast.success(editingId ? "OLT Updated" : "OLT Added");
            refreshOlts();
            resetForm();
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">OLT Configurations</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage your OLT devices and connection credentials.</p>
                </div>
                {!isAdding && !editingId && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={18} /> Add OLT
                    </button>
                )}
            </div>

            {/* List View */}
            {!isAdding && !editingId && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {olts.map(olt => (
                        <div key={olt.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative group">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                        <Server size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{olt.name}</h3>
                                        <p className="text-xs text-gray-500 font-mono">{olt.host}:{olt.port}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(olt)}
                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(olt.id)}
                                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-3 text-xs text-gray-500">
                                Username: <span className="font-mono text-gray-700 dark:text-gray-300">{olt.username}</span>
                            </div>
                        </div>
                    ))}

                    {olts.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            No OLTs configured. Click "Add OLT" to start.
                        </div>
                    )}
                </div>
            )}

            {/* Editor View */}
            {(isAdding || editingId) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            {editingId ? "Edit OLT" : "Add New OLT"}
                        </h2>
                        <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Friendly Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Server Room OLT"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hostname / IP</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="192.168.1.1"
                                    value={formData.host}
                                    onChange={e => setFormData({ ...formData, host: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Port</label>
                                <input
                                    type="number"
                                    required
                                    value={formData.port}
                                    onChange={e => setFormData({ ...formData, port: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                <input
                                    type="password"
                                    placeholder={editingId ? "Leave blank to keep unchanged" : "Password"}
                                    required={!editingId}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <Save size={18} /> Save OLT
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
