
import { Target, Phone, MessageSquare, TrendingUp, Clock, ChevronRight, Award, Zap, Activity } from 'lucide-react';

export function UserPerformanceCard({ user, stats }: { user: string, stats: any }) {
    // Rates calculation
    const appRate = stats.calls > 0 ? Math.round((stats.applications / stats.calls) * 100) : 0;

    // Goal Progress
    const goalPercent = stats.dailyGoal > 0 ? Math.min(100, Math.round((stats.calls / stats.dailyGoal) * 100)) : 0;

    const formatShortCurrency = (val: number) => {
        if (!val) return '0 ₺';
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0, notation: 'compact' }).format(val);
    };

    const formatFullCurrency = (val: number) => {
        if (!val) return '0 ₺';
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
    };

    return (
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow relative group h-full">
            {/* Rank Badge */}
            <div className="absolute top-0 right-0 p-2 opacity-50 text-xs font-black text-gray-300 group-hover:opacity-100 transition-opacity">
                #{user === 'ibrahim' ? '1' : '2'}
            </div>

            <div className="p-4 flex flex-col gap-4">
                {/* Header: User Info */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                        {user.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-bold text-gray-900 truncate" title={user}>{user.split('@')[0]}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${stats.calls > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                            <span className="text-[10px] font-medium text-gray-500">Çevrimiçi</span>
                        </div>
                    </div>
                </div>

                {/* KPI Grid - Fixed Layout */}
                <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-100 pt-3">
                    {/* Calls */}
                    <div className="bg-gray-50 rounded-lg p-2 flex flex-col items-center">
                        <Phone className="w-3 h-3 text-indigo-400 mb-1" />
                        <span className="text-lg font-black text-gray-800 leading-none">{stats.calls}</span>
                        <span className="text-[9px] text-gray-400 uppercase font-bold mt-1">Arama</span>
                    </div>

                    {/* Sales Count */}
                    <div className="bg-emerald-50 rounded-lg p-2 flex flex-col items-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-100 rounded-bl-lg"></div>
                        <Target className="w-3 h-3 text-emerald-500 mb-1" />
                        <span className="text-lg font-black text-emerald-700 leading-none">{stats.sales}</span>
                        <span className="text-[9px] text-emerald-600 uppercase font-bold mt-1">Satış</span>
                    </div>

                    {/* Volume (Ciro) */}
                    <div className="bg-blue-50 rounded-lg p-2 flex flex-col items-center justify-center col-span-1">
                        <TrendingUp className="w-3 h-3 text-blue-500 mb-1" />
                        <span className="text-sm font-black text-blue-700 leading-none truncate w-full" title={formatFullCurrency(stats.salesVolume || 0)}>
                            {new Intl.NumberFormat('tr-TR', { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(stats.salesVolume || 0)}
                        </span>
                        <span className="text-[9px] text-blue-600 uppercase font-bold mt-1">Ciro</span>
                    </div>
                </div>

                {/* Daily Goal Progress Bar (Mini) */}
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] items-end font-medium">
                        <span className="text-gray-400">Hedef (80)</span>
                        <span className={goalPercent >= 100 ? 'text-green-600 font-bold' : 'text-indigo-600'}>%{goalPercent}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${goalPercent >= 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min(goalPercent, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
