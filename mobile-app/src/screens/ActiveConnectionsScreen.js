import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { apiFetch } from '../utils/api';
import { useData } from '../context/DataContext';
import { Ionicons } from '@expo/vector-icons';

export default function ActiveConnectionsScreen() {
    const { activeConnections: connections, refreshActiveConnections, refreshAll, loading } = useData();
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [selectedConnection, setSelectedConnection] = useState(null);

    useEffect(() => {
        if (connections.length === 0) refreshActiveConnections();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refreshAll();
        setRefreshing(false);
    }, [refreshAll]);

    const handleDisconnect = (conn) => {
        Alert.alert(
            "Disconnect User",
            `Are you sure you want to disconnect ${conn.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Disconnect",
                    style: "destructive",
                    onPress: async () => {
                        const targetId = conn['.id'];
                        try {
                            const res = await apiFetch(`/api/pppoe/active/${encodeURIComponent(targetId)}`, {
                                method: 'DELETE'
                            });
                            if (res.ok) {
                                Alert.alert("Success", "User disconnected successfully");
                                refreshAll();
                            } else {
                                const data = await res.json();
                                Alert.alert("Error", data.error || "Failed to disconnect user");
                            }
                        } catch (err) {
                            Alert.alert("Error", "Network error. Could not disconnect.");
                        }
                    }
                }
            ]
        );
    };

    const filteredConnections = connections.filter((c) =>
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.address?.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => setSelectedConnection(item)}>
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.address}>{item.address}</Text>
                </View>
                <View style={styles.uptimeBadge}>
                    <Ionicons name="time-outline" size={12} color="#166534" />
                    <Text style={styles.uptimeText}>{item.uptime}</Text>
                </View>
            </View>
            <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>MAC:</Text>
                    <Text style={styles.detailText}>{item['caller-id'] || item.callerId || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service:</Text>
                    <Text style={styles.detailText}>{item.service}</Text>
                </View>
            </View>
            <TouchableOpacity style={styles.moreButton} onPress={() => setSelectedConnection(item)}>
                <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search active users..."
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            <FlatList
                data={filteredConnections}
                keyExtractor={(item) => item['.id'] || item.name}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No active connections.</Text>
                    </View>
                )}
            />

            {/* Options Modal */}
            <Modal visible={!!selectedConnection} animationType="slide" transparent={true} onRequestClose={() => setSelectedConnection(null)}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalDismissArea} activeOpacity={1} onPress={() => setSelectedConnection(null)} />
                    <View style={styles.optionsContent}>
                        <View style={styles.optionsHeader}>
                            <Text style={styles.optionsTitle}>{selectedConnection?.name}</Text>
                        </View>
                        <TouchableOpacity style={styles.optionButton} onPress={() => { const conn = selectedConnection; setSelectedConnection(null); handleDisconnect(conn); }}>
                            <Ionicons name="close-circle-outline" size={24} color="#ef4444" />
                            <Text style={[styles.optionText, { color: '#ef4444' }]}>Disconnect User</Text>
                        </TouchableOpacity>
                        <View style={styles.optionsDivider} />
                        <TouchableOpacity style={styles.optionCancel} onPress={() => setSelectedConnection(null)}>
                            <Text style={styles.optionCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 15,
        paddingHorizontal: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
    },
    listContainer: {
        paddingHorizontal: 15,
        paddingBottom: 20,
    },
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
        borderLeftWidth: 4,
        borderLeftColor: '#10b981', // green accent for active
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
    userInfo: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    address: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    uptimeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#dcfce7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    uptimeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#166534',
    },
    cardDetails: {
        gap: 6,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 13,
        color: '#6b7280',
        width: 60,
    },
    detailText: {
        fontSize: 13,
        color: '#111827',
        fontWeight: '500',
    },
    errorContainer: {
        margin: 15,
        padding: 15,
        backgroundColor: '#fee2e2',
        borderRadius: 8,
    },
    errorText: {
        color: '#b91c1c',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#6b7280',
        fontSize: 16,
    },
    moreButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        padding: 5,
    },
    // Options Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
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
