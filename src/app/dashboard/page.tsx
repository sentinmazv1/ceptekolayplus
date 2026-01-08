'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import ActivityFeed from '@/components/ActivityFeed';
import { CustomerCard } from '@/components/CustomerCard';
import { DashboardStats } from '@/components/DashboardStats';
import { Customer } from '@/lib/types';
import { Loader2, LogOut, RefreshCcw } from 'lucide-react';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeLead, setActiveLead] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Removed activeTab state

    const [stats, setStats] = useState<{ available: number, waiting_new: number, waiting_scheduled: number, waiting_retry: number, total_scheduled?: number } | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
        if (status === 'authenticated') {
            fetchStats();
            // Optional: Poll every 30s
            const interval = setInterval(fetchStats, 30000);
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
        <div className="flex flex-col h-full relative">
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

            {/* Main Content Area - Pull Lead Focus & Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start py-8">
                {/* Left: Action Area (3 Cols) */}
                <div className="lg:col-span-3 flex flex-col items-center justify-center w-full">
                    {!activeLead ? (
                        <div className="text-center space-y-4 w-full max-w-md mx-auto">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Yeni Görüşme Başlat</h3>
                                {stats && (
                                    <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                                        <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 flex flex-col items-center">
                                            <span className="font-bold text-lg leading-none">{stats.waiting_new}</span>
                                            <span className="opacity-80">Yeni</span>
                                        </div>
                                        <div className="p-2 bg-purple-50 text-purple-700 rounded-lg border border-purple-100 flex flex-col items-center">
                                            <span className="font-bold text-lg leading-none">{stats.waiting_scheduled}</span>
                                            <span className="opacity-80">Randevu</span>
                                        </div>
                                        <div className="p-2 bg-orange-50 text-orange-700 rounded-lg border border-orange-100 flex flex-col items-center">
                                            <span className="font-bold text-lg leading-none">{stats.waiting_retry}</span>
                                            <span className="opacity-80">Tekrar</span>
                                        </div>
                                    </div>
                                )}
                                <p className="text-gray-500 text-sm mb-4">
                                    Havuzdan sıradaki en uygun müşteriyi çeker.<br />
                                    <span className="text-xs text-gray-400">(Önce Randevulu, sonra Yeni, sonra Tekrar)</span>
                                </p>
                                <Button size="lg" onClick={pullLead} isLoading={loading} className="w-full md:w-64 h-12 text-lg">
                                    <RefreshCcw className="w-5 h-5 mr-2" />
                                    Yeni Müşteri Çek
                                </Button>
                                {error && (
                                    <p className="mt-3 text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>
                                )}
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
