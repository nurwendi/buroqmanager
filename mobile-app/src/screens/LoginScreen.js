import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { setBaseUrl, setSessionCookie, getBaseUrl } from '../utils/api';

export default function LoginScreen({ onLoginSuccess }) {
    const [serverUrl, setServerUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load previously used URL if available
        const loadUrl = async () => {
            const url = await getBaseUrl();
            if (url) setServerUrl(url);
        };
        loadUrl();
    }, []);

    const handleLogin = async () => {
        if (!serverUrl || !username || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            // 1. Save Base URL
            await setBaseUrl(serverUrl.trim());

            // 2. Attempt Login
            const response = await fetch(`${serverUrl.trim().replace(/\/$/, '')}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Extract set-cookie header
                const setCookieHeader = response.headers.get('set-cookie');
                if (setCookieHeader) {
                    // Keep only the session-related part, simple split for Next.js cookies
                    const sessionCookie = setCookieHeader.split(';')[0];
                    await setSessionCookie(sessionCookie);
                    onLoginSuccess();
                } else {
                    Alert.alert('Error', 'Login successful but no session cookie received.');
                }
            } else {
                Alert.alert('Login Failed', data.error || 'Invalid credentials');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Network Error', 'Failed to connect to the server. Please check the URL.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Buroq Manager Mobile</Text>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Server URL (e.g. http://103.150.33.187)</Text>
                <TextInput
                    style={styles.input}
                    value={serverUrl}
                    onChangeText={setServerUrl}
                    placeholder="http://103.150.33.187"
                    autoCapitalize="none"
                    keyboardType="url"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter username"
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    secureTextEntry
                />
            </View>

            <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Login</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 40,
        textAlign: 'center',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: '#4b5563',
        marginBottom: 5,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1f2937',
    },
    button: {
        backgroundColor: '#2563eb',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
