
import { Printer, X, FileText, TrendingUp } from 'lucide-react';
import { InventoryItem } from '@/lib/types';

interface StockReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: InventoryItem[];
}

export function StockReportModal({ isOpen, onClose, items }: StockReportModalProps) {
    if (!isOpen) return null;

    const stockItems = items.filter(i => i.durum === 'STOKTA');
    const totalCount = stockItems.length;

    // Group items by Brand -> Models
    const groupedData = stockItems.reduce((acc, curr) => {
        const brand = curr.marka || 'Diğer';
        if (!acc[brand]) acc[brand] = [];

        const modelName = curr.model || 'Bilinmiyor';
        const existing = acc[brand].find(m => m.name === modelName);
        if (existing) {
            existing.count++;
        } else {
            acc[brand].push({ name: modelName, count: 1 });
        }
        return acc;
    }, {} as Record<string, { name: string, count: number }[]>);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:block print:bg-white animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-white/10 print:w-full print:h-auto print:max-w-none print:max-h-none print:rounded-none print:shadow-none print:ring-0">
                {/* Header */}
                <div className="bg-purple-600 px-6 py-4 flex justify-between items-center print:hidden">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-200" />
                        Stok Özeti Raporu
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                            <Printer className="w-4 h-4" />
                            Yazdır (A4)
                        </button>
                        <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Print Only Header */}
                <div className="hidden print:block p-8 pb-4 border-b-2 border-black">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-black text-black">STOK DURUM ÖZETİ</h1>
                            <p className="text-gray-600 mt-1">Bu rapor, stoktaki tüm cihazların marka ve model bazında toplu dökümünü içerir.</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold">{new Date().toLocaleDateString('tr-TR')}</div>
                            <div className="text-sm text-gray-500">Rapor Tarihi</div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 print:overflow-visible print:p-8">
                    <div className="print:columns-2 md:columns-2 lg:columns-3 gap-8 space-y-4">
                        {Object.entries(groupedData)
                            .sort((a, b) => a[0].localeCompare(b[0])) // Sort by Brand A-Z
                            .map(([brand, models]) => (
                                <div key={brand} className="break-inside-avoid mb-6 border border-gray-200 rounded-lg overflow-hidden print:border-black print:mb-8">
                                    <div className="bg-gray-100 px-4 py-2 font-bold text-gray-900 border-b border-gray-200 flex justify-between items-center print:bg-gray-200 print:text-black print:border-black">
                                        <span>{brand}</span>
                                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full print:border print:border-black print:text-black">
                                            {models.reduce((sum, m) => sum + m.count, 0)}
                                        </span>
                                    </div>
                                    <div className="divide-y divide-gray-100 print:divide-gray-300">
                                        {models.sort((a, b) => b.count - a.count).map((model) => (
                                            <div key={model.name} className="px-4 py-2 flex justify-between items-center text-sm print:text-xs">
                                                <span className="text-gray-700 font-medium print:text-black">{model.name}</span>
                                                <span className="font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded print:bg-transparent print:text-black">{model.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                    </div>

                    {/* Total Summary Footer */}
                    <div className="mt-8 border-t-2 border-gray-200 pt-4 flex justify-between items-center print:border-black print:mt-12">
                        <div className="text-gray-500 text-sm print:text-black">
                            CepteKolay Plus Stok Yönetim Sistemi tarafından oluşturulmuştur.
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase font-bold tracking-wider print:text-black">Toplam Stok Adedi</div>
                            <div className="text-3xl font-black text-indigo-600 print:text-black">
                                {totalCount}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
