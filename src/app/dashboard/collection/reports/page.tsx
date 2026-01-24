'use client';

import { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, Building2, PhoneOff, CheckCircle, BarChart3, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function CollectionReportsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [cityStats, setCityStats] = useState<any[]>([]);
    const [dailyStats, setDailyStats] = useState<any[]>([]);
    const [paymentsStats, setPaymentsStats] = useState<any[]>([]);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    useEffect(() => {
        // Default: Last 30 Days
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        setDateRange({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        });
        fetchData(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
    }, []);

    const fetchData = async (start: string, end: string) => {
        setLoading(true);
        try {
            // Fetch both in parallel
            // We need a new API route for this: /api/collection/reports
            const res = await fetch(`/api/collection/reports?start=${start}&end=${end}`);
            const json = await res.json();

            if (json.success) {
                setCityStats(json.cityStats || []);
                setDailyStats(json.dailyStats || []);
                setPaymentsStats(json.paymentsStats || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (e: any) => {
        const { name, value } = e.target;
        const newRange = { ...dateRange, [name]: value };
        setDateRange(newRange);
        fetchData(newRange.start, newRange.end);
    };

    // Calculate aggregated metrics
    const totalFiles = cityStats.reduce((acc, curr) => acc + (parseInt(curr.total_files) || 0), 0);
    const totalPromises = cityStats.reduce((acc, curr) => acc + (parseInt(curr.promise_count) || 0), 0);
    const totalUnreachable = cityStats.reduce((acc, curr) => acc + (parseInt(curr.unreachable_count) || 0), 0);

    // Sort cities by "Unreachable" for the "Must Focus" list
    const troubleCities = [...cityStats].sort((a, b) => b.unreachable_count - a.unreachable_count).slice(0, 5);

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

    if (loading && cityStats.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 pb-20">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 mb-2 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Geri Dön
                        </button>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gecikme Raporları</h1>
                        <p className="text-slate-500 font-medium">Şehir, Performans ve Tahsilat Analizi</p>
                    </div>

                    {/* Date Filter */}
                    <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                        <Calendar className="w-5 h-5 text-indigo-500 ml-2" />
                        <input
                            type="date"
                            name="start"
                            value={dateRange.start}
                            onChange={handleDateChange}
                            className="border-none focus:ring-0 text-sm font-bold text-slate-700 bg-transparent"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            name="end"
                            value={dateRange.end}
                            onChange={handleDateChange}
                            className="border-none focus:ring-0 text-sm font-bold text-slate-700 bg-transparent"
                        />
                    </div>
                </div>

                {/* Top KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600"><Building2 className="w-6 h-6" /></div>
                            <span className="text-3xl font-black text-slate-800">{totalFiles}</span>
                        </div>
                        <h3 className="mt-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Toplam Takip Dosyası</h3>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600"><CheckCircle className="w-6 h-6" /></div>
                            <span className="text-3xl font-black text-slate-800">{totalPromises}</span>
                        </div>
                        <h3 className="mt-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Aktif Ödeme Sözü</h3>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="p-3 bg-red-100 rounded-xl text-red-600"><PhoneOff className="w-6 h-6" /></div>
                            <span className="text-3xl font-black text-slate-800">{totalUnreachable}</span>
                        </div>
                        <h3 className="mt-4 font-bold text-slate-500 uppercase text-xs tracking-wider">Ulaşılamayan (Gecikme)</h3>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* 1. Daily Activity Chart */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-indigo-500" />
                            Günlük Arama Performansı
                        </h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[...dailyStats].reverse()}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="log_date" tick={{ fontSize: 12 }} />
                                    <YAxis />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                    <Bar name="Ulaşılan" dataKey="reached" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                                    <Bar name="Söz Alınan" dataKey="promises" stackId="a" fill="#3b82f6" />
                                    <Bar name="Ulaşılamayan" dataKey="unreachable" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 2. Top "Problem" Cities */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <PhoneOff className="w-5 h-5 text-red-500" />
                            En Çok Ulaşılamayan Şehirler (Top 5)
                        </h3>
                        <div className="space-y-4">
                            {troubleCities.map((city, idx) => (
                                <div key={city.city} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{city.city || 'Belirsiz'}</div>
                                            <div className="text-xs text-slate-500">{city.total_files} toplam dosya</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-red-600 text-lg">{city.unreachable_count}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase">Ulaşılamadı</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Detailed Table */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800">Şehir Bazlı Detaylı Rapor</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Şehir</th>
                                    <th className="px-6 py-4">Toplam Dosya</th>
                                    <th className="px-6 py-4 text-emerald-600">Ödeme Sözü</th>
                                    <th className="px-6 py-4 text-emerald-700">Söz Tutulan</th>
                                    <th className="px-6 py-4 text-red-500">Ulaşılamayan</th>
                                    <th className="px-6 py-4 text-amber-600">Tel Kapalı</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {cityStats.map((city) => (
                                    <tr key={city.city} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800">{city.city || '-'}</td>
                                        <td className="px-6 py-4 font-medium text-slate-600">{city.total_files}</td>
                                        <td className="px-6 py-4 font-bold text-emerald-600 bg-emerald-50/50">{city.promise_count}</td>
                                        <td className="px-6 py-4 font-bold text-emerald-700">{city.promise_kept_count}</td>
                                        <td className="px-6 py-4 font-bold text-red-500 bg-red-50/50">{city.unreachable_count}</td>
                                        <td className="px-6 py-4 font-medium text-amber-600">{city.phones_off_count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Payments Report Table */}
                <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 overflow-hidden">
                    <div className="p-6 border-b border-emerald-100 bg-emerald-50/30">
                        <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-600" /> Tahsilat Yapılanlar (Bu Dönem)
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-emerald-50 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Müşteri</th>
                                    <th className="px-6 py-4">Telefon</th>
                                    <th className="px-6 py-4">Durum</th>
                                    <th className="px-6 py-4">Tarih</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-emerald-50">
                                {paymentsStats && paymentsStats.length > 0 ? (
                                    paymentsStats.map((lead: any) => (
                                        <tr key={lead.id} className="hover:bg-emerald-50/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-800">{lead.ad_soyad}</td>
                                            <td className="px-6 py-4 text-slate-600 font-mono text-xs">{lead.telefon}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                                    {lead.tahsilat_durumu}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {new Date(lead.updated_at || new Date()).toLocaleDateString('tr-TR')}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-emerald-600/50 italic">
                                            Bu dönemde tahsilat kaydı bulunamadı.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
