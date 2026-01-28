'use client';

import { motion } from 'framer-motion';
import { Phone, CheckCircle, TrendingUp, Truck, FileText, ArrowUp, ArrowDown, ShoppingBag } from 'lucide-react';

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
    dailyDeliveries: Array<{
        customer: string;
        product: string;
        price: number;
        user: string;
    }>;
}

export function FinanceView({ data, funnel, dailyDeliveries }: FinanceViewProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
    };

    // Calculate Trend Percentage
    const getTrend = (today: number, yesterday: number) => {
        if (yesterday === 0) return today > 0 ? 100 : 0;
        return Math.round(((today - yesterday) / yesterday) * 100);
    };

    const renderFunnelCard = (title: string, today: number, yesterday: number, icon: any, color: string, delay: number) => {
        const trend = getTrend(today, yesterday);
        const isUp = trend >= 0;

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay }}
                className="flex-1 min-w-[140px] p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm relative overflow-hidden group"
            >
                <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-10 blur-xl ${color}`}></div>

                <div className="flex justify-between items-start mb-2">
                    <div className={`p-2 rounded-xl bg-white/5 ${color.replace('bg-', 'text-')}`}>
                        {icon}
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        %{Math.abs(trend)}
                    </div>
                </div>

                <div className="text-2xl font-black text-white mb-1">{today}</div>
                <div className="text-xs text-gray-400 font-medium">{title}</div>
                <div className="text-[10px] text-gray-500 mt-1">Dün: {yesterday}</div>
            </motion.div>
        );
    };

    return (
        <div className="space-y-8 pb-24 px-6 pt-4">

            {/* 1. DAILY TURNOVER (Hero) */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-500/20 shadow-2xl relative overflow-hidden text-center"
            >
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="relative z-10">
                    <h2 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2">GÜNLÜK CİRO</h2>
                    <div className="text-5xl font-black text-white tracking-tighter drop-shadow-lg mb-2">
                        {formatCurrency(data.dailyTurnover)}
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-indigo-300">
                        <TrendingUp className="w-3 h-3" />
                        Hedef: {formatCurrency(data.target)}
                    </div>
                </div>
            </motion.div>

            {/* 2. SALES FUNNEL GRID */}
            <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">Günün Özeti (Satış Hunisi)</h3>
                <div className="grid grid-cols-2 gap-3">
                    {renderFunnelCard('Aranan', funnel.calls.today, funnel.calls.yesterday, <Phone className="w-5 h-5" />, 'bg-blue-500', 0.1)}
                    {renderFunnelCard('Başvuru', funnel.leads.today, funnel.leads.yesterday, <FileText className="w-5 h-5" />, 'bg-purple-500', 0.2)}
                    {renderFunnelCard('Onaylanan', funnel.approved.today, funnel.approved.yesterday, <CheckCircle className="w-5 h-5" />, 'bg-emerald-500', 0.3)}
                    {renderFunnelCard('Teslimat', funnel.delivered.today, funnel.delivered.yesterday, <Truck className="w-5 h-5" />, 'bg-amber-500', 0.4)}
                </div>
            </div>

            {/* 3. DAILY DELIVERIES LIST */}
            <div>
                <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Günün Teslimatları</h3>
                    <div className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full">
                        {dailyDeliveries.length} Adet
                    </div>
                </div>

                <div className="space-y-3">
                    {dailyDeliveries.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm bg-white/5 rounded-2xl border border-white/5 border-dashed">
                            Henüz teslimat yapılmadı.
                        </div>
                    ) : (
                        dailyDeliveries.map((sale, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + (i * 0.05) }}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors"
                            >
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shrink-0 border border-white/10">
                                    <ShoppingBag className="w-5 h-5 text-indigo-300" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white text-sm truncate">{sale.customer}</h4>
                                    <p className="text-xs text-gray-400 truncate">{sale.product}</p>
                                </div>

                                <div className="text-right">
                                    <div className="font-bold text-emerald-400 text-sm">
                                        {formatCurrency(sale.price)}
                                    </div>
                                    <div className="text-[10px] text-gray-600 font-medium">
                                        Satış: {sale.user.split('@')[0]}
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
