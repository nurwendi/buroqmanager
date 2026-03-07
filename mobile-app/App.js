import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import UsersScreen from './src/screens/UsersScreen';
import ActiveConnectionsScreen from './src/screens/ActiveConnectionsScreen';
import BillingScreen from './src/screens/BillingScreen';
import PrinterScreen from './src/screens/PrinterScreen';
import { getSessionCookie, clearSession } from './src/utils/api';
import { DataProvider } from './src/context/DataContext';

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        const session = await getSessionCookie();
        if (session) {
            setIsAuthenticated(true);
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        await clearSession();
        setIsAuthenticated(false);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <Text>Loading Buroq Manager...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="auto" />
            {!isAuthenticated ? (
                <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />
            ) : (
                <DataProvider>
                    <View style={styles.mainContainer}>
                        <View style={styles.content}>
                            {activeTab === 'dashboard' && <DashboardScreen onLogout={handleLogout} />}
                            {activeTab === 'users' && <UsersScreen />}
                            {activeTab === 'active' && <ActiveConnectionsScreen />}
                            {activeTab === 'billing' && <BillingScreen />}
                            {activeTab === 'printer' && <PrinterScreen />}
                        </View>
                        <View style={styles.tabBar}>
                            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('dashboard')}>
                                <Ionicons name={activeTab === 'dashboard' ? "home" : "home-outline"} size={24} color={activeTab === 'dashboard' ? "#2563eb" : "#6b7280"} />
                                <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>Home</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('users')}>
                                <Ionicons name={activeTab === 'users' ? "people" : "people-outline"} size={24} color={activeTab === 'users' ? "#2563eb" : "#6b7280"} />
                                <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Users</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('active')}>
                                <Ionicons name={activeTab === 'active' ? "pulse" : "pulse-outline"} size={24} color={activeTab === 'active' ? "#2563eb" : "#6b7280"} />
                                <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Active</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('billing')}>
                                <Ionicons name={activeTab === 'billing' ? "receipt" : "receipt-outline"} size={24} color={activeTab === 'billing' ? "#2563eb" : "#6b7280"} />
                                <Text style={[styles.tabText, activeTab === 'billing' && styles.tabTextActive]}>Billing</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('printer')}>
                                <Ionicons name={activeTab === 'printer' ? "print" : "print-outline"} size={24} color={activeTab === 'printer' ? "#2563eb" : "#6b7280"} />
                                <Text style={[styles.tabText, activeTab === 'printer' && styles.tabTextActive]}>Printer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </DataProvider>
            )}
        </SafeAreaView>
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
    mainContainer: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingBottom: 20, // Safe area for iPhone
        paddingTop: 10,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    tabTextActive: {
        color: '#2563eb',
        fontWeight: 'bold',
    }
});
