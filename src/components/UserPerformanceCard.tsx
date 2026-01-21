
import { Target, Phone, MessageSquare, TrendingUp, Clock, ChevronRight, Award, Zap, Activity } from 'lucide-react';

export function UserPerformanceCard({ user, stats, variant = 'default' }: { user: string, stats: any, variant?: 'default' | 'wide' }) {
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

    // WIDE VARIANT (IDLE MODE - COMPREHENSIVE VIEW)
    if (variant === 'wide') {
        const paceColor = stats.paceMinutes < 5 ? 'text-green-600' : (stats.paceMinutes < 10 ? 'text-yellow-600' : 'text-red-500');

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 hover:shadow-md transition-shadow relative overflow-hidden group flex items-center justify-between gap-2">
                {/* 1. IDENTITY & RANK */}
                <div className="flex items-center gap-2 w-40 shrink-0 border-r border-gray-100 pr-2">
                    <div className="relative">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                            {user.substring(0, 2).toUpperCase()}
                        </div>
                        {user === 'ibrahim' && (
                            <div className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-white p-0.5 rounded-full shadow-sm">
                                <Award className="w-2 h-2" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-gray-900 text-xs truncate" title={user}>{user.split('@')[0]}</h4>
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${stats.calls > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                            <span className="text-[9px] font-medium text-gray-400">#{user === 'ibrahim' ? '1' : '2'}</span>
                        </div>
                    </div>
                </div>

                {/* 2. SALES FUNNEL (Horizontal Flow) */}
                <div className="flex-1 flex items-center justify-between gap-2 px-2">
                    {/* Pulled (Havuz) */}
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Çekilen</span>
                        <div className="flex items-baseline gap-0.5">
                            <span className="text-lg font-bold text-gray-700">{stats.pulled || 0}</span>
                        </div>
                    </div>

                    <ChevronRight className="w-3 h-3 text-gray-300" />

                    {/* Calls */}
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-indigo-400 uppercase mb-0.5">Arama</span>
                        <div className="flex items-baseline gap-0.5">
                            <Phone className="w-3 h-3 text-indigo-400" />
                            <span className="text-lg font-bold text-indigo-600">{stats.calls}</span>
                        </div>
                    </div>

                    <ChevronRight className="w-3 h-3 text-gray-300" />

                    {/* Applications */}
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-orange-400 uppercase mb-0.5">Başvuru</span>
                        <div className="flex items-baseline gap-0.5">
                            <span className="text-lg font-bold text-orange-600">{stats.applications}</span>
                            <span className="text-[9px] text-gray-400">({appRate}%)</span>
                        </div>
                    </div>

                    <ChevronRight className="w-3 h-3 text-gray-300" />

                    {/* Approvals */}
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-blue-400 uppercase mb-0.5">Onay</span>
                        <div className="flex items-baseline gap-0.5">
                            <span className="text-lg font-bold text-blue-600">{stats.approvals}</span>
                        </div>
                    </div>

                    <ChevronRight className="w-3 h-3 text-emerald-300" />

                    {/* SALES (Final) */}
                    <div className="flex flex-col items-center bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                        <span className="text-[9px] font-bold text-emerald-600 uppercase mb-0.5">SATIŞ</span>
                        <div className="flex items-baseline gap-0.5">
                            <Target className="w-3 h-3 text-emerald-500" />
                            <span className="text-xl font-black text-emerald-700">{stats.sales}</span>
                        </div>
                    </div>
                </div>

                {/* 3. OPERATIONAL METRICS (Vertical compact) */}
                <div className="flex items-center gap-3 border-l border-r border-gray-100 px-3 shrink-0">
                    {/* Back Office */}
                    <div className="flex flex-col items-center" title="Back-Office İşlemleri">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">B.Office</span>
                        <span className="text-base font-bold text-gray-600">{stats.backoffice || 0}</span>
                    </div>

                    {/* Pace */}
                    <div className="flex flex-col items-center" title="Ortalama İşlem Süresi">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Hız</span>
                        <div className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5 text-gray-400" />
                            <span className={`text-base font-bold ${paceColor}`}>{stats.paceMinutes || '-'} dk</span>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Mesaj</span>
                        <div className="flex gap-1.5">
                            <div className="flex items-center gap-0.5" title="SMS">
                                <MessageSquare className="w-2.5 h-2.5 text-purple-400" />
                                <span className="text-xs font-bold text-gray-600">{stats.sms || 0}</span>
                            </div>
                            <div className="flex items-center gap-0.5" title="WhatsApp">
                                <MessageSquare className="w-2.5 h-2.5 text-green-400" />
                                <span className="text-xs font-bold text-gray-600">{stats.whatsapp || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. FINANCIALS (Revenue & Goal) */}
                <div className="w-36 shrink-0 flex flex-col items-end gap-1 pl-1">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">TOPLAM CİRO</span>
                        <span className="text-lg font-black text-blue-600 tracking-tight">
                            {formatFullCurrency(stats.salesVolume || 0)}
                        </span>
                    </div>

                    <div className="w-full flex flex-col items-end gap-0.5">
                        <div className="flex justify-between w-full text-[8px] font-bold text-gray-400 uppercase">
                            <span>Hedef</span>
                            <span className={goalPercent >= 100 ? 'text-green-600' : 'text-indigo-600'}>%{goalPercent}</span>
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
