import { Capacitor } from '@capacitor/core';

export const isMobileApp = () => {
    if (typeof window === 'undefined') return false;
    return Capacitor.isNativePlatform();
};
