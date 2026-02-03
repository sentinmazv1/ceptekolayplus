import { LucideIcon } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string | number;
    subValue?: string;
    trend?: string;
    trendUp?: boolean; // true = green/up, false = red/down
    icon?: LucideIcon;
    className?: string;
    loading?: boolean;
}

export function KPICard({ title, value, subValue, trend, trendUp = true, icon: Icon, className, loading }: KPICardProps) {
    return (
        <div className={`bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col justify-between h-32 group ${className} print:border-gray-900 print:h-auto print:p-2`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</span>
                {Icon && (
                    <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                        <Icon className="w-4 h-4" />
                    </div>
                )}
            </div>

            {/* Value Area */}
            <div>
                {loading ? (
                    <div className="h-8 w-24 bg-gray-100 rounded animate-pulse mb-1"></div>
                ) : (
                    <div className="text-2xl font-bold text-gray-900 tracking-tight tabular-nums">{value}</div>
                )}

                {/* Footer / Trend */}
                <div className="flex items-center gap-2 mt-1">
                    {subValue && <span className="text-xs font-medium text-gray-400">{subValue}</span>}

                    {trend && !loading && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${trendUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {trendUp ? '↑' : '↓'} {trend}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
