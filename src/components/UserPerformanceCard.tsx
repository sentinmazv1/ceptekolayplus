
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

            <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-8">

                    {/* 1. Header & Identity Section */}
                    <div className="flex-shrink-0 w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-gray-50 pb-6 lg:pb-0 lg:pr-8">
                        <div className="flex items-center gap-4 mb-5">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-lg transform group-hover:rotate-3 transition-transform duration-500">
                                    {user.charAt(0).toUpperCase()}
                                </div>
                                {goalPercent >= 100 && (
                                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-white p-1 rounded-full shadow-md animate-bounce">
                                        <Award className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                                    {user.split('@')[0]}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <div className="flex items-center gap-1 text-[10px] font-black text-indigo-600 bg-indigo-50/50 px-2 py-1 rounded-lg border border-indigo-100/50">
                                        <Target className="w-3 h-3" />
                                        <span>{stats.dailyGoal} ÇAĞRI HEDEFİ</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Goal Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Günlük İlerleme</span>
                                <span className={`text-sm font-black ${goalPercent >= 100 ? 'text-emerald-500' : 'text-indigo-600'}`}>%{goalPercent}</span>
                            </div>
                            <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100 shadow-inner">
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
                    <div className="flex-grow grid grid-cols-2 sm:grid-cols-4 gap-6 items-center">

                        {/* Pulls */}
                        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50/30 border border-slate-100/50 group/item hover:bg-white hover:shadow-md transition-all">
                            <Clock className="w-5 h-5 text-slate-400 mb-2" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Müşteri Çekme</span>
                            <span className="text-2xl font-black text-slate-700">{stats.pulled || 0}</span>
                        </div>

                        {/* Calls */}
                        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100/50 group/item hover:bg-white hover:shadow-md transition-all">
                            <Phone className="w-5 h-5 text-indigo-500 mb-2" />
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Gerçek Arama</span>
                            <span className="text-2xl font-black text-indigo-700">{stats.calls || 0}</span>
                        </div>

                        {/* SMS / WA */}
                        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-50/30 border border-emerald-100/50 group/item hover:bg-white hover:shadow-md transition-all">
                            <MessageSquare className="w-5 h-5 text-emerald-500 mb-2" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">SMS / WA</span>
                            <span className="text-2xl font-black text-emerald-700">{(stats.sms || 0) + (stats.whatsapp || 0)}</span>
                        </div>

                        {/* Back Office */}
                        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-50/30 border border-amber-100/50 group/item hover:bg-white hover:shadow-md transition-all">
                            <Activity className="w-5 h-5 text-amber-500 mb-2" />
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Back Office</span>
                            <span className="text-2xl font-black text-amber-700">{stats.backoffice || 0}</span>
                        </div>
                    </div>

                    {/* 3. Results Section (Right) */}
                    <div className="flex-shrink-0 w-full lg:w-80 flex flex-col gap-3 justify-center">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            KAZANIM / SONUÇ
                        </h4>

                        <div className="grid grid-cols-2 gap-3">
                            {/* App */}
                            <div className="bg-blue-600 rounded-2xl p-3 text-white shadow-lg shadow-blue-200 border border-blue-700">
                                <span className="block text-[10px] font-bold opacity-80 uppercase leading-none mb-1.5">Başvuru</span>
                                <div className="flex items-end justify-between">
                                    <span className="text-2xl font-black">{stats.applications || 0}</span>
                                    <span className="text-[9px] font-black bg-white/20 px-1.5 py-0.5 rounded">%{appRate}</span>
                                </div>
                            </div>
                            {/* Sales */}
                            <div className="bg-emerald-600 rounded-2xl p-3 text-white shadow-lg shadow-emerald-200 border border-emerald-700">
                                <span className="block text-[10px] font-bold opacity-80 uppercase leading-none mb-1.5">Satış</span>
                                <div className="flex items-end justify-between">
                                    <span className="text-2xl font-black">{stats.sales || 0}</span>
                                    <Zap className="w-4 h-4 text-emerald-300 fill-emerald-300" />
                                </div>
                            </div>
                        </div>

                        {/* App Limit Summary */}
                        <div className="bg-slate-900 rounded-2xl p-3 text-white flex justify-between items-center shadow-lg border border-slate-800">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Onaylanan Toplam Limit</span>
                                <span className="text-sm font-black text-emerald-400">{formatShortCurrency(stats.approvedLimit || 0)}</span>
                            </div>
                            <div className="bg-slate-800 h-10 w-10 rounded-xl flex items-center justify-center font-black text-lg text-emerald-400 border border-slate-700">
                                {stats.approvals || 0}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Footer - Stats & Info */}
            <div className="bg-gray-50/50 border-t border-gray-100 flex flex-wrap divide-x divide-gray-100">
                <div className="flex-1 min-w-[150px] p-3 flex items-center justify-center gap-3">
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ortalama Tempo</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className={`w-3.5 h-3.5 ${stats.paceMinutes > 10 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`} />
                            <span className="text-xs font-black text-gray-700">{stats.paceMinutes || 0} Dakika / İşlem</span>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-3 flex items-center justify-center text-gray-400">
                    <ChevronRight className="w-5 h-5 opacity-30" />
                </div>
                <div className="flex-1 min-w-[150px] p-3 bg-gradient-to-br from-indigo-50/30 to-white flex items-center justify-center gap-3">
                    <div className="flex items-center gap-2 group-hover:scale-110 transition-transform">
                        <div className={`w-2 h-2 rounded-full ${stats.calls > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Çevrimiçi Performans</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

