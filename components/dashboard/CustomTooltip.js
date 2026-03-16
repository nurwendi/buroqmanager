'use client';

export default function CustomTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 dark:bg-gray-800/95 p-4 rounded-xl shadow-xl border border-white/20 dark:border-gray-700/50">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    {label ? new Date(label).toLocaleString() : ''}
                </p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color || entry.stroke }}
                        />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            {entry.name}:
                        </span>
                        <span className="text-sm font-bold ml-auto" style={{ color: entry.color || entry.stroke }}>
                            {entry.value} {entry.unit}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
}
