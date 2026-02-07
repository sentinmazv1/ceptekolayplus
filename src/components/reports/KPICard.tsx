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
        <div className={`bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:scale-[1.01] transition-all duration-200 flex flex-col justify-between h-28 group relative overflow-hidden ${className} print:border-gray-900 print:h-auto print:p-2 print:shadow-none`}>
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-gray-50 to-transparent rounded-bl-full -mr-2 -mt-2 group-hover:from-indigo-50/50 transition-colors pointer-events-none"></div>

            {/* Header */}
            <div className="flex justify-between items-start mb-1 relative z-10">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider truncate pr-1">{title}</span>
                {Icon && (
                    <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400 group-hover:text-indigo-600 group-hover:bg-white transition-all flex-shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                    </div>
                )}
            </div>

            {/* Value Area */}
            <div className="relative z-10">
                {loading ? (
                    <div className="h-8 w-24 bg-gray-100 rounded animate-pulse mb-1"></div>
                ) : (
                    <div
                        className="text-2xl font-black text-gray-900 tracking-tight tabular-nums mb-0.5 truncate"
                        title={typeof value === 'string' ? value : value.toString()}
                    >
                        {value}
                    </div>
                )}

                {/* Footer / Trend */}
                <div className="flex items-center gap-1.5">
                    {subValue && <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 truncate">{subValue}</span>}

                    {trend && !loading && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${trendUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {trendUp ? '↑' : '↓'} {trend}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
