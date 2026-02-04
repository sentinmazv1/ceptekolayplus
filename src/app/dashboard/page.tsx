'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { CustomerCard } from '@/components/CustomerCard';
import { ActionCenter } from '@/components/ActionCenter';
// import TickerFeed from '@/components/TickerFeed'; // REMOVED
import { Customer } from '@/lib/types';
import { Loader2, LogOut, Users, FileText, RefreshCcw } from 'lucide-react';
import { UserPerformanceCard } from '@/components/UserPerformanceCard';
import { DashboardHighlights } from '@/components/DashboardHighlights';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeLead, setActiveLead] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [performanceStats, setPerformanceStats] = useState<any>(null);
    const [myStats, setMyStats] = useState<any>(null);
    const [teamStats, setTeamStats] = useState<any>(null); // New Team Stats
    const [newLeadCount, setNewLeadCount] = useState<number>(0);

    const [sourceNotification, setSourceNotification] = useState<string | null>(null);

    // TODO: Move this to a proper role check context later
    const isAdmin = session?.user?.email === 'ibrahimsentinmaz@gmail.com' || session?.user?.email === 'admin';

    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    // Otomatik Yenileme İPTAL EDİLDİ (Ölü Mod)
    // Sadece sayfa ilk açıldığında çalışır.
    useEffect(() => {
        if (status === 'authenticated') {
            fetchPerformance();
        }
    }, [status]); // router removed to prevent re-fetch on navigation

    const handleManualRefresh = () => {
        setLoading(true);
        fetchPerformance().finally(() => {
            setLoading(false);
            setLastUpdated(new Date());
        });
    };

    const fetchPerformance = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await fetch(`/api/reports?startDate=${today}&endDate=${today}`);
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.stats) {
                    if (json.stats.performance) {
                        const pStats = json.stats.performance;
                        setPerformanceStats(pStats);

                        // Calculate Team Stats
                        const team: any = Object.values(pStats).reduce((acc: any, curr: any) => ({
                            calls: acc.calls + (curr.calls || 0),
                            sales: acc.sales + (curr.sales || 0),
                            salesVolume: acc.salesVolume + (curr.salesVolume || 0),
                        }), { calls: 0, sales: 0, salesVolume: 0 });

                        // Goal is 80 * number of active users (users with data today)
                        // Or just a fixed per-person metric? Let's use count * 80 for now.
                        team.goal = Object.keys(pStats).length * 80;

                        setTeamStats(team);

                        // Extract My Stats for the Action Center
                        if (session?.user?.email) {
                            const myEmail = session.user.email;
                            const myData = pStats[myEmail];
                            if (myData) {
                                setMyStats({
                                    calls: myData.calls || 0,
                                    sales: myData.sales || 0,
                                    salesVolume: myData.salesVolume || 0
                                });
                            }
                        }
                    }
                    if (json.stats.pool) setNewLeadCount(json.stats.pool.waiting_new || 0);
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
        <div className="flex flex-col h-full relative bg-gray-50/50 min-h-screen">

            {/* 1. TOP TICKER REMOVED */}

            <div className="max-w-[1920px] mx-auto px-4 w-full space-y-6 pb-12 mt-6">

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

                {/* Error Alert */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                        {error}
                    </div>
                )}

                {/* 2. ACTION CENTER (Sticky Topish) */}
                <div className="sticky top-2 z-40 bg-gray-50/95 backdrop-blur-sm -mx-4 px-4 pt-2 -mt-2 pb-2 transition-all">
                    <ActionCenter
                        onPullLead={pullLead}
                        loading={loading}
                        myStats={myStats}
                        teamStats={teamStats}
                        newLeadCount={newLeadCount}
                        mode={isAdmin ? 'admin' : 'personal'}
                    />
                </div>

                {/* 2.5 DASHBOARD HIGHLIGHTS (New) */}
                <div className="animate-in fade-in duration-500 delay-150">
                    <DashboardHighlights
                        onSelectCustomer={(c) => setActiveLead(c)}
                        lastUpdated={lastUpdated}
                    />
                </div>

                {/* 3. MAIN STAGE */}
                <div className="animate-in fade-in duration-500">

                    {/* CONDITION A: Active Customer (Full Screen Mode) */}
                    {activeLead ? (
                        <div className="relative">
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
                            {/* Full Width Card */}
                            <div className="bg-white rounded-[2rem] shadow-2xl shadow-indigo-100 ring-1 ring-black/5 overflow-hidden">
                                <CustomerCard
                                    initialData={activeLead}
                                    onSave={() => {
                                        setActiveLead(null);
                                        fetchPerformance(); // Update stats manually after save
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        /* CONDITION B: Idle Mode (Team Grid) */
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100 text-indigo-600">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Ekip Performans Karnesi</h2>
                                        <p className="text-xs font-medium text-gray-500">
                                            Son Güncelleme: {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleManualRefresh}
                                    variant="outline"
                                    size="sm"
                                    className="bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 flex items-center gap-2"
                                    disabled={loading}
                                >
                                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    {loading ? 'Güncelleniyor...' : 'Verileri Yenile'}
                                </Button>
                            </div>

                            {performanceStats ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {Object.entries(performanceStats)
                                        .sort((a: any, b: any) => b[1].calls - a[1].calls) // Sort by Calls
                                        .map(([user, pStats]: any, idx) => (
                                            <div key={user} className="w-full">
                                                {/* Mobile: Card View */}
                                                <div className="block md:hidden">
                                                    <UserPerformanceCard user={user} stats={pStats} variant="default" rank={idx + 1} />
                                                </div>
                                                {/* Desktop: Wide Row View */}
                                                <div className="hidden md:block">
                                                    <UserPerformanceCard user={user} stats={pStats} variant="wide" rank={idx + 1} />
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-gray-200">
                                    <Loader2 className="w-8 h-8 text-indigo-200 animate-spin mb-4" />
                                    <p className="text-gray-400 font-medium">Veriler yükleniyor...</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
