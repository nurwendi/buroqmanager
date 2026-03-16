'use client';

import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext';

export default function NotFound() {
    const { t } = useLanguage();
    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center p-4 text-center">
            <div className="mb-6 rounded-full bg-white/10 p-6 backdrop-blur-md border border-white/20">
                <FileQuestion className="h-12 w-12 text-blue-100" />
            </div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-white drop-shadow-md">
                {t('notFound.title')}
            </h2>
            <p className="mb-8 max-w-sm text-blue-100 font-bold">
                {t('notFound.desc')}
            </p>
            <Link
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300"
            >
                {t('notFound.returnHome')}
            </Link>
        </div>
    )
}
