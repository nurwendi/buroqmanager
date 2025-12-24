'use client';
import { useEffect, useState } from 'react';
import { NativeBiometric } from '@capacitor-community/native-biometric';
import { Device } from '@capacitor/device';
import { toast } from 'sonner';

export default function NativeBridge({ onBiometricSuccess }) {
    const [isAvailable, setIsAvailable] = useState(false);

    useEffect(() => {
        checkBiometric();
    }, []);

    const checkBiometric = async () => {
        try {
            const info = await Device.getInfo();
            if (info.platform !== 'android') return;

            const result = await NativeBiometric.isAvailable();
            if (result.isAvailable) {
                setIsAvailable(true);
            }
        } catch (e) {
            console.error('Biometric check failed', e);
        }
    };

    const performBiometric = async () => {
        try {
            const result = await NativeBiometric.verifyIdentity({
                reason: "Login with Fingerprint",
                title: "Log in",
                subtitle: "Use your fingerprint to continue",
                description: "Touch the fingerprint sensor",
            });

            if (result) {
                toast.success("Fingerprint verified!");
                if (onBiometricSuccess) onBiometricSuccess();
            }
        } catch (e) {
            toast.error("Fingerprint failed");
        }
    };

    if (!isAvailable) return null;

    return (
        <button
            type="button"
            onClick={performBiometric}
            className="mt-4 flex w-full items-center justify-center rounded-md border border-gray-300 bg-white py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
            <svg
                className="mr-2 h-5 w-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
                />
            </svg>
            Login with Fingerprint
        </button>
    );
}
