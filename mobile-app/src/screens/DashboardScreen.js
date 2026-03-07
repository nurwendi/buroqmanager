import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { apiFetch } from '../utils/api';
import { useData } from '../context/DataContext';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen({ onLogout }) {
    const { users, activeConnections, refreshAll, loading: dataLoading } = useData();
    const [hwStats, setHwStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Calculate stats locally
    const stats = useMemo(() => {
        const total = users.length;
        const active = activeConnections.length;
        const offline = Math.max(0, total - active);

        return {
            users: { total, active, offline }
        };
    }, [users, activeConnections]);

    const fetchHwStats = async () => {
        try {
            // We still hit this for hardware info (CPU, Temp) 
            // but we use our local counts for the user stats cards.
            const response = await apiFetch('/api/dashboard/stats');
            const data = await response.json();

            if (response.ok) {
                setHwStats(data);
                setError(null);
            } else {
                setError(data.error || 'Failed to fetch hardware stats');
            }
        } catch (err) {
            if (err.message === 'Unauthorized') {
                onLogout();
            } else {
                setError('Network error. Could not reach server.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                // Ensure the local loading spinner is dismissed even if hardware stats 
                // take too long, while still starting the data context refresh.
                await Promise.allSettled([
                    refreshAll(),
                    fetchHwStats()
                ]);
            } catch (err) {
                console.error('Initialization failed:', err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refreshAll();
        await fetchHwStats();
    }, [refreshAll]);

    const StatCard = ({ title, value, icon, color }) => (
        <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={[styles.cardValue, { color }]}>{value}</Text>
            </View>
        </View>
    );

    if (loading || dataLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Dashboard</Text>
                <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
                    <Ionicons name="log-out-outline" size={24} color="#dc2626" />
                </TouchableOpacity>
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            <View style={styles.grid}>
                <StatCard
                    title="Total Users"
                    value={stats.users.total}
                    icon="people-outline"
                    color="#2563eb"
                />
                <StatCard
                    title="Active Connections"
                    value={stats.users.active}
                    icon="pulse-outline"
                    color="#10b981"
                />
                <StatCard
                    title="Offline Users"
                    value={stats.users.offline}
                    icon="cloud-offline-outline"
                    color="#ef4444"
                />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>System Status</Text>
                {hwStats && (
                    <View style={styles.systemBox}>
                        <View style={styles.sysRow}>
                            <Text style={styles.sysLabel}>Board Name</Text>
                            <Text style={styles.sysValue}>{hwStats.system?.boardName || '-'}</Text>
                        </View>
                        <View style={styles.sysRow}>
                            <Text style={styles.sysLabel}>CPU Load</Text>
                            <Text style={styles.sysValue}>{hwStats.cpuLoad || 0}%</Text>
                        </View>
                        <View style={styles.sysRow}>
                            <Text style={styles.sysLabel}>Memory Free</Text>
                            <Text style={styles.sysValue}>
                                {hwStats?.memoryTotal && hwStats?.memoryUsed ?
                                    `${((hwStats.memoryTotal - hwStats.memoryUsed) / 1024 / 1024).toFixed(2)} MB / ${(hwStats.memoryTotal / 1024 / 1024).toFixed(2)} MB`
                                    : '-'}
                            </Text>
                        </View>
                        <View style={styles.sysRow}>
                            <Text style={styles.sysLabel}>Temperature</Text>
                            <Text style={styles.sysValue}>{hwStats.temperature ? `${hwStats.temperature}°C` : '-'}</Text>
                        </View>
                    </View>
                )}
            </View>
        </ScrollView>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    logoutButton: {
        padding: 8,
    },
    grid: {
        padding: 15,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    errorContainer: {
        margin: 20,
        padding: 15,
        backgroundColor: '#fee2e2',
        borderRadius: 8,
    },
    errorText: {
        color: '#b91c1c',
    },
    section: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 15,
    },
    systemBox: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    sysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    sysLabel: {
        color: '#6b7280',
        fontWeight: '500',
    },
    sysValue: {
        color: '#111827',
        fontWeight: 'bold',
    }
});
