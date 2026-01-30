'use client';

import { useState, useEffect } from 'react';
import { RefreshCcw, Calendar } from 'lucide-react';
import { DashboardTabs } from '@/components/executive/DashboardTabs';
import { GeneralView } from '@/components/executive/GeneralView';
import { DailyView } from '@/components/executive/DailyView';
import { StockView } from '@/components/executive/StockView';
import { motion, AnimatePresence } from 'framer-motion';

export default function ExecutiveDashboard() {
    const [mounted, setMounted] = useState(false);

    // Dates 
    // Initialize with empty/safe values to avoid hydration mismatch
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [activeTab, setActiveTab] = useState<'general' | 'daily' | 'stock'>('general');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    // Hydration Fix: Set dates only on client
    useEffect(() => {
        const now = new Date();
        // Use 'en-CA' for YYYY-MM-DD format consistency
        setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA'));
        setEndDate(now.toLocaleDateString('en-CA'));
        setMounted(true);
    }, []);

    const fetchData = async () => {
        if (!startDate || !endDate) return; // Wait for dates to be set

        setLoading(true);
        try {
            const params = new URLSearchParams({ startDate, endDate });
            const res = await fetch(`/api/executive/stats/v2?${params.toString()}`, { cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error('Executive V3 Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mounted) fetchData();
    }, [startDate, endDate, mounted]);

    // PREVENT HYDRATION MISMATCH
    // Render a loading state or nothing on server
    if (!mounted) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-8">
        <div className="animate-pulse w-full max-w-7xl space-y-8">
            <div className="h-12 w-1/3 bg-white/5 rounded-2xl"></div>
            <div className="h-96 w-full bg-white/5 rounded-3xl"></div>
        </div>
    </div>;

    return (
        <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Background Gradients */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/20 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
                                Versiyon 3.0
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-1">Patron Paneli</h1>
                        <p className="text-slate-400 text-sm">Finansal Durum & Operasyonel Analiz</p>
                    </div>

                    {/* CONTROLS (Only visible for Daily View) */}
                    <div className="flex items-center gap-3">
                        {activeTab === 'daily' && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md"
                            >
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
                            </motion.div>
                        )}

                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className={`p-3 bg-white/5 border border-white/10 rounded-2xl transition-all ${loading ? 'opacity-50' : 'hover:bg-white/10 active:scale-95'}`}
                        >
                            <RefreshCcw className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* TABS */}
                <DashboardTabs activeTab={activeTab} onChange={setActiveTab} />

                {/* CONTENT */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === 'general' && <GeneralView data={data} loading={loading} />}
                        {activeTab === 'daily' && <DailyView data={data} loading={loading} />}
                        {activeTab === 'stock' && <StockView data={data} loading={loading} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
