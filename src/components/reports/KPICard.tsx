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
        <div className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between h-40 group relative overflow-hidden ${className} print:border-gray-900 print:h-auto print:p-2 print:shadow-none`}>
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-gray-50 to-transparent rounded-bl-full -mr-4 -mt-4 group-hover:from-indigo-50/50 transition-colors pointer-events-none"></div>

            {/* Header */}
            <div className="flex justify-between items-start mb-2 relative z-10">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{title}</span>
                {Icon && (
                    <div className="p-2 bg-gray-50 rounded-xl text-gray-400 group-hover:text-indigo-600 group-hover:bg-white group-hover:shadow-md transition-all">
                        <Icon className="w-5 h-5" />
                    </div>
                )}
            </div>

            {/* Value Area */}
            <div className="relative z-10">
                {loading ? (
                    <div className="h-10 w-32 bg-gray-100 rounded animate-pulse mb-2"></div>
                ) : (
                    <div className="text-4xl font-black text-gray-900 tracking-tighter tabular-nums mb-1">{value}</div>
                )}

                {/* Footer / Trend */}
                <div className="flex items-center gap-2">
                    {subValue && <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">{subValue}</span>}

                    {trend && !loading && (
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${trendUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {trendUp ? '↑' : '↓'} {trend}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
