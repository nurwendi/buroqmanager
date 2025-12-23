import './globals.css'
import { Outfit } from 'next/font/google'
import ClientLayout from './ClientLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';

const outfit = Outfit({ subsets: ['latin'] });


import db from '@/lib/db';

export async function generateMetadata() {
    try {
        const setting = await db.systemSetting.findUnique({
            where: { key: 'app_settings' }
        });

        if (setting) {
            const data = JSON.parse(setting.value);
            const appName = data.appName || 'Mikrotik Manager';
            const settings = JSON.parse(setting.value);
            return {
                title: {
                    default: appName,
                    template: `%s | ${appName}`,
                },
                description: 'Professional MikroTik PPPoE Management System',
                icons: {
                    icon: data.logoUrl || '/favicon.ico', // Use uploaded logo/favicon
                    shortcut: data.logoUrl || '/favicon.ico',
                    apple: data.logoUrl || '/apple-touch-icon.png',
                },
            };
        }
    } catch (error) {
        console.error('Error reading app settings:', error);
    }
    return {
        title: {
            default: 'Mikrotik Manager',
            template: '%s | Mikrotik Manager',
        },
        description: 'Professional MikroTik PPPoE Management System',
    };
}

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={outfit.className}>

                <ThemeProvider>
                    <ClientLayout>
                        {children}
                    </ClientLayout>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
