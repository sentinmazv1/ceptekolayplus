import { ArrowUpRight, Target } from 'lucide-react';

interface CurrentMonthBarProps {
    data: any;
    loading: boolean;
}

export function CurrentMonthBar({ data, loading }: CurrentMonthBarProps) {
    const today = new Date();
    const currentMonthName = today.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayOfMonth = today.getDate();
    const progress = (dayOfMonth / daysInMonth) * 100;

    // Formatting
    const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);

    const turnover = data?.kpi?.turnover || 0;
    const target = 2000000; // Example Target: 2M TL (This could be configurable later)
    const targetProgress = Math.min((turnover / target) * 100, 100);

    if (loading) return <div className="w-full h-24 bg-white/5 animate-pulse rounded-2xl mb-8"></div>;

    return (
        <div className="relative w-full overflow-hidden bg-gradient-to-r from-indigo-900/40 to-slate-900/40 border border-indigo-500/20 rounded-2xl p-6 mb-8 backdrop-blur-xl">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                <div className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                {/* Left: Time Context */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Target className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white">{currentMonthName}</h2>
                        <div className="flex items-center gap-2 text-sm text-indigo-300">
                            <span>{dayOfMonth}. Gün / {daysInMonth}</span>
                            <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
                            <span>%{progress.toFixed(0)} Tamamlandı</span>
                        </div>
                    </div>
                </div>

                {/* Center: Financial Progress */}
                <div className="flex-1 w-full md:max-w-xl">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-400">Ciro Hedefi ({formatCurrency(target)})</span>
                        <span className="text-white font-bold">%{targetProgress.toFixed(1)}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden relative">
                        {/* Target Markers */}
                        <div className="absolute top-0 bottom-0 left-[25%] un-blur w-0.5 bg-white/10 z-10"></div>
                        <div className="absolute top-0 bottom-0 left-[50%] un-blur w-0.5 bg-white/10 z-10"></div>
                        <div className="absolute top-0 bottom-0 left-[75%] un-blur w-0.5 bg-white/10 z-10"></div>

                        {/* Bars */}
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
                            style={{ width: `${targetProgress}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>0₺</span>
                        <span>{formatCurrency(turnover)} (Mevcut)</span>
                        <span>{formatCurrency(target)}</span>
                    </div>
                </div>

                {/* Right: Quick Stats */}
                <div className="flex gap-6 divide-x divide-white/10">
                    <div className="pl-6 first:pl-0 text-center md:text-right">
                        <div className="text-sm text-slate-400 mb-1">Ciro</div>
                        <div className="text-xl font-bold text-white tracking-tight">{formatCurrency(turnover)}</div>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-400">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Canlı</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
