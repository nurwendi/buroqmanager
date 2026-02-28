'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import id from '@/lib/translations/id';
import en from '@/lib/translations/en';

const translations = { id, en };

const LanguageContext = createContext();

export function LanguageProvider({ children, initialLanguage = 'auto' }) {
    const [language, setLanguage] = useState(initialLanguage);
    const [resolvedLanguage, setResolvedLanguage] = useState('id'); // Default resolved
    const [isLoaded, setIsLoaded] = useState(false);

    // Resolve language when language state changes or on mount
    useEffect(() => {
        if (language === 'auto') {
            const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : null;
            if (browserLang === 'en') {
                setResolvedLanguage('en');
            } else {
                setResolvedLanguage('id'); // Default for auto is Indonesian
            }
        } else {
            setResolvedLanguage(language);
        }
    }, [language]);

    // Load user language on mount
    useEffect(() => {
        const loadUserLanguage = async () => {
            try {
                // 1. First check localStorage for explicit preference
                const savedLang = typeof window !== 'undefined' ? localStorage.getItem('buroq_language') : null;

                if (savedLang) {
                    setLanguage(savedLang);
                }

                // 2. Finally, if logged in, prioritize server-side setting
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    if (data.user?.language) {
                        setLanguage(data.user.language);
                    }
                }
            } catch (error) {
                console.error('Failed to load user language:', error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadUserLanguage();
    }, []);

    // Translation function
    const t = (key, params = {}) => {
        const keys = key.split('.');
        let value = translations[resolvedLanguage];
        let found = true;

        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                found = false;
                break;
            }
        }

        if (!found) {
            // Fallback to English if key not found
            let fallback = translations['en'];
            let fallbackFound = true;
            for (const k of keys) {
                if (fallback && fallback[k]) {
                    fallback = fallback[k];
                } else {
                    fallbackFound = false;
                    break;
                }
            }
            if (fallbackFound) {
                value = fallback;
            } else {
                return key;
            }
        }

        if (typeof value === 'string' && params) {
            Object.keys(params).forEach(param => {
                value = value.replaceAll(`{${param}}`, params[param]);
            });
        }

        return value;
    };

    // Change language and save to database
    const changeLanguage = async (newLanguage) => {
        setLanguage(newLanguage);

        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('buroq_language', newLanguage);
            }
            await fetch('/api/user/language', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: newLanguage })
            });
        } catch (error) {
            console.error('Failed to save language preference:', error);
        }
    };

    return (
        <LanguageContext.Provider value={{
            language,
            resolvedLanguage,
            setLanguage: changeLanguage,
            t,
            isLoaded
        }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

export default LanguageContext;
