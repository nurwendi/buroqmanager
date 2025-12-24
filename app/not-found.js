import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center p-4 text-center">
            <div className="mb-6 rounded-full bg-gray-100 p-6 dark:bg-gray-800">
                <FileQuestion className="h-12 w-12 text-gray-500 dark:text-gray-400" />
            </div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Page Not Found
            </h2>
            <p className="mb-8 max-w-sm text-gray-500 dark:text-gray-400">
                Could not find the requested resource. The page you are looking for might have been removed or moved to a new address.
            </p>
            <Link
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300"
            >
                Return Home
            </Link>
        </div>
    )
}
