import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, TextInput, Modal, KeyboardAvoidingView, ScrollView, Platform, Alert } from 'react-native';
import { apiFetch } from '../utils/api';
import { useData } from '../context/DataContext';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

export default function UsersScreen() {
    const { users, profiles, refreshUsers, refreshProfiles, refreshAll, loading } = useData();
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [selectedOptionsUser, setSelectedOptionsUser] = useState(null);

    const initialFormState = {
        name: '',
        password: '',
        profile: 'default',
        service: 'pppoe',
        customerName: '',
        customerAddress: '',
        customerPhone: '',
    };
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        // Just ensuring data is there on mount, though refreshAll usually called by Dashboard
        if (users.length === 0) refreshUsers();
        if (profiles.length === 0) refreshProfiles();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refreshAll();
        setRefreshing(false);
    }, [refreshAll]);

    const handleAddUser = () => {
        setFormData(initialFormState);
        setEditMode(false);
        setEditingUserId(null);
        setShowModal(true);
    };

    const handleEditUser = (user) => {
        let targetId = user['.id'];
        if (!targetId && user.id && user.id.includes('_')) {
            const parts = user.id.split('_');
            targetId = parts[parts.length - 1];
        }

        setFormData({
            name: user.name || '',
            password: '', // Leave blank unless changing
            profile: user.profile || 'default',
            service: user.service || 'pppoe',
            customerName: user.customerName || '',
            customerAddress: user.customerAddress || '',
            customerPhone: user.customerPhone || '',
        });
        setEditMode(true);
        setEditingUserId(targetId || user.name);
        setShowModal(true);
    };

    const handleDeleteUser = (user) => {
        Alert.alert(
            "Delete User",
            `Are you sure you want to delete ${user.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        let targetId = user['.id'] || user.name;
                        try {
                            const res = await apiFetch(`/api/pppoe/users/${encodeURIComponent(targetId)}`, {
                                method: 'DELETE'
                            });
                            if (res.ok) {
                                Alert.alert("Success", "User deleted successfully");
                                refreshUsers();
                            } else {
                                const data = await res.json();
                                Alert.alert("Error", data.error || "Failed to delete user");
                            }
                        } catch (err) {
                            Alert.alert("Error", "Network error. Could not delete.");
                        }
                    }
                }
            ]
        );
    };

    const handleSave = async () => {
        if (!formData.name || !formData.profile) {
            Alert.alert('Validation Error', 'Username and Profile are required.');
            return;
        }

        if (!editMode && !formData.password) {
            Alert.alert('Validation Error', 'Password is required for new users.');
            return;
        }

        setSaving(true);
        try {
            const url = editMode ? `/api/pppoe/users/${encodeURIComponent(editingUserId)}` : '/api/pppoe/users';
            const method = editMode ? 'PUT' : 'POST';

            const res = await apiFetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                if (data.message && data.message.includes('approval')) {
                    Alert.alert('Pending Approval', data.message);
                } else {
                    Alert.alert('Success', `User ${editMode ? 'updated' : 'created'} successfully!`);
                }
                setShowModal(false);
                refreshUsers();
            } else {
                Alert.alert('Error', data.error || 'Failed to save user');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error while saving user');
        } finally {
            setSaving(false);
        }
    };

    const filteredUsers = users.filter((u) =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.username?.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => setSelectedOptionsUser(item)}>
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <Text style={styles.name}>{item.name || item.username}</Text>
                    <Text style={styles.username}>@{item.username}</Text>
                </View>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.isActive ? '#dcfce7' : '#fee2e2' }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: item.isActive ? '#166534' : '#991b1b' }
                    ]}>
                        {item.isActive ? 'Online' : 'Offline'}
                    </Text>
                </View>
            </View>
            <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                    <Ionicons name="speedometer-outline" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>{item.profile || 'Default'}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={14} color="#6b7280" />
                    <Text style={styles.detailText}>{item.address || '-'}</Text>
                </View>
                {item.isActive && item.uptime && (
                    <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={14} color="#6b7280" />
                        <Text style={styles.detailText}>{item.uptime}</Text>
                    </View>
                )}
            </View>
            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.moreButton} onPress={() => setSelectedOptionsUser(item)}>
                    <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <View style={styles.headerControls}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search users..."
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
                <TouchableOpacity style={styles.addButton} onPress={handleAddUser}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={Array.isArray(filteredUsers) ? filteredUsers : []}
                    keyExtractor={(item) => item?.id?.toString() || item?.name || Math.random().toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No users found.</Text>
                        </View>
                    )}
                />
            )}

            {/* Options Modal */}
            <Modal visible={!!selectedOptionsUser} animationType="slide" transparent={true} onRequestClose={() => setSelectedOptionsUser(null)}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalDismissArea} activeOpacity={1} onPress={() => setSelectedOptionsUser(null)} />
                    <View style={styles.optionsContent}>
                        <View style={styles.optionsHeader}>
                            <Text style={styles.optionsTitle}>{selectedOptionsUser?.name || selectedOptionsUser?.username}</Text>
                        </View>
                        <TouchableOpacity style={styles.optionButton} onPress={() => { const user = selectedOptionsUser; setSelectedOptionsUser(null); handleEditUser(user); }}>
                            <Ionicons name="create-outline" size={24} color="#2563eb" />
                            <Text style={styles.optionText}>Edit User</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.optionButton} onPress={() => { const user = selectedOptionsUser; setSelectedOptionsUser(null); handleDeleteUser(user); }}>
                            <Ionicons name="trash-outline" size={24} color="#ef4444" />
                            <Text style={[styles.optionText, { color: '#ef4444' }]}>Delete User</Text>
                        </TouchableOpacity>
                        <View style={styles.optionsDivider} />
                        <TouchableOpacity style={styles.optionCancel} onPress={() => setSelectedOptionsUser(null)}>
                            <Text style={styles.optionCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Add/Edit User Modal */}
            <Modal visible={showModal} animationType="slide" transparent={true}>
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editMode ? 'Edit User' : 'Add User'}</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close" size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.formScroll}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Username *</Text>
                                <TextInput
                                    style={[styles.input, editMode && styles.inputDisabled]}
                                    value={formData.name}
                                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                                    editable={!editMode}
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Password {editMode ? '(Leave blank to keep)' : '*'}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.password}
                                    onChangeText={(text) => setFormData({ ...formData, password: text })}
                                    secureTextEntry
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Profile *</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={formData.profile}
                                        onValueChange={(itemValue) => setFormData({ ...formData, profile: itemValue })}
                                        style={styles.picker}
                                    >
                                        <Picker.Item label="Default" value="default" />
                                        {Array.isArray(profiles) && profiles.map((p, i) => (
                                            <Picker.Item key={i} label={p?.name || 'Unknown'} value={p?.name || ''} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Full Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.customerName}
                                    onChangeText={(text) => setFormData({ ...formData, customerName: text })}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Phone</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.customerPhone}
                                    onChangeText={(text) => setFormData({ ...formData, customerPhone: text })}
                                    keyboardType="phone-pad"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Address</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={formData.customerAddress}
                                    onChangeText={(text) => setFormData({ ...formData, customerAddress: text })}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                            <View style={{ height: 20 }} />
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: 15,
        paddingBottom: 5,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginRight: 10,
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, paddingVertical: 10, fontSize: 16 },
    addButton: {
        backgroundColor: '#2563eb',
        width: 44,
        height: 44,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    listContainer: { paddingHorizontal: 15, paddingBottom: 20, paddingTop: 10 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        paddingBottom: 10,
    },
    userInfo: { flex: 1 },
    name: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
    username: { fontSize: 14, color: '#6b7280', marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: 'bold' },
    cardDetails: { gap: 6 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailText: { fontSize: 13, color: '#4b5563' },
    actionButtons: {
        position: 'absolute',
        top: 15,
        right: 15,
        flexDirection: 'row',
        gap: 15,
    },
    moreButton: {
        padding: 5,
    },
    errorContainer: { margin: 15, padding: 15, backgroundColor: '#fee2e2', borderRadius: 8 },
    errorText: { color: '#b91c1c' },
    emptyContainer: { padding: 20, alignItems: 'center' },
    emptyText: { color: '#6b7280', fontSize: 16 },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    formScroll: { padding: 20 },
    inputGroup: { marginBottom: 15 },
    label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 5 },
    input: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
    },
    inputDisabled: { backgroundColor: '#f3f4f6', color: '#9ca3af' },
    textArea: { height: 80, textAlignVertical: 'top' },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        overflow: 'hidden',
    },
    picker: { height: 50, width: '100%' },
    modalActions: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        justifyContent: 'flex-end',
        gap: 10,
    },
    cancelBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 },
    cancelBtnText: { color: '#4b5563', fontSize: 16, fontWeight: '500' },
    saveBtn: {
        backgroundColor: '#2563eb',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '500' },

    // Options Modal Styles
    modalDismissArea: { flex: 1 },
    optionsContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 30,
        paddingHorizontal: 20,
    },
    optionsHeader: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        alignItems: 'center',
        marginBottom: 10,
    },
    optionsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        gap: 15,
    },
    optionText: {
        fontSize: 16,
        color: '#1f2937',
        fontWeight: '500',
    },
    optionsDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 10,
    },
    optionCancel: {
        alignItems: 'center',
        paddingVertical: 15,
    },
    optionCancelText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6b7280',
    },
});
