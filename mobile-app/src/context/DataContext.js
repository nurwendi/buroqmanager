import React, { createContext, useState, useContext, useCallback } from 'react';
import { apiFetch } from '../utils/api';

const DataContext = createContext();

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export const DataProvider = ({ children }) => {
    const [users, setUsers] = useState([]);
    const [activeConnections, setActiveConnections] = useState([]);
    const [payments, setPayments] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);

    const refreshUsers = useCallback(async () => {
        try {
            const res = await apiFetch('/api/pppoe/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    }, []);

    const refreshActiveConnections = useCallback(async () => {
        try {
            const res = await apiFetch('/api/pppoe/active');
            if (res.ok) {
                const data = await res.json();
                setActiveConnections(data);
            }
        } catch (err) {
            console.error('Failed to fetch active connections:', err);
        }
    }, []);

    const refreshPayments = useCallback(async () => {
        try {
            const res = await apiFetch('/api/billing/payments');
            if (res.ok) {
                const data = await res.json();
                setPayments(data);
            }
        } catch (err) {
            console.error('Failed to fetch payments:', err);
        }
    }, []);

    const refreshProfiles = useCallback(async () => {
        try {
            const res = await apiFetch('/api/pppoe/profiles');
            if (res.ok) {
                const data = await res.json();
                setProfiles(data);
            }
        } catch (err) {
            console.error('Failed to fetch profiles:', err);
        }
    }, []);

    const refreshAll = useCallback(async () => {
        setLoading(true);
        try {
            await Promise.allSettled([
                refreshUsers(),
                refreshActiveConnections(),
                refreshPayments(),
                refreshProfiles()
            ]);
        } finally {
            setLastRefresh(new Date());
            setLoading(false);
        }
    }, [refreshUsers, refreshActiveConnections, refreshPayments, refreshProfiles]);

    const value = {
        users,
        activeConnections,
        payments,
        profiles,
        loading,
        lastRefresh,
        refreshUsers,
        refreshActiveConnections,
        refreshPayments,
        refreshProfiles,
        refreshAll,
        setUsers,
        setActiveConnections,
        setPayments
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
