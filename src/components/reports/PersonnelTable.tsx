
interface PersonnelStats {
    name: string;
    calls: number;
    sms: number;
    whatsapp: number;
    applications: number;
    attorneyQuery: number;
    attorneyClean: number;
    attorneyRisky: number;
    approvedCount: number;
    approvedLimit: number;
    deliveredCount: number;
    deliveredRevenue: number;
}

interface PersonnelTableProps {
    data: PersonnelStats[];
    loading: boolean;
}

export function PersonnelTable({ data, loading }: PersonnelTableProps) {
    const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center animate-pulse">
                <div className="h-8 bg-gray-100 rounded mb-4"></div>
                <div className="space-y-2">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-gray-50 rounded"></div>)}
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">
                Bu tarih aralığında veri bulunamadı.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Personel</th>
                            <th className="px-4 py-4 text-center">Arama</th>
                            <th className="px-4 py-4 text-center">SMS</th>
                            <th className="px-4 py-4 text-center">WP</th>
                            <th className="px-4 py-4 text-center border-l">Başvuru</th>
                            <th className="px-4 py-4 text-center border-l bg-emerald-50/30 text-emerald-600">Temiz</th>
                            <th className="px-4 py-4 text-center bg-red-50/30 text-red-600">Riskli</th>
                            <th className="px-6 py-4 text-right border-l bg-blue-50/30 text-blue-700">Onaylı (Limit)</th>
                            <th className="px-6 py-4 text-right border-l bg-indigo-50/30 text-indigo-700">Teslim (Ciro)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4 font-bold text-gray-900">{row.name}</td>
                                <td className="px-4 py-4 text-center tabular-nums font-medium text-gray-600">{row.calls}</td>
                                <td className="px-4 py-4 text-center tabular-nums text-gray-400">{row.sms}</td>
                                <td className="px-4 py-4 text-center tabular-nums text-gray-400">{row.whatsapp}</td>

                                <td className="px-4 py-4 text-center tabular-nums font-bold text-gray-800 border-l">{row.applications}</td>

                                <td className="px-4 py-4 text-center tabular-nums font-medium text-emerald-600 border-l bg-emerald-50/10">{row.attorneyClean}</td>
                                <td className="px-4 py-4 text-center tabular-nums font-medium text-red-600 bg-red-50/10">{row.attorneyRisky}</td>

                                <td className="px-6 py-4 text-right border-l bg-blue-50/10">
                                    <div className="font-bold text-blue-900">{row.approvedCount}</div>
                                    <div className="text-xs text-blue-400">{formatCurrency(row.approvedLimit)}</div>
                                </td>

                                <td className="px-6 py-4 text-right border-l bg-indigo-50/10 group-hover:bg-indigo-50/20 transition-colors">
                                    <div className="font-black text-indigo-900 text-lg">{row.deliveredCount}</div>
                                    <div className="text-xs font-bold text-indigo-500">{formatCurrency(row.deliveredRevenue)}</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
