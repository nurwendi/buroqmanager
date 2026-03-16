'use client';

import { useMemo } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RevenueChart({ data = [] }) {
    const { t } = useLanguage();

    // Default placeholder data if not available yet
    const chartData = data.length > 0 ? data : [
        { name: 'Jan', revenue: 0 },
        { name: 'Feb', revenue: 0 },
        { name: 'Mar', revenue: 0 },
        { name: 'Apr', revenue: 0 },
        { name: 'May', revenue: 0 },
        { name: 'Jun', revenue: 0 },
    ];

    // Format Y-axis to compact numbers manually (e.g. 15.5k) to match our UI
    const formatYAxis = (tickItem) => {
        if (tickItem >= 1000000) return `Rp ${(tickItem / 1000000).toFixed(1)}Jt`;
        if (tickItem >= 1000) return `Rp ${(tickItem / 1000).toFixed(0)}rb`;
        return `Rp ${tickItem}`;
    };

    // Calculate Trend
    const trendInfo = useMemo(() => {
        if (chartData.length < 2) return null;
        const current = chartData[chartData.length - 1].revenue || 0;
        const previous = chartData[chartData.length - 2].revenue || 0;
        
        if (previous === 0) return { isUp: true, percentage: current > 0 ? 100 : 0 };
        
        const diff = current - previous;
        const percentage = Math.round(Math.abs(diff / previous) * 100);
        return {
            isUp: diff >= 0,
            percentage
        };
    }, [chartData]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-black/80 backdrop-blur-md p-3 rounded-lg shadow-2xl border border-white/20">
                    <p className="text-white/60 text-sm font-medium mb-1">{label}</p>
                    <p className="text-white font-bold">
                        Rp {payload[0].value.toLocaleString('id-ID')}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl col-span-1 lg:col-span-2 relative overflow-hidden flex flex-col h-full">
            <div className="flex justify-between items-start mb-6 z-10">
                <div>
                    <h3 className="text-white font-bold text-lg drop-shadow-md">
                        {t('dashboard.revenueTrend') || "Revenue Trend"}
                    </h3>
                    <p className="text-white/50 text-sm">
                        {t('dashboard.lastSixMonths') || "Last 6 months performance"}
                    </p>
                </div>
                
                {trendInfo && trendInfo.percentage > 0 && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                        trendInfo.isUp 
                            ? 'bg-green-400/20 text-green-300' 
                            : 'bg-red-400/20 text-red-300'
                    }`}>
                        {trendInfo.isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        <span>{trendInfo.percentage}%</span>
                    </div>
                )}
            </div>

            <div className="flex-1 w-full min-h-[250px] -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff" strokeOpacity={0.1} />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} 
                            tickFormatter={formatYAxis}
                            width={80}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#818cf8" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorRevenue)" 
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#818cf8' }}
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
