
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

    return (
        <div className="group relative bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/80 overflow-hidden hover:shadow-[0_20px_50px_rgba(79,70,229,0.1)] transition-all duration-500 hover:-translate-y-1">
            {/* Top Accents */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${goalPercent >= 100 ? 'from-emerald-400 to-teal-500' : 'from-indigo-500 via-purple-500 to-indigo-500'}`} />

            <div className="p-5 sm:p-6">
                <div className="flex flex-col xl:flex-row xl:items-center gap-6 xl:gap-8">

                    {/* 1. Header & Identity Section */}
                    <div className="flex-shrink-0 w-full xl:w-60 border-b xl:border-b-0 xl:border-r border-gray-50 pb-5 xl:pb-0 xl:pr-8">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="relative flex-shrink-0">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg transform group-hover:rotate-3 transition-transform duration-500">
                                    {user.charAt(0).toUpperCase()}
                                </div>
                                {goalPercent >= 100 && (
                                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-white p-1 rounded-full shadow-md animate-bounce">
                                        <Award className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-lg font-black text-gray-900 tracking-tight group-hover:text-indigo-600 transition-colors truncate">
                                    {user.split('@')[0]}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className="flex items-center gap-1 text-[9px] font-black text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-lg border border-indigo-100/50 whitespace-nowrap">
                                        <Target className="w-3 h-3" />
                                        <span>{stats.dailyGoal} HEDEF</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Goal Bar */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">GÜNLÜK İLERLEME</span>
                                <span className={`text-xs font-black ${goalPercent >= 100 ? 'text-emerald-500' : 'text-indigo-600'}`}>%{goalPercent}</span>
                            </div>
                            <div className="h-2.5 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100 shadow-inner">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out relative ${goalPercent >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                                    style={{ width: `${goalPercent}%` }}
                                >
                                    {goalPercent > 15 && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Funnel Flow (Center) */}
                    <div className="flex-grow grid grid-cols-2 lg:grid-cols-4 gap-4 items-center">

                        {/* Pulls */}
                        <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-slate-50/30 border border-slate-100/50 group/item hover:bg-white hover:shadow-md transition-all">
                            <Clock className="w-5 h-5 text-slate-400 mb-2" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center leading-none">Müşteri Çekme</span>
                            <span className="text-xl font-black text-slate-700">{stats.pulled || 0}</span>
                        </div>

                        {/* Calls */}
                        <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100/50 group/item hover:bg-white hover:shadow-md transition-all">
                            <Phone className="w-5 h-5 text-indigo-500 mb-2" />
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1 text-center leading-none">Gerçek Arama</span>
                            <span className="text-xl font-black text-indigo-700">{stats.calls || 0}</span>
                        </div>

                        {/* SMS / WA */}
                        <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-emerald-50/30 border border-emerald-100/50 group/item hover:bg-white hover:shadow-md transition-all">
                            <MessageSquare className="w-5 h-5 text-emerald-500 mb-2" />
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1 text-center leading-none">SMS / WA</span>
                            <span className="text-xl font-black text-emerald-700">{(stats.sms || 0) + (stats.whatsapp || 0)}</span>
                        </div>

                        {/* Back Office */}
                        <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-amber-50/30 border border-amber-100/50 group/item hover:bg-white hover:shadow-md transition-all">
                            <Activity className="w-5 h-5 text-amber-500 mb-2" />
                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1 text-center leading-none">Back Office</span>
                            <span className="text-xl font-black text-amber-700">{stats.backoffice || 0}</span>
                        </div>
                    </div>

                    {/* 3. Results Section (Right) */}
                    <div className="flex-shrink-0 w-full xl:w-72 flex flex-col gap-3 justify-center">
                        <div className="grid grid-cols-2 gap-3">
                            {/* App */}
                            <div className="bg-blue-600 rounded-2xl p-3 text-white shadow-lg shadow-blue-200 border border-blue-700">
                                <span className="block text-[9px] font-bold opacity-80 uppercase leading-none mb-1.5">Başvuru</span>
                                <div className="flex items-end justify-between">
                                    <span className="text-xl font-black">{stats.applications || 0}</span>
                                    <span className="text-[8px] font-black bg-white/20 px-1 py-0.5 rounded">%{appRate}</span>
                                </div>
                            </div>
                            {/* Sales */}
                            <div className="bg-emerald-600 rounded-2xl p-3 text-white shadow-lg shadow-emerald-200 border border-emerald-700">
                                <span className="block text-[9px] font-bold opacity-80 uppercase leading-none mb-1.5">Satış</span>
                                <div className="flex items-end justify-between">
                                    <span className="text-xl font-black">{stats.sales || 0}</span>
                                    <Zap className="w-4 h-4 text-emerald-300 fill-emerald-300" />
                                </div>
                            </div>
                        </div>

                        {/* App Limit Summary */}
                        <div className="bg-slate-900 rounded-2xl p-2.5 text-white flex justify-between items-center shadow-lg border border-slate-800">
                            <div className="flex flex-col min-w-0">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter truncate">Onaylanan Limit</span>
                                <span className="text-xs font-black text-emerald-400 truncate">{formatShortCurrency(stats.approvedLimit || 0)}</span>
                            </div>
                            <div className="flex-shrink-0 bg-slate-800 h-8 w-8 rounded-xl flex items-center justify-center font-black text-sm text-emerald-400 border border-slate-700">
                                {stats.approvals || 0}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Footer - Stats & Info */}
            <div className="bg-gray-50/50 border-t border-gray-100 flex flex-wrap divide-x divide-gray-100">
                <div className="flex-1 min-w-[140px] p-2 sm:p-3 flex items-center justify-center gap-3">
                    <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">ORTALAMA TEMPO</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className={`w-3 h-3 ${stats.paceMinutes > 10 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`} />
                            <span className="text-[10px] sm:text-xs font-black text-gray-700 whitespace-nowrap">{stats.paceMinutes || 0} Dakika / İşlem</span>
                        </div>
                    </div>
                </div>
                <div className="hidden sm:flex px-4 py-3 items-center justify-center text-gray-400">
                    <ChevronRight className="w-4 h-4 opacity-30" />
                </div>
                <div className="flex-1 min-w-[140px] p-2 sm:p-3 bg-gradient-to-br from-indigo-50/30 to-white flex items-center justify-center gap-3">
                    <div className="flex items-center gap-2 group-hover:scale-110 transition-transform">
                        <div className={`w-1.5 h-1.5 rounded-full ${stats.calls > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                        <span className="text-[8px] sm:text-[9px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">ÇEVRİMİÇİ</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
