'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Phone, Loader2, Command } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ActionCenterProps {
    onPullLead: () => void;
    loading: boolean;
    myStats?: { calls: number; sales: number; salesVolume: number };
    newLeadCount?: number;
}

export function ActionCenter({ onPullLead, loading, myStats, newLeadCount = 0 }: ActionCenterProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim().length > 1) {
            router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-gray-200/60 mb-8 relative overflow-hidden group">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-50/50 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-between">

                {/* 1. Primary Action: CALL BUTTON */}
                <div className="flex-shrink-0">
                    <Button
                        onClick={onPullLead}
                        disabled={loading}
                        className="relative h-16 pl-8 pr-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 transition-all duration-300 hover:-translate-y-1 active:scale-95 group/btn overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-1000"></div>
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm relative">
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <Phone className="w-6 h-6 animate-pulse" />
                                )}
                            </div>
                            <div className="text-left">
                                <div className="text-[10px] uppercase font-bold text-indigo-100 tracking-wider flex items-center gap-2">
                                    Otomatik Atama
                                    {newLeadCount > 0 && (
                                        <span className="bg-white text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px] font-black flex items-center gap-0.5 shadow-sm">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                            {newLeadCount}
                                        </span>
                                    )}
                                </div>
                                <div className="text-xl font-black tracking-tight">Müşteri Çek</div>
                            </div>
                    </Button>
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
                                className="w-full bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-400 text-lg font-medium py-4 px-4"
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

                {/* 3. Mini Personal Stats */}
                <div className="hidden xl:flex items-center gap-6 border-l border-gray-100 pl-8 shrink-0">
                    {/* My Calls */}
                    <div className="text-right group cursor-default">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">GÜNLÜK ARAMA</div>
                        <div className="flex items-baseline justify-end gap-1">
                            <div className="text-2xl font-black text-gray-900 leading-none">{myStats?.calls || 0}</div>
                            <span className="text-xs font-medium text-gray-400">/ 80</span>
                        </div>
                        <div className="w-24 h-1 mt-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(((myStats?.calls || 0) / 80) * 100, 100)}%` }}></div>
                        </div>
                    </div>

                    {/* My Sales */}
                    <div className="text-right group cursor-default">
                        <div className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-wider mb-0.5">SATIŞ CIROSU</div>
                        <div className="flex items-baseline justify-end gap-1">
                            <div className="text-2xl font-black text-emerald-600 leading-none">
                                {new Intl.NumberFormat('tr-TR', { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(myStats?.salesVolume || 0)}
                            </div>
                            <span className="text-xs font-bold text-emerald-400">₺</span>
                        </div>
                        <div className="w-24 h-1 mt-2 bg-emerald-100/50 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }}></div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
