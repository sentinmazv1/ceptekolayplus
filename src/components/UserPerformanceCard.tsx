
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

            <div className="p-4 grid grid-cols-2 gap-4 divide-x divide-gray-100">
                {/* Left: Activity */}
                <div className="pr-2 space-y-4">
                    <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        İLETİŞİM
                    </h4>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span className="text-xs font-bold">Arama</span>
                        </div>
                        <span className="text-xl font-black text-gray-900">{stats.calls}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-gray-600">
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-xs font-bold">SMS</span>
                        </div>
                        <span className="text-base font-bold text-gray-700">{stats.sms || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-gray-600">
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-xs font-bold">WP</span>
                        </div>
                        <span className="text-base font-bold text-gray-700">{stats.whatsapp || 0}</span>
                    </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-gray-100 col-span-2">
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                        <div className="flex items-center gap-2 text-gray-500">
                            <Target className="w-4 h-4 text-orange-500" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Back Office / İşlem</span>
                        </div>
                        <span className="text-lg font-black text-gray-800">
                            {/* Back Office = Total Logs - (Calls + SMS + WP) roughly, 
                                but simpler is just to show Total Logs as "Total Touchpoints" 
                                OR subtract communication logs to show "Admin Work" */}
                            {Math.max(0, (stats.totalLogs || 0) - (stats.calls + (stats.sms || 0) + (stats.whatsapp || 0)))}
                        </span>
                    </div>
                </div>

                {/* Right: Funnel & Results */}
                <div className="pl-4 space-y-4">
                    <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        SONUÇ
                    </h4>

                    <div className="flex justify-between items-center bg-blue-50/50 p-2 rounded-lg border border-blue-50">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-blue-800">Başvuru</span>
                            <span className="text-[9px] text-blue-400 font-bold">%{appRate} Dönüşüm</span>
                        </div>
                        <span className="text-xl font-black text-blue-700">{stats.applications || 0}</span>
                    </div>

                    <div className="flex justify-between items-center bg-emerald-50/50 p-2 rounded-lg border border-emerald-50">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-emerald-800">Onay</span>
                            <span className="text-[9px] text-emerald-600 font-bold">{formatShortCurrency(stats.approvedLimit)}</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-xl font-black text-emerald-700">{stats.approvals}</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* Footer: Pace */}
            <div className="bg-gray-50 p-2 flex justify-between items-center border-t border-gray-100">
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase">
                    <Clock className="w-3 h-3" /> ORT. ARAMA HIZI
                </div>
                <span className={`text-xs font-black ${stats.paceMinutes > 8 ? 'text-red-500' : 'text-emerald-600'} bg-white px-2 py-0.5 rounded shadow-sm`}>
                    {stats.paceMinutes > 0 ? `${stats.paceMinutes} dk/çağrı` : '-'}
                </span>
            </div>
        </div>
    );
}
