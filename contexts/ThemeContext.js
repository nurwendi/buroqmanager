'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

// Preset accent colors
export const accentColors = {
    blue: '#3B82F6',
    purple: '#A855F7',
    green: '#10B981',
    orange: '#F97316',
    pink: '#EC4899',
    cyan: '#06B6D4'
};

// Preset accent gradients
export const accentGradients = {
    blue: 'linear-gradient(135deg, #3B82F6 0%, #6366f1 100%)',
    purple: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
    green: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    orange: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    pink: 'linear-gradient(135deg, #EC4899 0%, #D946EF 100%)',
    cyan: 'linear-gradient(135deg, #06B6D4 0%, #2563eb 100%)'
};

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState({
        mode: 'light', // Default to light
        glass: false,   // Glassmorphism effect
        accentColor: accentColors.blue,
        accentName: 'blue'
    });

    const [systemPreference, setSystemPreference] = useState('light');

    // Detect system preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const updateSystemPreference = (e) => {
            setSystemPreference(e.matches ? 'dark' : 'light');
        };

        // Set initial value
        setSystemPreference(mediaQuery.matches ? 'dark' : 'light');

        // Listen for changes
        mediaQuery.addEventListener('change', updateSystemPreference);

        return () => mediaQuery.removeEventListener('change', updateSystemPreference);
    }, []);

    useEffect(() => {
        // Load saved theme from localStorage
        const savedTheme = localStorage.getItem('theme_preference');
        if (savedTheme) {
            try {
                const parsed = JSON.parse(savedTheme);
                setTheme(parsed);
            } catch (e) {
                console.error('Failed to parse theme preference', e);
            }
        }
    }, []);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark', 'glass-mode');

        // Determine effective mode
        const effectiveMode = theme.mode === 'system' ? systemPreference : theme.mode;

        // Apply mode
        root.classList.add(effectiveMode);



        // Apply accent color
        root.style.setProperty('--accent-color', theme.accentColor);
        // Apply accent gradient
        const gradient = accentGradients[theme.accentName] || accentGradients.blue;
        root.style.setProperty('--accent-gradient', gradient);

        // Save to localStorage
        localStorage.setItem('theme_preference', JSON.stringify(theme));
    }, [theme, systemPreference]);

    const updateTheme = (updates) => {
        setTheme(prev => ({ ...prev, ...updates }));
    };

    const setAccentColor = (colorName) => {
        updateTheme({
            accentColor: accentColors[colorName],
            accentName: colorName
        });
    };

    return (
        <ThemeContext.Provider value={{
            theme,
            updateTheme,
            setAccentColor,
            systemPreference,
            effectiveMode: theme.mode === 'system' ? systemPreference : theme.mode
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
