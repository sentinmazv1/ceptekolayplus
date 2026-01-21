'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import ActivityFeed from '@/components/ActivityFeed';
import { CustomerCard } from '@/components/CustomerCard';
import { ActionCenter } from '@/components/ActionCenter';
import { Customer } from '@/lib/types';
import { Loader2, LogOut, Users, FileText, CheckCircle2 } from 'lucide-react';
import { UserPerformanceCard } from '@/components/UserPerformanceCard';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeLead, setActiveLead] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [performanceStats, setPerformanceStats] = useState<any>(null);

    // Stats for Quick View (Optional, kept minimal)
    const [stats, setStats] = useState<any>(null);
    const [sourceNotification, setSourceNotification] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/');
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
            if (res.ok) setStats(await res.json());
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
                if (json.success && json.stats?.performance) {
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

            if (!res.ok) throw new Error(json.message || 'Müşteri çekilemedi');

            setActiveLead(json.lead);
            if (json.lead.source) setSourceNotification(json.lead.source);
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
        <div className="flex flex-col h-full relative space-y-6 pb-12 max-w-[1920px] mx-auto px-4">
            {/* Notification Modal */}
            {sourceNotification && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSourceNotification(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center transform scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Müşteri Kaynağı</h3>
                        <p className="text-2xl font-black mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                            {sourceNotification}
                        </p>
                        <Button className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={() => setSourceNotification(null)}>
                            Görüşmeye Başla
                        </Button>
                    </div>
                </div>
            )}

            {/* ERROR ALERT */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                    {error}
                </div>
            )}

            {/* ROW 1: ACTION CENTER (Full Width) */}
            <div>
                <ActionCenter onPullLead={pullLead} loading={loading} />
            </div>

            {/* ROW 2: MAIN WORKSPACE (Split 2:1 on wide screens) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* COL 1 (Main): Active Customer & Team Stats (Span 2) */}
                <div className="xl:col-span-2 space-y-6">

                    {/* Active Customer View */}
                    {activeLead ? (
                        <div className="animate-in slide-in-from-left-4 duration-500">
                            <div className="flex justify-between items-center mb-4 pl-1">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Aktif Görüşme Kartı</h2>
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
                    ) : (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl h-64 flex flex-col items-center justify-center text-gray-400 gap-4">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <FileText className="w-8 h-8 text-gray-300" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-gray-500">Aktif Görüşme Yok</h3>
                                <p className="text-sm">Yeni bir müşteri çekmek için yukarıdaki butonu kullanın.</p>
                            </div>
                        </div>
                    )}

                    {/* Team Performance Grid */}
                    <div className="pt-8 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-600" />
                                <h2 className="text-lg font-black text-gray-900 uppercase">Ekip Performansı</h2>
                            </div>
                            <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                Canlı
                            </div>
                        </div>

                        {performanceStats ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(performanceStats)
                                    .sort((a: any, b: any) => b[1].calls - a[1].calls)
                                    .map(([user, pStats]: any) => (
                                        <div key={user} className="transform transition-all duration-300 hover:-translate-y-1">
                                            <UserPerformanceCard user={user} stats={pStats} />
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="h-32 flex items-center justify-center bg-white rounded-2xl border border-gray-100">
                                <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
                            </div>
                        )}
                    </div>
                </div>

                {/* COL 2 (Side): Activity Feed & Summary */}
                <div className="xl:col-span-1 space-y-6">
                    {/* Live Feed */}
                    <div className="h-[600px] xl:sticky xl:top-6">
                        <ActivityFeed />
                    </div>

                    {/* Quick Daily Summary (Mini) */}
                    {stats && (
                        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 text-white shadow-xl xl:sticky xl:top-[640px]">
                            <h3 className="font-bold text-indigo-100 text-xs uppercase mb-4 tracking-widest border-b border-white/10 pb-2">Günün Özeti</h3>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <div className="text-3xl font-black">{stats.approved || 0}</div>
                                    <div className="text-[10px] text-indigo-200 uppercase font-bold">Onaylanan</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-emerald-400">{stats.delivered || 0}</div>
                                    <div className="text-[10px] text-emerald-200 uppercase font-bold">Teslim Edilen</div>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-white/10 mt-2">
                                    <div className="flex justify-between items-center text-xs font-medium text-indigo-200">
                                        <span>Bekleyen (Havuz)</span>
                                        <span className="text-white font-bold">{stats.available || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
