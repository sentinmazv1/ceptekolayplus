'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Phone, Loader2, Command } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ActionCenterProps {
    onPullLead: () => void;
    loading: boolean;
}

export function ActionCenter({ onPullLead, loading }: ActionCenterProps) {
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
                            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm">
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <Phone className="w-6 h-6 animate-pulse" />
                                )}
                            </div>
                            <div className="text-left">
                                <div className="text-[10px] uppercase font-bold text-indigo-100 tracking-wider">Otomatik Atama</div>
                                <div className="text-xl font-black tracking-tight">Aramayı Başlat</div>
                            </div>
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

                {/* 3. Mini Personal Stats (Optional / Future expansion) */}
                <div className="hidden xl:flex items-center gap-4 border-l border-gray-100 pl-8">
                    <div className="text-right">
                        <div className="text-xs font-bold text-gray-400">GÜNLÜK HEDEF</div>
                        <div className="text-sm font-black text-gray-900">12 / 80 Arama</div>
                    </div>
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-500 flex items-center justify-center text-[10px] font-bold text-indigo-700 bg-white shadow-sm">
                        %15
                    </div>
                </div>

            </div>
        </div>
    );
}
