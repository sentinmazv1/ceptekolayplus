'use client';

import { motion } from 'framer-motion';
import { TrendingUp, CreditCard, ShoppingBag, ArrowUpRight } from 'lucide-react';

interface FinanceViewProps {
    data: {
        dailyRevenue: number;
        monthlyRevenue: number;
        dailySalesCount: number;
        monthlySalesCount: number;
        target: number;
    };
    recentSales: Array<{
        name: string;
        price: number;
        date: string;
        user: string;
    }>;
}

export function FinanceView({ data, recentSales }: FinanceViewProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
    };

    const progress = Math.min((data.monthlyRevenue / data.target) * 100, 100);

    return (
        <div className="space-y-6 pb-24">
            {/* 1. Hero Cards (Horizontal Scroll) */}
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x px-6 -mx-6 scrollbar-hide">

                {/* Card 1: Monthly Revenue (Main) */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="snap-center shrink-0 w-[85vw] md:w-96 p-6 rounded-[2rem] bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/5 relative overflow-hidden shadow-2xl"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <span className="text-gray-400 font-bold tracking-wider text-xs uppercase">Bu Ay Toplam Ciro</span>
                        </div>
                        <div className="text-4xl font-black text-white tracking-tight mb-2">
                            {formatCurrency(data.monthlyRevenue)}
                        </div>
                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold bg-emerald-500/10 self-start inline-flex px-3 py-1 rounded-full">
                            <ArrowUpRight className="w-4 h-4" />
                            %18 Artış
                        </div>

                        {/* Target Progress */}
                        <div className="mt-6">
                            <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                                <span>Aylık Hedef: {formatCurrency(data.target)}</span>
                                <span>%{progress.toFixed(1)}</span>
                            </div>
                            <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Card 2: Daily Revenue */}
                <div className="snap-center shrink-0 w-[70vw] md:w-80 p-6 rounded-[2rem] bg-gradient-to-br from-[#1e1b4b] to-[#0f172a] border border-white/5 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <span className="text-gray-400 font-bold tracking-wider text-xs uppercase">Bugün (Canlı)</span>
                        </div>
                        <div className="text-4xl font-black text-white tracking-tight mb-2">
                            {formatCurrency(data.dailyRevenue)}
                        </div>
                        <p className="text-sm text-gray-400 font-medium">{data.dailySalesCount} Adet Satış</p>
                    </div>
                </div>
            </div>

            {/* 2. Recent Sales Carousel */}
            <div className="px-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white/90">Son Satışlar</h3>
                    <div className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full">Canlı Akış</div>
                </div>

                <div className="space-y-3">
                    {recentSales.map((sale, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors"
                        >
                            {/* Product Image Placeholder */}
                            <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center shrink-0 border border-white/10">
                                <ShoppingBag className="w-6 h-6 text-indigo-400" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-white text-sm truncate">{sale.name}</h4>
                                <p className="text-xs text-gray-400 truncate">Satıcı: {sale.user.split('@')[0]}</p>
                            </div>

                            <div className="text-right">
                                <div className="font-black text-emerald-400 text-sm">
                                    {formatCurrency(sale.price)}
                                </div>
                                <div className="text-[10px] text-gray-500 font-medium">
                                    {new Date(sale.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
