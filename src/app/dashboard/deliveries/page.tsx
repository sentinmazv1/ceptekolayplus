'use client';

import { useState, useEffect } from 'react';
import { PackageCheck, Calendar } from 'lucide-react';
import { DeliveredCustomerList } from '@/components/reports/DeliveredCustomerList';
import { Button } from '@/components/ui/Button';

export default function DeliveriesPage() {
    // Default to Current Month
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    });
    const [endDate, setEndDate] = useState(() => {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    });

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchData = () => {
        setLoading(true);
        fetch(`/api/deliveries?startDate=${startDate}&endDate=${endDate}&t=${Date.now()}`)
            .then(res => res.json())
            .then(json => {
                if (json.success) setData(json.data);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    const totalRevenue = data.reduce((acc, curr) => acc + (curr.revenue || 0), 0);

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 pb-24 font-sans">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <span className="bg-emerald-600 text-white p-2 rounded-xl"><PackageCheck className="w-6 h-6" /></span>
                        Teslimat Raporları
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">
                        Sistem kayıtlarına göre teslim edilen tüm müşteriler
                    </p>
                </div>

                {/* Date Filter */}
                <div className="bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
                    <div className="relative">
                        <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="pl-9 pr-3 py-2 text-sm font-bold text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer"
                        />
                    </div>
                    <span className="text-gray-300 font-bold">-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="pl-3 pr-3 py-2 text-sm font-bold text-gray-700 bg-transparent border-none focus:ring-0 cursor-pointer"
                    />
                    <Button onClick={fetchData} variant="secondary" size="sm" className="ml-2 font-bold">
                        Yenile
                    </Button>
                </div>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-200 mb-8 max-w-lg">
                <div className="flex justify-between items-center mb-4 opacity-90">
                    <h3 className="font-bold text-emerald-100 uppercase tracking-widest text-xs">Toplam Ciro ({startDate} - {endDate})</h3>
                    <PackageCheck className="w-5 h-5 text-emerald-100" />
                </div>
                <div className="text-4xl font-black mb-1">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(totalRevenue)}
                </div>
                <div className="flex gap-2 text-sm font-medium text-emerald-100">
                    <span className="bg-white/20 px-2 py-1 rounded-lg text-white">{data.length} Teslimat</span>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-48 bg-gray-200 rounded-2xl"></div>)}
                </div>
            ) : (
                <DeliveredCustomerList data={data} />
            )}

        </div>
    );
}
