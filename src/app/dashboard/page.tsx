'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { CustomerCard } from '@/components/CustomerCard';
import { MyLeadsList } from '@/components/MyLeadsList';
import { AdminApprovalPanel } from '@/components/AdminApprovalPanel';
import { DashboardStats } from '@/components/DashboardStats';
import { Customer } from '@/lib/types';
import { Loader2, LogOut, RefreshCcw } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function Dashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeLead, setActiveLead] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'pull' | 'my-leads' | 'admin'>('pull');

    const [stats, setStats] = useState<{ available: number, waiting_new: number, waiting_scheduled: number, waiting_retry: number } | null>(null);

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

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg font-bold text-gray-900">Satış Paneli</h1>
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                            {session?.user?.email}
                        </span>
                    </div>

                    <Button variant="secondary" onClick={() => signOut()} className="text-sm">
                        <LogOut className="w-4 h-4 mr-2" />
                        Çıkış
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

                {/* VISUAL & STATS SUMMARY */}
                {activeTab === 'pull' && <DashboardStats />}

                {/* Tab Navigation */}
                <div className="mb-6 border-b border-gray-200">
                    <nav className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('pull')}
                            className={`pb-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'pull'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Yeni Müşteri Çek
                        </button>
                        <button
                            onClick={() => setActiveTab('my-leads')}
                            className={`pb-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'my-leads'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Benim Müşterilerim
                        </button>
                        {session?.user?.role === 'ADMIN' && (
                            <>
                                <button
                                    onClick={() => setActiveTab('admin')}
                                    className={`pb-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'admin'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Onay Paneli
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard/reports')}
                                    className="pb-2 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-indigo-600"
                                >
                                    📊 Raporlar
                                </button>
                                <button
                                    onClick={() => router.push('/dashboard/search')}
                                    className="pb-2 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-indigo-600"
                                >
                                    🔍 Müşteri Sorgula
                                </button>
                            </>
                        )}
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'pull' && (
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
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
                            <div className="w-full">
                                <div className="mb-4 flex items-center justify-between">
                                    <Button variant="outline" onClick={() => setActiveLead(null)}>
                                        ← Listeye Dön
                                    </Button>
                                    <span className="text-sm text-gray-500">
                                        Aktif Müşteri: <strong>{activeLead.ad_soyad}</strong>
                                    </span>
                                </div>
                                <CustomerCard
                                    initialData={activeLead}
                                    onSave={(updated) => setActiveLead(updated)}
                                />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'my-leads' && session?.user?.email && (
                    <MyLeadsList
                        userEmail={session.user.email}
                        onSelectLead={(lead) => {
                            setActiveLead(lead);
                            setActiveTab('pull'); // Switch to pull tab to show the card
                        }}
                    />
                )}

                {activeTab === 'admin' && session?.user?.role === 'ADMIN' && (
                    <AdminApprovalPanel />
                )}

            </main>
        </div>
    );
}
