import AsyncStorage from '@react-native-async-storage/async-storage';

// In a real app, you might want a Settings screen to configure this dynamically.
// For now, let's assume we store the server URL in AsyncStorage or default it here.
let BASE_URL = '';

export const setBaseUrl = async (url) => {
    BASE_URL = url.replace(/\/$/, ''); // Remove trailing slash
    await AsyncStorage.setItem('@serverUrl', BASE_URL);
};

export const getBaseUrl = async () => {
    if (BASE_URL) return BASE_URL;
    const storedUrl = await AsyncStorage.getItem('@serverUrl');
    if (storedUrl) {
        BASE_URL = storedUrl;
        return BASE_URL;
    }
    return null;
};

// We will extract and pass the cookie manually for API requests
let SESSION_COOKIE = '';

export const setSessionCookie = async (cookieStr) => {
    SESSION_COOKIE = cookieStr;
    await AsyncStorage.setItem('@sessionCookie', SESSION_COOKIE);
};

export const getSessionCookie = async () => {
    if (SESSION_COOKIE) return SESSION_COOKIE;
    const storedCookie = await AsyncStorage.getItem('@sessionCookie');
    if (storedCookie) {
        SESSION_COOKIE = storedCookie;
        return SESSION_COOKIE;
    }
    return null;
};

export const clearSession = async () => {
    SESSION_COOKIE = '';
    await AsyncStorage.removeItem('@sessionCookie');
};

/**
 * Custom fetch wrapper to automatically inject the session cookie and handle timeouts.
 */
export const apiFetch = async (endpoint, options = {}, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const baseUrl = await getBaseUrl();
        if (!baseUrl) {
            throw new Error('Server URL not set');
        }

        const cookie = await getSessionCookie();

        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };

        if (cookie) {
            headers['Cookie'] = cookie;
        }

        const response = await fetch(`${baseUrl}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal,
        });

        clearTimeout(id);

        // Basic interceptor for unauthorized
        if (response.status === 401) {
            await clearSession();
            throw new Error('Unauthorized');
        }

        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        throw error;
    }
};
