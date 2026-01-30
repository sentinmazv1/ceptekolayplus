
import { Package } from 'lucide-react';

export function StockView({ data, loading }: { data: any, loading: boolean }) {
    if (loading) return <div className="animate-pulse h-96 bg-white/5 rounded-3xl"></div>;

    const inv = data?.inventory || {};
    const topModels = inv.topModels || [];

    const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-6 flex items-center gap-4">
                    <div className="p-4 bg-indigo-500/20 rounded-2xl text-indigo-400">
                        <Package className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="text-slate-400 text-sm">Toplam Stok Adedi</div>
                        <div className="text-3xl font-black text-white">{inv.total} <span className="text-lg font-normal text-slate-500">Cihaz</span></div>
                    </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 flex items-center gap-4">
                    <div className="p-4 bg-emerald-500/20 rounded-2xl text-emerald-400">
                        <span className="text-xl font-bold">₺</span>
                    </div>
                    <div>
                        <div className="text-slate-400 text-sm">Toplam Stok Değeri</div>
                        <div className="text-3xl font-black text-white">{formatCurrency(inv.value)}</div>
                    </div>
                </div>
            </div>

            {/* Top Models */}
            <div className="bg-[#1e293b]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                <h3 className="text-white font-bold text-lg mb-6">En Çok Bulunan Modeller</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {topModels.map((item: any, i: number) => (
                        <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl hover:bg-white/10 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-indigo-400">#{i + 1}</span>
                                <span className="bg-slate-800 text-white text-xs px-2 py-0.5 rounded">{item.count} Adet</span>
                            </div>
                            <div className="text-sm font-bold text-white truncate" title={item.name}>{item.name}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
