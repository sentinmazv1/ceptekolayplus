'use client';

import { useState, useEffect } from 'react';
import { RefreshCcw, Calendar, ChevronDown } from 'lucide-react';
import { KPISection } from '@/components/executive/KPISection';
import { ChartsSection } from '@/components/executive/ChartsSection';
import { motion, AnimatePresence } from 'framer-motion';

export default function ExecutiveDashboard() {
    // Dates (Default: This Month)
    const [startDate, setStartDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
    });
    const [endDate, setEndDate] = useState(() => new Date().toLocaleDateString('en-CA'));

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ startDate, endDate });
            const res = await fetch(`/api/executive/stats/v2?${params.toString()}`, { cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error('Executive V2 Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    return (
        <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Background Gradients */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/20 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
                                Versiyon 2.0
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-1">Patron Paneli</h1>
                        <p className="text-slate-400 text-sm">Finansal Durum & Operasyonel Analiz</p>
                    </div>

                    {/* CONTROLS */}
                    <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
                        <div className="flex items-center gap-2 px-3 py-1.5 border-r border-white/10">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent text-white text-xs font-bold outline-none [&::-webkit-calendar-picker-indicator]:invert cursor-pointer w-24"
                            />
                            <span className="text-slate-500">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-white text-xs font-bold outline-none [&::-webkit-calendar-picker-indicator]:invert cursor-pointer w-24"
                            />
                        </div>
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className={`p-2 rounded-xl transition-all ${loading ? 'opacity-50' : 'hover:bg-white/10 active:scale-95'}`}
                        >
                            <RefreshCcw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* CONTENT */}
                <AnimatePresence mode="wait">
                    {data || loading ? (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {/* KPI CARDS */}
                            <KPISection data={data?.kpi || { turnover: 0, salesCount: 0, leadCount: 0, conversion: 0, avgDealSize: 0 }} loading={loading} />

                            {/* CHARTS */}
                            <ChartsSection
                                dailyTrend={data?.charts?.dailyTrend || []}
                                teamPerformance={data?.charts?.teamPerformance || []}
                                loading={loading}
                            />

                            {/* SOURCE & TABLE */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#1e293b]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                                    <h3 className="text-white font-bold text-lg mb-4">Kaynak Verimliliği</h3>
                                    <div className="space-y-3">
                                        {data?.charts?.sourcePerformance?.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <div className="w-24 text-xs text-slate-400 truncate text-right">{item.name}</div>
                                                <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: `${(item.value / (data.kpi.salesCount || 1)) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <div className="w-12 text-xs font-bold text-white text-right">{item.value}</div>
                                            </div>
                                        ))}
                                        {(!data?.charts?.sourcePerformance?.length && !loading) && (
                                            <div className="text-center text-slate-500 text-xs py-10">Veri bulunamadı</div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-[#1e293b]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                                    <h3 className="text-white font-bold text-lg mb-4">Top Ürünler</h3>
                                    <div className="space-y-3">
                                        {data?.charts?.topProducts?.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">
                                                        {idx + 1}
                                                    </div>
                                                    <span className="text-sm text-slate-200 font-medium">{item.name}</span>
                                                </div>
                                                <span className="text-xs font-bold text-white bg-slate-700 px-2 py-1 rounded-md">{item.value} Adet</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>
        </div>
    );
}
