// Delivered Customers List Component - Updated 2026-02-07
interface DeliveredLead {
    id: string;
    name: string;
    work: string;
    items: string;
    revenue: number;
    date: string;
}

interface DeliveredCustomerListProps {
    data: DeliveredLead[];
}

export function DeliveredCustomerList({ data }: DeliveredCustomerListProps) {
    const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);

    if (!data || data.length === 0) {
        return (
            <div className="mt-8">
                <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                    <span className="bg-indigo-600 text-white rounded-lg p-1">🛍️</span>
                    TESLİM EDİLEN MÜŞTERİLER
                </h3>
                <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">
                    Bu tarih aralığında teslim edilen müşteri bulunamadı.
                </div>
            </div>
        );
    }

    return (
        <div className="mt-8">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <span className="bg-indigo-600 text-white rounded-lg p-1">🛍️</span>
                TESLİM EDİLEN MÜŞTERİLER ({data.length})
            </h3>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 text-gray-700 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4 w-[20%]">Müşteri Adı</th>
                                <th className="px-4 py-4 w-[15%]">Çalışma Şekli</th>
                                <th className="px-4 py-4 w-[35%]">Teslim Edilen Ürünler</th>
                                <th className="px-6 py-4 text-right w-[15%]">Tutar</th>
                                <th className="px-4 py-4 text-center w-[15%]">Tarih</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((lead, idx) => (
                                <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-gray-900">
                                        {lead.name}
                                    </td>
                                    <td className="px-4 py-4 text-gray-700">
                                        {lead.work || '-'}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="text-gray-800 font-medium line-clamp-2" title={lead.items}>
                                            {lead.items || '-'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-black text-emerald-600 text-base">
                                            {formatCurrency(lead.revenue)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center text-gray-500 text-xs">
                                        {new Date(lead.date).toLocaleDateString('tr-TR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
