import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform, PermissionsAndroid } from 'react-native';
import ThermalPrinterModule from 'react-native-thermal-pos-printer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function PrinterScreen() {
    const [devices, setDevices] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [savedPrinterMac, setSavedPrinterMac] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        loadSavedPrinter();
    }, []);

    const loadSavedPrinter = async () => {
        try {
            const mac = await AsyncStorage.getItem('saved_printer_mac');
            if (mac) {
                setSavedPrinterMac(mac);
            }
        } catch (e) {
            console.error("Failed to load printer", e);
        }
    };

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                ]);

                return (
                    granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED ||
                    granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED // For older androids
                );
            } catch (err) {
                console.warn(err);
                return false;
            }
        }
        return true;
    };

    const handleScan = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
            Alert.alert("Permission Denied", "Bluetooth scanning requires permissions.");
            return;
        }

        setIsScanning(true);
        try {
            ThermalPrinterModule.getBluetoothDeviceList()
                .then((macList) => {
                    setDevices(macList);
                    setIsScanning(false);
                })
                .catch((err) => {
                    console.error(err);
                    Alert.alert("Scan Failed", err.message || "Could not scan for Bluetooth devices.");
                    setIsScanning(false);
                });
        } catch (error) {
            setIsScanning(false);
            Alert.alert("Error", "An error occurred while scanning.");
        }
    };

    const handleSetDefault = async (device) => {
        try {
            await AsyncStorage.setItem('saved_printer_mac', device.macAddress);
            setSavedPrinterMac(device.macAddress);
            Alert.alert("Success", `${device.deviceName} set as default printer.`);
        } catch (e) {
            Alert.alert("Error", "Could not save printer preferences.");
        }
    };

    const handleClearDefault = async () => {
        try {
            await AsyncStorage.removeItem('saved_printer_mac');
            setSavedPrinterMac(null);
        } catch (e) {
            Alert.alert("Error", "Could not clear printer preferences.");
        }
    };

    const handleTestPrint = async () => {
        if (!savedPrinterMac) {
            Alert.alert("No Printer", "Please select and save a default printer first.");
            return;
        }

        setIsConnecting(true);
        try {
            // Test format:
            // [L] Left Text
            // [C] Center Text
            // [R] Right Text
            // [C]<font size='big'>Big Text</font>
            // \n New Line
            
            const receiptText = 
                "[C]<font size='big'>Buroq Manager</font>\n" +
                "[C]Test Print Successful!\n" +
                "[C]================================\n" +
                "[L]Printer: [R]Connected\n" +
                "[L]Connection:[R]Bluetooth\n" +
                "[L]Status:   [R]Online\n" +
                "[C]================================\n" +
                "[C]\n" +
                "[C]\n";

            await ThermalPrinterModule.printBluetooth(
                savedPrinterMac,
                receiptText,
                {
                    os: Platform.OS === 'ios' ? 'ios' : 'android' // ios not strictly supported by this bridge
                }
            );
            Alert.alert("Sent", "Test print command sent to printer.");
        } catch (error) {
            console.error(error);
            Alert.alert("Print Failed", error.message || "Failed to connect or print to the device.");
        } finally {
            setIsConnecting(false);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.deviceCard}>
            <View style={styles.deviceInfo}>
                <Ionicons name="print" size={24} color="#4b5563" />
                <View style={styles.deviceTexts}>
                    <Text style={styles.deviceName}>{item.deviceName || "Unknown Printer"}</Text>
                    <Text style={styles.deviceMac}>{item.macAddress}</Text>
                </View>
            </View>
            <TouchableOpacity
                style={[styles.saveButton, savedPrinterMac === item.macAddress && styles.savedButton]}
                onPress={() => handleSetDefault(item)}
            >
                <Text style={[styles.saveButtonText, savedPrinterMac === item.macAddress && styles.savedButtonText]}>
                    {savedPrinterMac === item.macAddress ? "Selected" : "Select"}
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.headerCard}>
                <View style={styles.headerInfo}>
                    <Ionicons name="bluetooth" size={32} color="#2563eb" />
                    <View style={styles.headerTexts}>
                        <Text style={styles.headerTitle}>Active Printer</Text>
                        <Text style={styles.headerSub}>
                            {savedPrinterMac ? `MAC: ${savedPrinterMac}` : "No printer selected"}
                        </Text>
                    </View>
                </View>
                
                {savedPrinterMac && (
                    <View style={styles.actionButtonsRow}>
                        <TouchableOpacity style={styles.testBtn} onPress={handleTestPrint} disabled={isConnecting}>
                            {isConnecting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.testBtnText}>Test Print</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.clearBtn} onPress={handleClearDefault}>
                            <Ionicons name="close-circle" size={24} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={styles.scanSection}>
                <Text style={styles.sectionTitle}>Paired Devices</Text>
                <TouchableOpacity style={styles.scanBtn} onPress={handleScan} disabled={isScanning}>
                    {isScanning ? (
                        <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                        <Text style={styles.scanBtnText}>Scan Bluetooth</Text>
                    )}
                </TouchableOpacity>
            </View>

            <FlatList
                data={devices}
                keyExtractor={(item) => item.macAddress}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            No devices found. Ensure printer is turned on and paired in your phone's Android Bluetooth Settings first.
                        </Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    headerCard: {
        backgroundColor: '#fff',
        margin: 15,
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
        flexDirection: 'column',
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 15,
    },
    headerTexts: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    headerSub: { fontSize: 14, color: '#6b7280', marginTop: 4 },
    actionButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    testBtn: {
        flex: 1,
        backgroundColor: '#10b981',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    testBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    clearBtn: {
        padding: 10,
        backgroundColor: '#fee2e2',
        borderRadius: 8,
    },
    scanSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
    scanBtn: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        backgroundColor: '#eff6ff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    scanBtnText: { color: '#2563eb', fontWeight: '500' },
    listContainer: { paddingHorizontal: 15, paddingBottom: 20 },
    deviceCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    deviceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        flex: 1,
    },
    deviceTexts: { flex: 1 },
    deviceName: { fontSize: 16, fontWeight: '600', color: '#111827' },
    deviceMac: { fontSize: 13, color: '#6b7280', marginTop: 2 },
    saveButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: '#f3f4f6',
    },
    savedButton: { backgroundColor: '#2563eb' },
    saveButtonText: { color: '#4b5563', fontWeight: '500', fontSize: 14 },
    savedButtonText: { color: '#fff' },
    emptyContainer: { padding: 30, alignItems: 'center' },
    emptyText: { color: '#9ca3af', textAlign: 'center', lineHeight: 22 },
});
