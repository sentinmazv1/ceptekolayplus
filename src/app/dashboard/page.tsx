'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import ActivityFeed from '@/components/ActivityFeed';
import { CustomerCard } from '@/components/CustomerCard';
import { DashboardStats } from '@/components/DashboardStats';
import { Customer } from '@/lib/types';
import { Loader2, LogOut, RefreshCcw, Phone, Users } from 'lucide-react';
import { UserPerformanceCard } from '@/components/UserPerformanceCard';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeLead, setActiveLead] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Removed activeTab state
    const [performanceStats, setPerformanceStats] = useState<any>(null);

    const [stats, setStats] = useState<{ available: number, waiting_new: number, waiting_scheduled: number, waiting_retry: number, total_scheduled?: number } | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
        if (status === 'authenticated') {
            fetchStats();
            fetchPerformance(); // New Fetch
            // Optional: Poll every 30s
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
            // Fetch Today's Report
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
            // Show Source Notification
            if (json.lead.source) {
                // Simple Alert/Toast equivalent
                // We'll use a temporary state for visual feedback if we want, or just a console log
                // Per user request "popup", let's strictly imply a visible element.
                // We'll set a state for 'sourceNotification'
                setSourceNotification(json.lead.source);
                // Removed timeout to ensure user sees the popup and clicks OK
            }
            fetchStats(); // Update stats after pulling
            fetchPerformance(); // Update performance too (calls count increases)
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTestLead = async () => {
        // Hidden dev tool to seed data if needed or just manual instruction
        alert('Admin panelinden veri yükleyiniz veya Sheets\'e manuel ekleme yapınız.');
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    // Auth check is handled in layout.tsx, but keeping basic redirect for safety if needed
    // or we can remove it. Let's rely on layout protection to avoid double-rendering logic.

    const [sourceNotification, setSourceNotification] = useState<string | null>(null);

    return (
        <div className="flex flex-col h-full relative space-y-8">
            {/* Source Notification Toast */}
            {/* Source Notification Modal Popup */}
            {sourceNotification && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center animate-in fade-in duration-200">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setSourceNotification(null)}
                    />

                    {/* Popup Card */}
                    <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center transform scale-100 animate-in zoom-in-95 duration-200">
                        <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                            <span className="text-3xl">
                                {sourceNotification.includes('Yeni') ? '🆕' :
                                    sourceNotification.includes('Randevu') ? '📅' : '♻️'}
                            </span>
                        </div>

                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Müşteri Kaynağı</h3>
                        <p className="text-2xl font-bold text-gray-900 mb-6">{sourceNotification}</p>

                        <Button
                            className="w-full"
                            size="lg"
                            onClick={() => setSourceNotification(null)}
                        >
                            Tamam, Anlaşıldı
                        </Button>
                    </div>
                </div>
            )}

            {/* Performance Cards Section */}
            {performanceStats && (
                <div className="pt-4">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6 uppercase tracking-tight px-1">
                        <Users className="w-6 h-6 text-indigo-600" />
                        Günün Performans Liderleri
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {Object.entries(performanceStats)
                            .sort((a: any, b: any) => b[1].calls - a[1].calls)
                            .map(([user, pStats]: any) => (
                                <UserPerformanceCard key={user} user={user} stats={pStats} />
                            ))}
                    </div>
                </div>
            )}

            {/* Main Content Area - Pull Lead Focus & Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Left: Action Area (3 Cols) */}
                <div className="lg:col-span-3 flex flex-col items-center justify-center w-full">
                    {!activeLead ? (
                        <div className="text-center space-y-6 w-full max-w-lg mx-auto transform transition-all hover:scale-[1.01]">
                            <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl border border-white/50 ring-1 ring-gray-100 relative overflow-hidden group">
                                {/* Decorative Gradient Blobs */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-100 rounded-full blur-2xl opacity-50 -ml-12 -mb-12 pointer-events-none"></div>

                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-200 mb-6 group-hover:rotate-3 transition-transform duration-300">
                                        <Phone className="w-8 h-8 text-white" />
                                    </div>

                                    <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Yeni Görüşme Başlat</h3>
                                    <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                                        Havuzdan en uygun müşteriyi otomatik olarak çeker ve arama ekranını açar.
                                    </p>

                                    {stats && (
                                        <div className="grid grid-cols-3 gap-3 mb-8">
                                            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 flex flex-col items-center">
                                                <span className="font-black text-2xl text-blue-600 leading-none mb-1">{stats.waiting_new}</span>
                                                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">YENİ</span>
                                            </div>
                                            <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100/50 flex flex-col items-center">
                                                <span className="font-black text-2xl text-purple-600 leading-none mb-1">{stats.waiting_scheduled}</span>
                                                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">RANDEVU</span>
                                            </div>
                                            <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-100/50 flex flex-col items-center">
                                                <span className="font-black text-2xl text-orange-600 leading-none mb-1">{stats.waiting_retry}</span>
                                                <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">TEKRAR</span>
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        size="lg"
                                        onClick={pullLead}
                                        isLoading={loading}
                                        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95 rounded-xl border-t border-indigo-400/20"
                                    >
                                        <RefreshCcw className="w-5 h-5 mr-3 animate-[spin_3s_linear_infinite]" />
                                        Müşteri Çek
                                    </Button>

                                    {error && (
                                        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center justify-center gap-2">
                                            <span className="font-bold">Hata:</span> {error}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full max-w-4xl">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Aktif Görüşme</h2>
                                <Button
                                    variant="outline"
                                    onClick={() => setActiveLead(null)}
                                    size="sm"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Görüşmeyi Sonlandır
                                </Button>
                            </div>
                            <CustomerCard
                                initialData={activeLead}
                                onSave={(updatedLead) => {
                                    setActiveLead(null);
                                    fetchStats();
                                    fetchPerformance();
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Right: Activity Feed (1 Col) */}
                <div className="lg:col-span-1 w-full h-[500px] sticky top-8">
                    <ActivityFeed />
                </div>
            </div>

            {/* VISUAL & STATS SUMMARY */}
            <DashboardStats />
        </div>
    );
}
