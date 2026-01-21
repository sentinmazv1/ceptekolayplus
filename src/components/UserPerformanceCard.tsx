
import { Target, Phone, MessageSquare, MessageCircle, TrendingUp, Clock } from 'lucide-react';

export function UserPerformanceCard({ user, stats }: { user: string, stats: any }) {
    // Rates calculation using new metrics
    // Conversion: Applications / Calls
    const appRate = stats.calls > 0 ? Math.round((stats.applications / stats.calls) * 100) : 0;
    // Approal Rate: Approvals / Applications
    const approvalRate = stats.applications > 0 ? Math.round((stats.approvals / stats.applications) * 100) : 0;

    // Goal Progress
    const goalPercent = stats.dailyGoal > 0 ? Math.min(100, Math.round((stats.calls / stats.dailyGoal) * 100)) : 0;

    const formatShortCurrency = (val: number) => {
        if (!val) return '0 ₺';
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0, notation: 'compact' }).format(val);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-200">
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-white border border-indigo-100 text-indigo-700 flex items-center justify-center font-black text-lg shadow-sm">
                        {user.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 text-base">{user.split('@')[0]}</div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full w-fit">
                            <span>Hedef: {stats.dailyGoal} Çağrı</span>
                        </div>
                    </div>
                </div>
                {/* Goal Gauge */}
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="24" cy="24" r="20" stroke="#E5E7EB" strokeWidth="4" fill="none" />
                        <circle cx="24" cy="24" r="20" stroke="#4F46E5" strokeWidth="4" fill="none" strokeDasharray={`${goalPercent * 1.25} 125`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-gray-700">%{goalPercent}</span>
                </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                {/* Left: Input Activity (Funnel Start) */}
                <div className="space-y-4">
                    <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Target className="w-3 h-3 text-indigo-500" />
                        GİRİŞ / AKTİVİTE
                    </h4>

                    <div className="flex justify-between items-center group/item hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                        <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-bold">Müşteri Çekme</span>
                        </div>
                        <span className="text-lg font-black text-gray-900">{stats.pulled || 0}</span>
                    </div>

                    <div className="flex justify-between items-center group/item hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                        <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-bold">Arama</span>
                        </div>
                        <span className="text-lg font-black text-gray-900">{stats.calls}</span>
                    </div>

                    <div className="flex justify-between items-center group/item hover:bg-gray-50 p-1.5 rounded-lg transition-colors">
                        <div className="flex items-center gap-2 text-gray-600">
                            <MessageSquare className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-bold">SMS / WA</span>
                        </div>
                        <span className="text-base font-bold text-gray-700">{(stats.sms || 0) + (stats.whatsapp || 0)}</span>
                    </div>

                    <div className="pt-2 border-t border-gray-50">
                        <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100 shadow-inner">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-gray-400 uppercase">Back Office</span>
                                <span className="text-[8px] text-gray-400 font-bold tracking-tighter">DİĞER İŞLEMLER</span>
                            </div>
                            <span className="text-xl font-black text-gray-800 tabular-nums">
                                {stats.backoffice || 0}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Output Results (Funnel End) */}
                <div className="pt-6 md:pt-0 md:pl-6 space-y-3">
                    <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        ÇIKTI / SONUÇ
                    </h4>

                    <div className="flex justify-between items-center bg-blue-50/50 p-2.5 rounded-xl border border-blue-100 shadow-sm">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-blue-800 uppercase tracking-wide">Başvuru</span>
                            <span className="text-[9px] text-blue-500 font-bold">%{appRate} Dönüşüm</span>
                        </div>
                        <span className="text-2xl font-black text-blue-700">{stats.applications || 0}</span>
                    </div>

                    <div className="flex justify-between items-center bg-purple-50/50 p-2.5 rounded-xl border border-purple-100 shadow-sm">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-purple-800 uppercase tracking-wide">Onay</span>
                            <span className="text-[9px] text-purple-500 font-bold">{formatShortCurrency(stats.approvedLimit || 0)}</span>
                        </div>
                        <span className="text-2xl font-black text-purple-700 text-right">{stats.approvals || 0}</span>
                    </div>

                    <div className="flex justify-between items-center bg-emerald-500 p-2.5 rounded-xl border border-emerald-600 shadow-md text-white">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-tight">Teslimat / Satış</span>
                            <span className="text-[9px] font-bold opacity-80">TAMAMLANDI</span>
                        </div>
                        <span className="text-2xl font-black">{stats.sales || 0}</span>
                    </div>
                </div>
            </div>

            {/* Footer: Pace */}
            <div className="bg-gray-50/80 p-3 flex justify-between items-center border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    <Clock className="w-3.5 h-3.5" /> TEMP (HIZ)
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-black ${stats.paceMinutes > 8 ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-green-50'} px-2.5 py-1 rounded-lg border border-current/10 shadow-sm`}>
                        {stats.paceMinutes > 0 ? `${stats.paceMinutes} dk / işlem` : '-'}
                    </span>
                </div>
            </div>
        </div>
    );
}
