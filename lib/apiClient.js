import { isMobileApp } from './isMobile';

const getBaseUrl = () => {
    if (typeof window === 'undefined') return ''; // Server side

    if (isMobileApp()) {
        const savedUrl = localStorage.getItem('buroq_server_url');
        // Remove trailing slash if exists
        return savedUrl ? savedUrl.replace(/\/$/, '') : '';
    }

    return ''; // Browser/Web mode (relative paths)
};

export const apiClient = async (endpoint, options = {}) => {
    const baseUrl = getBaseUrl();
    // Ensure endpoint starts with /
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${path}`;

    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    // Add auth token if available (for mobile mainly, web uses cookies)
    if (isMobileApp()) {
        // We might need to handle tokens manually for mobile if cookies don't persist well in Capacitor 'fetch' to remote
        // But for now let's assume standard fetch + credentials might need help
        // or we rely on the header logic in middleware
    }

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    return fetch(url, config);
};
