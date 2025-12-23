'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldSettingsRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.push('/invoice-settings'); // Redirect everyone to new page (which handles auth)
    }, [router]);

    return null;
}
