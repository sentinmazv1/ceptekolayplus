'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import ActivityFeed from '@/components/ActivityFeed';
import { CustomerCard } from '@/components/CustomerCard';
import { DashboardStats } from '@/components/DashboardStats';
import { Customer } from '@/lib/types';
import { Loader2, LogOut, RefreshCcw, Phone, Users, Activity, Sparkles } from 'lucide-react';
import { UserPerformanceCard } from '@/components/UserPerformanceCard';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeLead, setActiveLead] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [performanceStats, setPerformanceStats] = useState<any>(null);

    const [stats, setStats] = useState<{ available: number, waiting_new: number, waiting_scheduled: number, waiting_retry: number, total_scheduled?: number } | null>(null);
    const [sourceNotification, setSourceNotification] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
        if (status === 'authenticated') {
            fetchStats();
            fetchPerformance();
            const interval = setInterval(() => {
                fetchStats();
                fetchPerformance();
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [status, router]);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/leads/stats');
            if (res.ok) {
                const json = await res.json();
                setStats(json);
            }
        } catch (e) {
            console.error('Stats fetch failed', e);
        }
    };

    const fetchPerformance = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await fetch(`/api/reports?startDate=${today}&endDate=${today}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.stats && json.stats.performance) {
                    setPerformanceStats(json.stats.performance);
                }
            }
        } catch (e) {
            console.error('Performance fetch failed', e);
        }
    };

    const pullLead = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/leads/pull', { method: 'POST' });
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.message || 'Müşteri çekilemedi');
            }

            setActiveLead(json.lead);
            if (json.lead.source) {
                setSourceNotification(json.lead.source);
            }
            fetchStats();
            fetchPerformance();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full relative space-y-8 pb-12">
            {/* Notification Modal */}
            {sourceNotification && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSourceNotification(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center transform scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">
                        <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 ring-4 ring-blue-50/50">
                            <span className="text-3xl filter drop-shadow-sm">
                                {sourceNotification.includes('Yeni') ? '🆕' :
                                    sourceNotification.includes('Randevu') ? '📅' : '♻️'}
                            </span>
                        </div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Müşteri Kaynağı</h3>
                        <p className="text-2xl font-black text-gray-900 mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{sourceNotification}</p>
                        <Button className="w-full font-bold shadow-lg shadow-blue-200 hover:shadow-xl transition-all" size="lg" onClick={() => setSourceNotification(null)}>
                            Tamam, Anlaşıldı
                        </Button>
                    </div>
                </div>
            )}

            {/* SECTION 1: ACTION AREA (HERO) */}
            <div className="w-full max-w-[1600px] mx-auto">
                {!activeLead ? (
                    <div className="w-full max-w-4xl mx-auto">
                        <div className="bg-gradient-to-br from-white to-indigo-50/30 backdrop-blur-xl p-8 md:p-10 rounded-[2rem] shadow-2xl border border-white/60 ring-1 ring-white/60 relative overflow-hidden group hover:shadow-indigo-200/40 transition-shadow duration-500">
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200/20 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none animate-pulse-slow"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-200/20 rounded-full blur-[60px] -ml-16 -mb-16 pointer-events-none animate-pulse-slow delay-700"></div>

                            <div className="relative z-10 flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-300 mb-8 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
                                    <Phone className="w-10 h-10 text-white" />
                                </div>

                                <h3 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 tracking-tight">
                                    Yeni Görüşme Başlat
                                </h3>
                                <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto leading-relaxed">
                                    Akıllı algoritma sizin için en uygun müşteriyi seçer ve aramayı başlatır.
                                </p>

                                {stats && (
                                    <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-xl">
                                        <div className="p-4 bg-blue-50/80 backdrop-blur-sm rounded-2xl border border-blue-100 flex flex-col items-center hover:bg-blue-100/80 transition-colors">
                                            <span className="font-black text-3xl text-blue-600 leading-none mb-1">{stats.waiting_new}</span>
                                            <span className="text-[10px] uppercase font-extrabold text-blue-400 tracking-wider">YENİ</span>
                                        </div>
                                        <div className="p-4 bg-purple-50/80 backdrop-blur-sm rounded-2xl border border-purple-100 flex flex-col items-center hover:bg-purple-100/80 transition-colors">
                                            <span className="font-black text-3xl text-purple-600 leading-none mb-1">{stats.waiting_scheduled}</span>
                                            <span className="text-[10px] uppercase font-extrabold text-purple-400 tracking-wider">RANDEVU</span>
                                        </div>
                                        <div className="p-4 bg-orange-50/80 backdrop-blur-sm rounded-2xl border border-orange-100 flex flex-col items-center hover:bg-orange-100/80 transition-colors">
                                            <span className="font-black text-3xl text-orange-600 leading-none mb-1">{stats.waiting_retry}</span>
                                            <span className="text-[10px] uppercase font-extrabold text-orange-400 tracking-wider">TEKRAR</span>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    size="lg"
                                    onClick={pullLead}
                                    isLoading={loading}
                                    className="w-full max-w-sm h-16 text-xl font-bold bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 shadow-xl shadow-indigo-300 hover:shadow-2xl hover:shadow-indigo-400 transition-all active:scale-95 rounded-2xl border-t border-white/20"
                                >
                                    {loading ? (
                                        <RefreshCcw className="w-6 h-6 mr-3 animate-[spin_2s_linear_infinite]" />
                                    ) : (
                                        <Sparkles className="w-6 h-6 mr-3 animate-pulse" />
                                    )}
                                    Müşteri Çek
                                </Button>

                                {error && (
                                    <div className="mt-6 p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                                        {error}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full max-w-6xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-6 pl-2">
                            <div className="flex items-center gap-3">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Aktif Görüşme</h2>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setActiveLead(null)}
                                size="sm"
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Görüşmeyi Sonlandır
                            </Button>
                        </div>
                        <CustomerCard
                            initialData={activeLead}
                            onSave={() => {
                                setActiveLead(null);
                                fetchStats();
                                fetchPerformance();
                            }}
                        />
                    </div>
                )}
            </div>

            {/* SECTION 2: TEAM PULSE (Split Layout) */}
            <div className="w-full max-w-[1600px] mx-auto px-1">
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* LEFT: Performance Cards (2/3 width on large screens) */}
                    <div className="flex-1 lg:w-2/3 flex flex-col gap-6">
                        <div className="flex items-center gap-3 px-2">
                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Ekip Performansı</h2>
                                <p className="text-xs text-gray-500 font-bold">Bugünün Liderleri ve Hedefleri</p>
                            </div>
                        </div>

                        {performanceStats ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                                {Object.entries(performanceStats)
                                    .sort((a: any, b: any) => b[1].calls - a[1].calls)
                                    .map(([user, pStats]: any) => (
                                        <div key={user} className="transform transition-all duration-300 hover:-translate-y-1">
                                            <UserPerformanceCard user={user} stats={pStats} />
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="h-48 flex items-center justify-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Activity Feed (1/3 width on large screens) */}
                    <div className="lg:w-1/3 h-[600px] lg:sticky lg:top-8">
                        <div className="flex items-center gap-3 px-2 mb-6">
                            <div className="p-2 bg-pink-100 rounded-lg text-pink-600">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Canlı Akış</h2>
                                <p className="text-xs text-gray-500 font-bold">Anlık Sistem Aktiviteleri</p>
                            </div>
                        </div>
                        <div className="h-full rounded-2xl overflow-hidden shadow-lg shadow-gray-200/50 border border-gray-100 bg-white">
                            <ActivityFeed />
                        </div>
                    </div>

                </div>
            </div>

            {/* SECTION 3: GENERAL STATS (Full Width Bottom) */}
            <div className="w-full max-w-[1600px] mx-auto px-1 pt-8 border-t border-gray-100 mt-8">
                <DashboardStats />
            </div>
        </div>
    );
}
