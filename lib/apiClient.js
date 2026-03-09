const getBaseUrl = () => {
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

    // Add auth token if available (web uses cookies)

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    return fetch(url, config);
};
