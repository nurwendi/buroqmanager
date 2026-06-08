'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldSettingsRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.push('/app-settings'); // Redirect to App Settings
    }, [router]);

    return null;
}
