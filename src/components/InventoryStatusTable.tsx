
import { FileText, Printer } from 'lucide-react';
import { InventoryItem } from '@/lib/types';

interface InventoryStatusTableProps {
    items: InventoryItem[];
}

export function InventoryStatusTable({ items }: InventoryStatusTableProps) {
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
        <div className="bg-white rounded-[2rem] shadow-xl shadow-indigo-100 border border-indigo-50 relative overflow-hidden ring-1 ring-gray-100 mt-8 break-inside-avoid print:shadow-none print:border-0 print:ring-0 print:mt-4">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center print:px-0">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 rounded-2xl text-purple-600 print:hidden">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">STOK ÖZET TABLOSU</h2>
                        <p className="text-sm font-bold text-gray-500">Marka ve Model Bazlı Dağılım</p>
                    </div>
                </div>
                <div className="text-right print:block hidden md:block">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Toplam Stok</p>
                    <p className="text-2xl font-black text-purple-600 tabular-nums">{totalCount} <span className="text-sm text-gray-400">Adet</span></p>
                </div>
            </div>

            <div className="p-8 print:p-0">
                <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-4 print:columns-2">
                    {Object.entries(groupedData)
                        .sort((a, b) => a[0].localeCompare(b[0])) // Sort by Brand A-Z
                        .map(([brand, models]) => (
                            <div key={brand} className="break-inside-avoid mb-6 border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-gray-50/50 print:bg-white print:border-gray-300 print:shadow-none">
                                <div className="bg-white px-4 py-3 font-bold text-gray-900 border-b border-gray-100 flex justify-between items-center print:border-gray-200">
                                    <span className="text-lg">{brand}</span>
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-lg font-bold print:bg-gray-100 print:text-black print:border print:border-gray-300">
                                        {models.reduce((sum, m) => sum + m.count, 0)}
                                    </span>
                                </div>
                                <div className="divide-y divide-gray-100 print:divide-gray-200">
                                    {models.sort((a, b) => b.count - a.count).map((model) => (
                                        <div key={model.name} className="px-4 py-2 flex justify-between items-center text-sm hover:bg-white transition-colors">
                                            <span className="text-gray-600 font-medium print:text-black">{model.name}</span>
                                            <span className="font-bold text-gray-900 tabular-nums">{model.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
}
