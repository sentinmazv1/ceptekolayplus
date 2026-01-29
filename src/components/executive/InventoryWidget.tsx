'use client';

import { Package, AlertCircle } from 'lucide-react';

interface InventoryProps {
    totalStock: number;
    topStock: { name: string; count: number }[];
    loading: boolean;
}

export function InventoryWidget({ totalStock, topStock, loading }: InventoryProps) {
    if (loading) return <div className="h-40 bg-white/5 rounded-3xl animate-pulse"></div>;

    return (
        <div className="bg-[#1e293b]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-white font-bold text-lg">Stok Durumu</h3>
                <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-500/30">
                    Toplam: {totalStock}
                </div>
            </div>

            <div className="space-y-3">
                {topStock.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-gray-500 gap-2">
                        <Package className="w-8 h-8 opacity-20" />
                        <span className="text-xs">Stok verisi yok</span>
                    </div>
                ) : (
                    topStock.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${item.count < 3 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                <span className="text-slate-300 truncate max-w-[150px]">{item.name}</span>
                            </div>
                            <span className="font-bold text-white">{item.count}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
