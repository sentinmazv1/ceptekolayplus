
interface DeliveredLead {
    id: string;
    name: string;
    dob?: string; // Added
    phone: string;
    tc: string;
    work: string;
    workPlace: string;
    limit: string;
    seller: string;
    items: string;
    revenue: number;
    date: string;
}

interface DeliveredCustomerListProps {
    data: DeliveredLead[];
}

export function DeliveredCustomerList({ data }: DeliveredCustomerListProps) {
    if (!data || data.length === 0) return null;

    return (
        <div className="mt-8">
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <span className="bg-indigo-600 text-white rounded-lg p-1">🛍️</span>
                TESLİM EDİLEN MÜŞTERİLER VE ÜRÜNLER
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.map((lead, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between">
                        <div>
                            {/* Header */}
                            <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
                                <div>
                                    <h4 className="font-bold text-gray-900 text-lg">{lead.name}</h4>
                                    <p className="text-xs text-gray-400 font-mono mt-0.5">{lead.tc} | {lead.phone}</p>
                                    {lead.dob && (
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            Doğum T: <span className="font-semibold text-gray-600">{new Date(lead.dob).toLocaleDateString('tr-TR')}</span>
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full uppercase">Satıcı</span>
                                    <div className="text-xs font-bold text-indigo-600 mt-1">{lead.seller}</div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Meslek</span>
                                        <span className="text-gray-900 font-semibold">{lead.work}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-gray-400 uppercase font-bold block">İş Yeri</span>
                                        <span className="text-gray-900 font-semibold truncate" title={lead.workPlace}>{lead.workPlace}</span>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Teslim Edilen Ürünler</span>
                                    <p className="text-sm font-bold text-gray-800 leading-snug">{lead.items}</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-end pt-4 mt-2 border-t border-gray-50">
                            <div className="text-xs text-gray-400 font-medium">
                                {new Date(lead.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            <div className="text-xl font-black text-emerald-600">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(lead.revenue)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
