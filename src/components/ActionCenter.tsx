'use client';

import { useRouter } from 'next/navigation';
import { Search, Phone, Loader2, Command, PlusCircle, Users, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useEffect, useState } from 'react';

interface ActionCenterProps {
    onPullLead: () => void;
    loading: boolean;
    myStats?: { calls: number; sales: number; salesVolume: number };
    teamStats?: { calls: number; sales: number; salesVolume: number; goal: number };
    newLeadCount?: number;
    mode?: 'personal' | 'admin';
}

export function ActionCenter({ onPullLead, loading, myStats, teamStats, newLeadCount = 0, mode = 'personal' }: ActionCenterProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [requestCount, setRequestCount] = useState(0);

    useEffect(() => {
        // Fetch Request Counts
        fetch('/api/leads/stats?type=requests').then(res => res.json()).then(data => {
            if (data.total) setRequestCount(data.total);
        }).catch(() => { });
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim().length > 1) {
            router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <div className="bg-white rounded-[1.5rem] p-4 md:p-6 shadow-sm border border-gray-200/60 mb-8 relative overflow-hidden group">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-50/50 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:gap-8 md:justify-between">

                {/* 1. Primary Actions Group */}
                <div className="flex-shrink-0 w-full md:w-auto grid grid-cols-2 md:flex md:items-center gap-2 md:gap-3">
                    {/* A) CALL BUTTON */}
                    <Button
                        onClick={onPullLead}
                        disabled={loading}
                        className="relative col-span-2 md:col-span-1 h-16 md:h-16 pl-4 md:pl-6 pr-4 md:pr-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 transition-all duration-300 hover:-translate-y-1 active:scale-95 group/btn overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-1000"></div>
                        <div className="flex items-center justify-center md:justify-start gap-3">
                            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm relative">
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Phone className="w-5 h-5 animate-pulse" />
                                )}
                            </div>
                            <div className="text-left">
                                <div className="text-[9px] uppercase font-bold text-indigo-100 tracking-wider flex items-center gap-2">
                                    Otomatik
                                    {newLeadCount > 0 && (
                                        <span className="bg-white text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px] font-black flex items-center gap-0.5 shadow-sm">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                            {newLeadCount}
                                        </span>
                                    )}
                                </div>
                                <div className="text-lg font-black tracking-tight">Müşteri Çek</div>
                            </div>
                        </div>
                    </Button>

                    {/* B) ADD BUTTON */}
                    <Button
                        onClick={() => router.push('/dashboard/add')}
                        className="relative h-16 md:w-20 md:h-16 bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 active:scale-95 group/add flex flex-col items-center justify-center gap-1"
                    >
                        <PlusCircle className="w-6 h-6 group-hover/add:rotate-90 transition-transform duration-300" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Ekle</span>
                    </Button>

                    {/* C) LIST BUTTON (Icon Only) */}
                    <Button
                        onClick={() => router.push('/dashboard/my-leads')}
                        className="relative h-16 md:w-20 md:h-16 bg-white hover:bg-gray-50 text-indigo-600 border border-indigo-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 active:scale-95 group/list flex flex-col items-center justify-center gap-1"
                    >
                        <Users className="w-6 h-6 group-hover/list:scale-110 transition-transform duration-300" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Liste</span>
                    </Button>

                    {/* D) REQUESTS BUTTON (Talepler) - Conditionally Heroic */}
                    {requestCount > 0 ? (
                        <Button
                            onClick={() => router.push('/dashboard/requests')}
                            className="relative col-span-2 md:col-span-1 h-16 md:h-16 pl-3 pr-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-xl shadow-emerald-200 hover:shadow-2xl hover:shadow-emerald-300 transition-all duration-300 hover:-translate-y-1 active:scale-95 group/req overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/req:translate-x-[200%] transition-transform duration-1000"></div>
                            <div className="flex flex-row items-center justify-center gap-2">
                                <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm relative">
                                    <Inbox className="w-5 h-5 animate-bounce" />
                                </div>
                                <div className="text-left flex flex-col">
                                    <div className="text-[8px] uppercase font-bold text-emerald-100 tracking-wider flex items-center gap-1">
                                        Bekleyen
                                        <span className="bg-white text-emerald-600 px-1.5 py-0.5 rounded-full text-[9px] font-black flex items-center gap-0.5 shadow-sm">
                                            {requestCount}
                                        </span>
                                    </div>
                                    <div className="text-sm font-black tracking-tight">TALEPLER</div>
                                </div>
                            </div>
                        </Button>
                    ) : (
                        <Button
                            onClick={() => router.push('/dashboard/requests')}
                            className="relative h-16 md:w-20 md:h-16 bg-white hover:bg-gray-50 text-orange-600 border border-orange-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 active:scale-95 group/req flex flex-col items-center justify-center gap-1"
                        >
                            <Inbox className="w-6 h-6 group-hover/req:scale-110 transition-transform duration-300" />
                            <span className="text-[9px] font-bold uppercase tracking-wider">Talepler</span>
                        </Button>
                    )}
                </div>

                {/* 2. Global Search */}
                <div className="flex-1 w-full max-w-2xl">
                    <form onSubmit={handleSearch} className="relative group/search">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-10 group-hover/search:opacity-20 transition-opacity duration-300"></div>
                        <div className="relative flex items-center bg-gray-50/50 hover:bg-white border-2 border-transparent group-hover/search:border-indigo-100 rounded-2xl transition-all duration-300">
                            <div className="pl-5 text-gray-400">
                                <Search className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                className="w-full bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-400 text-base md:text-lg font-medium py-3 md:py-4 px-4"
                                placeholder="TC Kimlik, İsim veya Telefon ile hızlı ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className="pr-2">
                                <button
                                    type="submit"
                                    className="p-2.5 bg-white shadow-sm border border-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-95"
                                >
                                    <Command className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* 3. Stats Section (Admin Only) */}
                {mode === 'admin' && teamStats && (
                    <div className="hidden xl:flex items-center gap-6 border-l border-gray-100 pl-8 shrink-0">
                        {/* ADMIN: Team Calls */}
                        <div className="text-right group cursor-default">
                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">EKİP ARAMA</div>
                            <div className="flex items-baseline justify-end gap-1">
                                <div className="text-2xl font-black text-indigo-900 leading-none">{teamStats.calls}</div>
                                <span className="text-xs font-medium text-gray-400">/ {teamStats.goal}</span>
                            </div>
                            <div className="w-24 h-1 mt-2 bg-indigo-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min((teamStats.calls / (teamStats.goal || 1)) * 100, 100)}%` }}></div>
                            </div>
                        </div>

                        {/* ADMIN: Total Sales Count */}
                        <div className="text-right group cursor-default">
                            <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-0.5">TOPLAM SATIŞ</div>
                            <div className="flex items-baseline justify-end gap-1">
                                <div className="text-2xl font-black text-amber-600 leading-none">{teamStats.sales}</div>
                                <span className="text-xs font-medium text-gray-400">ADT</span>
                            </div>
                            <div className="w-20 h-1 mt-2 bg-amber-100 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: '100%' }}></div>
                            </div>
                        </div>

                        {/* ADMIN: Total Revenue */}
                        <div className="text-right group cursor-default">
                            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">EKİP CİROSU</div>
                            <div className="flex items-baseline justify-end gap-1">
                                <div className="text-2xl font-black text-emerald-600 leading-none">
                                    {new Intl.NumberFormat('tr-TR', { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(teamStats.salesVolume || 0)}
                                </div>
                                <span className="text-xs font-bold text-emerald-400">₺</span>
                            </div>
                            <div className="w-24 h-1 mt-2 bg-emerald-100/50 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-100 rounded-full" style={{ width: '100%' }}></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
