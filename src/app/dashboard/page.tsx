'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
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

    return (
        <div className="flex flex-col h-full">
            {/* VISUAL & STATS SUMMARY */}
            <DashboardStats />

            {/* Main Content Area - Pull Lead Focus */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-center py-8">
                {!activeLead ? (
                    <div className="text-center space-y-4">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Yeni Görüşme Başlat</h3>
                            {stats && (
                                <div className="flex justify-center gap-4 mb-4 text-xs">
                                    <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100 flex flex-col items-center">
                                        <span className="font-bold text-lg leading-none">{stats.available}</span>
                                        <span className="opacity-80">Toplam Bekleyen</span>
                                    </div>
                                    <div className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-100 flex flex-col items-center">
                                        <span className="font-bold text-lg leading-none">{stats.total_scheduled || 0}</span>
                                        <span className="opacity-80">Randevulu</span>
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
                                // Once saved, we can either clear active lead or keep it
                                // Previous requirement was to return to dashboard
                                setActiveLead(null);
                                fetchStats();
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
