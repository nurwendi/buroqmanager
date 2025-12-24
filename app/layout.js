import './globals.css'
export const dynamic = 'force-dynamic';

import { Outfit } from 'next/font/google'
import ClientLayout from './ClientLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';

const outfit = Outfit({ subsets: ['latin'] });


import db from '@/lib/db';

export async function generateMetadata() {
    if (process.env.BUILD_MODE === 'mobile') {
        return {
            title: {
                default: 'Buroq Billing',
                template: '%s | Buroq Billing',
            },
            description: 'Professional MikroTik PPPoE Management System (Mobile)',
        };
    }

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
                    icon: data.faviconUrl || '/favicon.ico',
                    shortcut: data.faviconUrl || '/favicon.ico',
                    apple: data.logoUrl || '/apple-touch-icon.png', // Keep logo for apple touch icon
                },
            };
        }
    } catch (error) {
        console.error('Error reading app settings:', error);
    }
    return {
        title: {
            default: 'Buroq Billing',
            template: '%s | Buroq Billing',
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
