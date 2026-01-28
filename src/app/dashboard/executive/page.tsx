'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, PieChart, TrendingUp, DollarSign, Activity, Map, RefreshCcw } from 'lucide-react';
import { FinanceView } from '@/components/executive/FinanceView';
import { TeamView } from '@/components/executive/TeamView';
import { AnalyticsView } from '@/components/executive/AnalyticsView';

// Tabs
const TABS = [
    { id: 'finance', label: 'Finans', icon: DollarSign, color: 'text-emerald-400' },
    { id: 'team', label: 'Ekip', icon: Users, color: 'text-indigo-400' },
    { id: 'analytics', label: 'Analiz', icon: PieChart, color: 'text-purple-400' },
];

export default function ExecutiveDashboard() {
    const [activeTab, setActiveTab] = useState('finance');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/executive/stats', { cache: 'no-store' });
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error('Executive Data Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Auto-refresh every 5 minutes in background for BOSS (Low frequency)
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-[#0f172a] text-white flex flex-col font-sans overflow-hidden relative selection:bg-indigo-500/30">
            {/* Background Gradients */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
            </div>

            {/* Header (Minimal) */}
            <header className="relative z-10 px-6 pt-12 pb-4 flex justify-between items-end backdrop-blur-sm bg-black/10">
                <div>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mb-1">HOŞGELDİNİZ</p>
                    <h1 className="text-3xl font-black tracking-tight text-white/90">Patron Paneli</h1>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 p-[2px] active:scale-95 transition-transform"
                >
                    <div className="w-full h-full rounded-full bg-black/50 flex items-center justify-center backdrop-blur-md">
                        {loading ? (
                            <RefreshCcw className="w-5 h-5 text-white animate-spin" />
                        ) : (
                            <Activity className="w-5 h-5 text-white" />
                        )}
                    </div>
                </button>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 relative z-10 overflow-hidden flex flex-col">
                <AnimatePresence mode="wait">
                    {!data && loading ? (
                        <motion.div
                            key="loader"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex items-center justify-center"
                        >
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest animate-pulse">Veriler Analiz Ediliyor...</p>
                            </div>
                        </motion.div>
                    ) : (data && (
                        <>
                            {activeTab === 'finance' && (
                                <motion.div
                                    key="finance"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="flex-1 overflow-y-auto"
                                >
                                    <FinanceView
                                        data={data.finance}
                                        funnel={data.funnel}
                                        operational={data.operational}
                                        dailyDeliveries={data.dailyDeliveries}
                                    />
                                </motion.div>
                            )}

                            {activeTab === 'team' && (
                                <motion.div
                                    key="team"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="flex-1 overflow-y-auto"
                                >
                                    <TeamView teamStats={data.team} />
                                </motion.div>
                            )}

                            {activeTab === 'analytics' && (
                                <motion.div
                                    key="analytics"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="flex-1 overflow-y-auto"
                                >
                                    <AnalyticsView data={data.analytics} />
                                </motion.div>
                            )}
                        </>
                    ))}
                </AnimatePresence>
            </main>

            {/* Bottom Tab Bar (iOS Style) */}
            <nav className="relative z-20 px-6 pb-8 pt-4 bg-black/20 backdrop-blur-xl border-t border-white/5">
                <div className="flex justify-around items-center max-w-md mx-auto">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex flex-col items-center gap-1.5 transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <div className={`p-3 rounded-2xl transition-all duration-300 ${isActive ? 'bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-transparent'}`}>
                                    <Icon className={`w-6 h-6 ${isActive ? 'stroke-2' : 'stroke-1'}`} />
                                </div>
                                <span className="text-[10px] font-bold tracking-wider uppercase opacity-80">{tab.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="tab-indicator"
                                        className="absolute -bottom-2 w-1 h-1 bg-indigo-500 rounded-full"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
