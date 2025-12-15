'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const DashboardContext = createContext();

export function DashboardProvider({ children }) {
    const [preferences, setPreferences] = useState({
        dashboard: {
            visibleWidgets: {
                financial: true,
                pppoe: true, // system default

                tempChart: true,
                cpuChart: true,
                trafficChart: true
            },
            refreshInterval: 5000,
            layout: []
        },
        notifications: {
            enabled: false,
            highCpu: true,
            cpuThreshold: 80,

            voltageLow: true
        },
        tables: {
            rowsPerPage: 25
        },
        security: {
            sessionTimeout: 30
        },
        display: {
            bandwidthUnit: 'auto',
            dateFormat: 'DD/MM/YYYY'
        }
    });

    const [loading, setLoading] = useState(true);

    // Load preferences on mount
    useEffect(() => {
        fetch('/api/app-settings/preferences')
            .then(res => res.json())
            .then(data => {
                // Merge API data with defaults
                setPreferences(prev => ({
                    ...prev,
                    ...data,
                    dashboard: { ...prev.dashboard, ...data.dashboard },
                    notifications: { ...prev.notifications, ...data.notifications },
                    tables: { ...prev.tables, ...data.tables },
                    security: { ...prev.security, ...data.security },
                    display: { ...prev.display, ...data.display }
                }));
            })
            .catch(err => console.error('Failed to load preferences', err))
            .finally(() => setLoading(false));
    }, []);

    const updatePreferences = async (newPreferences) => {
        // newPreferences should be a partial object like { dashboard: { ... } } or { notifications: ... }

        // Deep merge for state update
        const updated = {
            ...preferences,
            ...newPreferences,
            dashboard: { ...preferences.dashboard, ...newPreferences.dashboard },
            notifications: { ...preferences.notifications, ...newPreferences.notifications },
            tables: { ...preferences.tables, ...newPreferences.tables },
            display: { ...preferences.display, ...newPreferences.display }
        };

        setPreferences(updated);

        try {
            await fetch('/api/app-settings/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPreferences) // Send only the changes/partial
            });
        } catch (err) {
            console.error('Failed to save preferences', err);
        }
    };

    const toggleWidget = (widgetId) => {
        const currentDashboard = preferences.dashboard || {};
        const currentVisible = currentDashboard.visibleWidgets || {};

        const newVisibleWidgets = {
            ...currentVisible,
            [widgetId]: !currentVisible[widgetId]
        };

        updatePreferences({
            dashboard: {
                ...currentDashboard,
                visibleWidgets: newVisibleWidgets
            }
        });
    };

    const setRefreshInterval = (interval) => {
        updatePreferences({
            dashboard: {
                ...preferences.dashboard,
                refreshInterval: interval
            }
        });
    };

    const resetDefaults = () => {
        const defaults = {
            dashboard: {
                visibleWidgets: {
                    financial: true,
                    pppoe: true,

                    tempChart: true,
                    cpuChart: true,
                    trafficChart: true
                },
                refreshInterval: 5000
            },
            notifications: {
                enabled: false,
                highCpu: true,
                cpuThreshold: 80,

                voltageLow: true
            }
        };
        // Merge defaults carefully or just reset specific sections
        // For now, let's reset dashboard and notifications
        updatePreferences(defaults);
    };

    return (
        <DashboardContext.Provider value={{
            preferences,
            loading,
            toggleWidget,
            setRefreshInterval,
            resetDefaults,
            updatePreferences
        }}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    return useContext(DashboardContext);
}
