'use client';

import { motion } from 'framer-motion';
import { Phone, CheckCircle, TrendingUp, Truck, FileText, ArrowUp, ArrowDown, ShoppingBag, MessageSquare, BookOpen, Calculator, Target, Info } from 'lucide-react';

interface FinanceViewProps {
    data: {
        dailyTurnover: number;
        monthlyTurnover: number;
        target: number;
    };
    funnel: {
        calls: { today: number; yesterday: number };
        leads: { today: number; yesterday: number };
        approved: { today: number; yesterday: number };
        delivered: { today: number; yesterday: number };
    };
    operational?: {
        totalCalls: number;
        totalSms: number;
        totalWhatsapp: number;
        totalLogs: number;
        totalProducts: number;
        totalDeals: number;
    };
    dailyDeliveries: Array<{
        customer: string;
        product: string;
        price: number;
        user: string;
    }>;
}

export function FinanceView({ data, funnel, operational, dailyDeliveries }: FinanceViewProps) {
    // 1. Safe Defaults
    const safeData = data || { dailyTurnover: 0, monthlyTurnover: 0, target: 1 };

    // Calculate Projections
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    // Average Daily Revenue (Month to Date)
    // Avoid division by zero
    const avgDailyRevenue = dayOfMonth > 0 ? (safeData.monthlyTurnover / dayOfMonth) : 0;

    // Projected End of Month Revenue
    const projectedRevenue = avgDailyRevenue * daysInMonth;

    const safeDeliveries = Array.isArray(dailyDeliveries) ? dailyDeliveries : [];

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val || 0);
    };

    return (
        <div className="space-y-6 pb-24 px-6 pt-4">

            {/* 1. HERO SECTION: Monthly Financials & Projection */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-6 md:p-8 rounded-[2rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 shadow-2xl relative overflow-hidden"
            >
                {/* Background Effects */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">

                        {/* Main Metric: Monthly Turnover */}
                        <div className="flex-1">
                            <h2 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-indigo-400" />
                                Bu Ay Toplam Ciro
                            </h2>
                            <div className="text-4xl md:text-6xl font-black text-white tracking-tighter drop-shadow-lg tabular-nums">
                                {formatCurrency(safeData.monthlyTurnover)}
                            </div>
                            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-300">
                                <span>Günlük Ort: {formatCurrency(avgDailyRevenue)}</span>
                            </div>
                        </div>

                        {/* Projection Card */}
                        <div className="w-full md:w-auto bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm relative group overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                            <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Tahmini Ay Sonu</h3>
                            <div className="text-2xl font-black text-emerald-400 tabular-nums">
                                {formatCurrency(projectedRevenue)}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                <Calculator className="w-3 h-3" />
                                Mevcut performansa göre
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* 2. OPERATIONAL COMMAND CENTER (Grid) */}
            <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <ActivityIcon className="w-4 h-4" />
                        Operasyonel Toplamlar (Bu Ay)
                    </h3>
                    <div className="text-[10px] bg-white/10 text-gray-400 px-2 py-1 rounded-lg">
                        Tüm Ekip
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Sales Count */}
                    <StatCard
                        title="Toplam Satış"
                        value={operational?.totalDeals || 0}
                        icon={Target}
                        color="text-emerald-400"
                        bg="bg-emerald-500/10"
                        subtext={`${operational?.totalProducts || 0} Ürün`}
                        delay={0.1}
                    />

                    {/* Calls */}
                    <StatCard
                        title="Toplam Arama"
                        value={operational?.totalCalls || 0}
                        icon={Phone}
                        color="text-blue-400"
                        bg="bg-blue-500/10"
                        delay={0.2}
                    />

                    {/* Logs */}
                    <StatCard
                        title="Back Office Log"
                        value={operational?.totalLogs || 0}
                        icon={BookOpen}
                        color="text-amber-400"
                        bg="bg-amber-500/10"
                        delay={0.3}
                    />

                    {/* SMS */}
                    <StatCard
                        title="SMS Gönderimi"
                        value={operational?.totalSms || 0}
                        icon={MessageSquare}
                        color="text-purple-400"
                        bg="bg-purple-500/10"
                        delay={0.4}
                    />

                    {/* WhatsApp */}
                    <StatCard
                        title="WhatsApp"
                        value={operational?.totalWhatsapp || 0}
                        icon={MessageSquare}
                        color="text-green-400"
                        bg="bg-green-500/10"
                        delay={0.5}
                    />
                </div>
            </div>

            {/* 3. DAILY DELIVERIES LIST (Compact) */}
            <div>
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Son Teslimatlar</h3>
                    <div className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full">
                        Bugün: {safeDeliveries.length}
                    </div>
                </div>

                <div className="space-y-2">
                    {safeDeliveries.length === 0 ? (
                        <div className="text-center py-8 text-gray-600 text-xs bg-white/5 rounded-2xl border border-white/5 border-dashed">
                            Bugün henüz teslimat yok.
                        </div>
                    ) : (
                        safeDeliveries.slice(0, 5).map((sale, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + (i * 0.05) }}
                                className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 border border-white/10 text-indigo-300">
                                    <ShoppingBag className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white text-xs truncate">{sale.customer}</h4>
                                    <p className="text-[10px] text-gray-400 truncate">{sale.product}</p>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-emerald-400 text-xs">
                                        {formatCurrency(sale.price)}
                                    </div>
                                    <div className="text-[9px] text-gray-500">
                                        {(sale.user || '').split('@')[0]}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, bg, subtext, delay }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay }}
            className={`p-4 rounded-xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all ${bg}`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className={`p-1.5 rounded-lg bg-white/10 ${color}`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <div className={`text-2xl font-black ${color} tracking-tight`}>
                {new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(value)}
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1">{title}</div>

            {subtext && (
                <div className="absolute top-4 right-4 text-[9px] font-medium text-gray-500 bg-black/20 px-1.5 py-0.5 rounded">
                    {subtext}
                </div>
            )}
        </motion.div>
    );
}

function ActivityIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )
}
