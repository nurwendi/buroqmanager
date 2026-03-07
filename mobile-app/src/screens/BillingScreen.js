import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TextInput, TouchableOpacity, ScrollView, Modal, Alert, Platform } from 'react-native';
import { useData } from '../context/DataContext';
import { apiFetch } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ThermalPrinterModule from 'react-native-thermal-pos-printer';
import { Ionicons } from '@expo/vector-icons';

export default function BillingScreen() {
    const { payments, refreshPayments, refreshAll, loading } = useData();
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    
    // Payment Action State
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        if (payments.length === 0) refreshPayments();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refreshAll();
        setRefreshing(false);
    }, [refreshAll]);
    const stats = useMemo(() => {
        const getJakartaDate = (dateObj) => {
            if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return null;
            try {
                // Using a more robust way to handle the offset if toLocaleString fails
                const formatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'Asia/Jakarta',
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hour12: false
                });
                const parts = formatter.formatToParts(dateObj);
                const map = {};
                parts.forEach(p => map[p.type] = p.value);
                const d = new Date(`${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`);
                return isNaN(d.getTime()) ? dateObj : d;
            } catch (e) {
                return dateObj;
            }
        };

        const now = new Date();
        const jakartaNow = getJakartaDate(now) || now;
        const todayStr = jakartaNow.toISOString().split('T')[0];
        const currentMonthStr = jakartaNow.toISOString().slice(0, 7);

        let totalRevenue = 0;
        let todaysRevenue = 0;
        let thisMonthRevenue = 0;
        let pendingCount = 0;
        let totalUnpaid = 0;

        payments.forEach(p => {
            if (!p || !p.date) return;
            const amount = Number(p.amount) || 0;
            const paymentDate = new Date(p.date);
            if (isNaN(paymentDate.getTime())) return;

            const jakartaPaymentDate = getJakartaDate(paymentDate);
            if (!jakartaPaymentDate) return;

            const paymentDay = jakartaPaymentDate.toISOString().split('T')[0];
            const paymentMonth = jakartaPaymentDate.toISOString().slice(0, 7);

            if (p.status === 'completed') {
                totalRevenue += amount;
                if (paymentDay === todayStr) todaysRevenue += amount;
                if (paymentMonth === currentMonthStr) thisMonthRevenue += amount;
            } else if (p.status === 'pending') {
                pendingCount++;
                totalUnpaid += amount;
            }
        });

        return {
            totalRevenue,
            todaysRevenue,
            thisMonthRevenue,
            pendingCount,
            totalUnpaid
        };
    }, [payments]);

    const filteredPayments = payments.filter((p) =>
        p.username?.toLowerCase().includes(search.toLowerCase()) ||
        p.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
    );

    const formatCurrency = (amount) => {
        try {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0
            }).format(amount);
        } catch (e) {
            // Simple fallback if Intl fails
            return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        }
    };

    const handleMarkAsPaid = async (invoice) => {
        Alert.alert(
            "Confirm Payment",
            `Mark invoice ${invoice.invoiceNumber} (Rp ${invoice.amount}) as Paid?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        setProcessingPayment(true);
                        try {
                            const res = await apiFetch(`/api/billing/payments/${invoice.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'completed' })
                            });

                            if (res.ok) {
                                Alert.alert("Success", "Payment recorded successfully.");
                                refreshPayments();
                            } else {
                                const data = await res.json();
                                Alert.alert("Error", data.error || "Failed to record payment.");
                            }
                        } catch (error) {
                            Alert.alert("Error", "Network error while processing payment.");
                        } finally {
                            setProcessingPayment(false);
                            setSelectedInvoice(null);
                        }
                    }
                }
            ]
        );
    };

    const handlePrintReceipt = async (invoice) => {
        try {
            setProcessingPayment(true);
            const mac = await AsyncStorage.getItem('saved_printer_mac');
            if (!mac) {
                Alert.alert("No Printer", "Go to the Printer tab to select a default Bluetooth Printer first.");
                return;
            }

            const headerText = 
                "[C]<font size='big'>Buroq Manager</font>\n" +
                "[C]PAYMENT RECEIPT\n" +
                "[C]================================\n";

            const bodyText = 
                `[L]Invoice :[R]${invoice.invoiceNumber}\n` +
                `[L]Customer:[R]${invoice.username}\n` +
                `[L]Date    :[R]${new Date(invoice.date || new Date()).toLocaleDateString()}\n` +
                `[L]Status  :[R]${invoice.status.toUpperCase()}\n` +
                "[C]--------------------------------\n" +
                `[L]Amount  :[R]${formatCurrency(invoice.amount)}\n` +
                "[C]================================\n" +
                "[C]Thank you for your payment!\n" +
                "[C]\n[C]\n";
                
            const receiptText = headerText + bodyText;

            await ThermalPrinterModule.printBluetooth(mac, receiptText, {
                os: Platform.OS === 'ios' ? 'ios' : 'android'
            });
            Alert.alert("Sent", "Receipt sent to printer.");
        } catch (error) {
            console.error("Print Error:", error);
            Alert.alert("Print Failed", error.message || "Could not print. Make sure printer is on and in range.");
        } finally {
            setProcessingPayment(false);
            setSelectedInvoice(null);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.paymentCard}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
                    <Text style={styles.username}>@{item.username}</Text>
                </View>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'completed' ? '#dcfce7' : '#fee2e2' }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: item.status === 'completed' ? '#166534' : '#991b1b' }
                    ]}>
                        {item.status === 'completed' ? 'Paid' : 'Unpaid'}
                    </Text>
                </View>
            </View>
            <View style={styles.cardDetails}>
                <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
                <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
            </View>

            <TouchableOpacity 
                style={styles.moreButton} 
                onPress={() => setSelectedInvoice(item)}
            >
                <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.statsSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
                    <View style={[styles.statBox, { borderLeftColor: '#2563eb' }]}>
                        <Text style={styles.statLabel}>Today</Text>
                        <Text style={styles.statValue}>{formatCurrency(stats.todaysRevenue)}</Text>
                    </View>
                    <View style={[styles.statBox, { borderLeftColor: '#10b981' }]}>
                        <Text style={styles.statLabel}>This Month</Text>
                        <Text style={styles.statValue}>{formatCurrency(stats.thisMonthRevenue)}</Text>
                    </View>
                    <View style={[styles.statBox, { borderLeftColor: '#f59e0b' }]}>
                        <Text style={styles.statLabel}>Unpaid ({stats.pendingCount})</Text>
                        <Text style={styles.statValue}>{formatCurrency(stats.totalUnpaid)}</Text>
                    </View>
                </ScrollView>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search invoices or users..."
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            <FlatList
                data={filteredPayments}
                keyExtractor={(item) => item.id?.toString() || item.invoiceNumber}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No transactions found.</Text>
                    </View>
                )}
            />

            {/* Action Bottom Sheet Modal */}
            <Modal visible={!!selectedInvoice} animationType="slide" transparent={true} onRequestClose={() => setSelectedInvoice(null)}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalDismissArea} activeOpacity={1} onPress={() => setSelectedInvoice(null)} />
                    <View style={styles.optionsContent}>
                        <View style={styles.optionsHeader}>
                            <Text style={styles.optionsTitle}>Invoice Options</Text>
                            <Text style={styles.optionsSub}>{selectedInvoice?.invoiceNumber}</Text>
                        </View>
                        
                        {selectedInvoice?.status === 'pending' && (
                            <TouchableOpacity 
                                style={styles.optionButton} 
                                onPress={() => handleMarkAsPaid(selectedInvoice)}
                                disabled={processingPayment}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
                                    <Ionicons name="checkmark-circle" size={24} color="#166534" />
                                </View>
                                <Text style={styles.optionText}>
                                    {processingPayment ? "Processing..." : "Mark as Paid (Cash)"}
                                </Text>
                            </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity 
                            style={styles.optionButton} 
                            onPress={() => handlePrintReceipt(selectedInvoice)}
                            disabled={processingPayment}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: '#e0e7ff' }]}>
                                <Ionicons name="print" size={24} color="#3730a3" />
                            </View>
                            <Text style={styles.optionText}>
                                {processingPayment ? "Processing..." : "Print Receipt (Bluetooth)"}
                            </Text>
                        </TouchableOpacity>
                        
                        <View style={styles.optionsDivider} />
                        <TouchableOpacity style={styles.optionCancel} onPress={() => setSelectedInvoice(null)}>
                            <Text style={styles.optionCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    statsSection: { paddingVertical: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
    statsScroll: { paddingHorizontal: 15, gap: 12 },
    statBox: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        minWidth: 150,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderLeftWidth: 4,
    },
    statLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
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
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
    listContainer: { paddingHorizontal: 15, paddingBottom: 20 },
    paymentCard: {
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
    },
    invoiceNumber: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
    username: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 11, fontWeight: 'bold' },
    cardDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    amount: { fontSize: 16, fontWeight: 'bold', color: '#2563eb' },
    date: { fontSize: 12, color: '#9ca3af' },
    moreButton: { position: 'absolute', top: 15, right: 15, padding: 5 },
    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#6b7280', fontSize: 16 },

    // Modal Styles
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
    optionsTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
    optionsSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        gap: 15,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionText: { fontSize: 16, color: '#1f2937', fontWeight: '500' },
    optionsDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },
    optionCancel: { alignItems: 'center', paddingVertical: 15 },
    optionCancelText: { fontSize: 16, fontWeight: 'bold', color: '#6b7280' },
});
