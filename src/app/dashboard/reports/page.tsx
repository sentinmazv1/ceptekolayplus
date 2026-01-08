'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, LabelList, Legend
} from 'recharts';
import {
    Loader2, ArrowLeft, Users, Phone, Printer,
    Package, CheckCircle, Share2, ClipboardList, TrendingUp, Clock, Activity, Download, PhoneForwarded
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReportStats {
    city: Record<string, {
        total: number;
        delivered: number;
        approved: number;
        rejected: number;
        cancelled: number;
        kefil: number;
        noEdevlet: number;
        unreachable: number;
        other: number;
    }>;
    profession: Record<string, { count: number, totalIncome: number, avgIncome: number }>;
    product: Record<string, number>;
    status: Record<string, number>;
    channel: Record<string, number>;
    rejection: Record<string, number>;
    daily: Record<string, number>;
    hourly: Record<string, Record<string, Record<number, number>>>; // Date -> User -> Hour -> Count
    funnel: {
        total: number;
        contacted: number;
        applications: number;
        sale: number;
    };
    kpi: {
        totalCalled: number;
        remainingToCall: number;
        retryPool: number;
        acquisitionRate: string;
        conversionRate: string;
    };
    todayCalled: number;
    todayCalledByPerson: Record<string, number>;
    performance: Record<string, { calls: number, approvals: number, paceMinutes: number, sms?: number, whatsapp?: number }>;
    totalCalled: number;
    remainingToCall: number;
    totalDelivered: number;
    totalApproved: number;
}

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'];

export default function ReportsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<ReportStats | null>(null);

    // Initialize with today's date in YYYY-MM-DD format (Turkey Time)
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const now = new Date();
        const trDateFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Istanbul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        return trDateFormatter.format(now);
    });

    useEffect(() => {
        setLoading(true);
        fetch(`/api/reports?date=${selectedDate}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) setStats(data.stats);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [selectedDate]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div>;
    if (!stats) return <div className="p-8 text-center text-gray-500">Veri yok.</div>;

    // --- Chart Data Prep ---

    // 1. Status Summary (Table data mostly)
    const statusEntries = Object.entries(stats.status || {})
        .sort((a, b) => b[1] - a[1]);
    const totalStatusCount = statusEntries.reduce((acc, curr) => acc + curr[1], 0);

    // 2. Channel Data
    const channelData = Object.entries(stats.channel || {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // 3. Profession Data (Top 10)
    const professionData = Object.entries(stats.profession || {})
        .filter(([name, d]) => d.count > 0 && name && name !== 'Diğer' && name !== 'Bilinmiyor' && name.trim() !== '')
        .map(([name, d]) => ({
            name,
            count: d.count,
            percent: totalStatusCount > 0 ? ((d.count / totalStatusCount) * 100).toFixed(1) : '0' // Avg based on total count approximation
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const productData = Object.entries(stats.product || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({
            name,
            value,
            percent: totalStatusCount > 0 ? ((value / totalStatusCount) * 100).toFixed(1) : '0'
        }));

    // 4. Hourly Data (Stacked)
    // Needs to process stats.hourly[selectedDate] -> { user1: {9: 5, 10: 2}, user2: {9: 3} }
    const relevantHourly = stats.hourly && stats.hourly[selectedDate] ? stats.hourly[selectedDate] : {};
    const relevantUsers = Object.keys(relevantHourly);

    // Create data for Recharts: [{ hour: '09:00', user1: 5, user2: 3 }, ...]
    // Focus hours 09:00 to 20:00 (or dynamic range)
    const hoursToCheck = Array.from({ length: 12 }, (_, i) => i + 9); // 9 to 20

    const hourlyData = hoursToCheck.map(h => {
        const row: any = { hour: `${String(h).padStart(2, '0')}:00` };
        let total = 0;
        relevantUsers.forEach(user => {
            const count = relevantHourly[user]?.[h] || 0;
            if (count > 0) {
                row[user.split('@')[0]] = count; // Short name
                total += count;
            }
        });
        row.total = total;
        return row;
    });

    // 5. Daily Trend
    const dailyData = Object.entries(stats.daily || {}).map(([date, count]) => ({ date, count }));

    // 6. Rejection Data
    const rejectionTotal = Object.values(stats.rejection || {}).reduce((a, b) => a + b, 0);
    const rejectionData = Object.entries(stats.rejection || {})
        .map(([name, value]) => ({
            name,
            value,
            percentStr: rejectionTotal > 0 ? `%${((value / rejectionTotal) * 100).toFixed(1)}` : '0%'
        }))
        .sort((a, b) => b.value - a.value);


    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-8 pb-20 print:bg-white print:p-0 font-sans">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 print:hidden">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => router.back()} className="hover:bg-gray-100">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Geri
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Yönetici Paneli</h1>
                        <p className="text-sm text-gray-500">Performans ve Operasyonel Metrikler</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => window.print()}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-bold shadow-sm"
                    >
                        <Printer className="w-4 h-4" />
                        Yazdır / PDF
                    </button>
                </div>
            </div>

            {/* PRINT HEADER */}
            <div className="hidden print:block mb-6 border-b-2 border-gray-800 pb-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900">YÖNETİCİ RAPORU</h1>
                        <p className="text-gray-600 mt-2 font-bold text-lg">CepteKolay+ Operasyon Analizi</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500 font-bold">RAPOR TARİHİ</p>
                        <p className="text-xl font-extrabold text-gray-900">{new Date().toLocaleDateString('tr-TR')}</p>
                    </div>
                </div>
            </div>

            {/* --- ROW 1: EXECUTIVE KPIs (New Logic) --- */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
                <KpiCard
                    label="TOPLAM BAŞVURU"
                    value={stats.funnel.total}
                    icon={Users}
                    color="blue"
                    desc="Tüm zamanlar"
                />
                <KpiCard
                    label="BUGÜNE KADAR ARANAN"
                    value={stats.kpi.totalCalled}
                    icon={Phone}
                    color="indigo"
                    desc="Yeni hariç tekil"
                />
                <KpiCard
                    label="BAŞVURU ORANI" // Acquisition Rate
                    value={`%${stats.kpi.acquisitionRate}`}
                    icon={TargetIcon}
                    color="cyan"
                    desc="Başvuru / Aranan"
                />
                <KpiCard
                    label="SATIŞ ORANI" // Conversion Rate
                    value={`%${stats.kpi.conversionRate}`}
                    icon={TrendingUp}
                    color="emerald"
                    desc="Teslim / Başvuru"
                />
                <KpiCard
                    label="KALAN (YENİ)"
                    value={stats.kpi.remainingToCall}
                    icon={ClipboardList}
                    color="amber"
                    desc="Henüz hiç aranmamış"
                />
                <KpiCard
                    label="TEKRAR ARANACAK"
                    value={stats.kpi.retryPool}
                    icon={PhoneForwarded}
                    color="purple"
                    desc="Ulaşılamadı/Havuz vb."
                />
            </div>

            {/* --- ROW 2: TEAM PERFORMANCE & HOURLY --- */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 break-inside-avoid">
                {/* Team Cards (Activity) */}
                <div className="xl:col-span-1 space-y-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-600" />
                        Ekip Performansı ({new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-4">
                        {Object.entries(stats.performance).map(([user, pStats]) => {
                            // Pace Color Logic: <10m Green, 10-20m Amber, >20m Red/Gray
                            const paceColor = pStats.paceMinutes > 0 && pStats.paceMinutes <= 12 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                                pStats.paceMinutes > 12 && pStats.paceMinutes <= 25 ? 'text-amber-700 bg-amber-50 border-amber-200' :
                                    'text-red-700 bg-red-50 border-red-200';

                            return (
                                <div key={user} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 print:border-gray-800 flex flex-col gap-3 hover:shadow-md transition-shadow">
                                    <div className="pb-2 border-b border-gray-100 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-gray-100 p-1.5 rounded-full">
                                                <Users className="w-4 h-4 text-gray-600" />
                                            </div>
                                            <div className="font-bold text-gray-900 truncate text-base" title={user}>{user.split('@')[0]}</div>
                                        </div>
                                        {/* Optional: Add a simple rank or badge here if needed */}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="text-center p-2 rounded-lg bg-indigo-50/50 border border-indigo-100">
                                            <span className="block text-2xl font-black text-indigo-600">{pStats.calls}</span>
                                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">ARAMA</span>
                                        </div>
                                        <div className="text-center p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                                            <span className="block text-2xl font-black text-emerald-600">{pStats.approvals}</span>
                                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">ONAY</span>
                                        </div>
                                        {/* Row 2: SMS & WA */}
                                        <div className="text-center p-2 rounded-lg bg-blue-50/50 border border-blue-100">
                                            <span className="block text-lg font-black text-blue-600">{pStats.sms || 0}</span>
                                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">SMS</span>
                                        </div>
                                        <div className="text-center p-2 rounded-lg bg-green-50/50 border border-green-100">
                                            <span className="block text-lg font-black text-green-600">{pStats.whatsapp || 0}</span>
                                            <span className="text-[10px] font-bold text-green-400 uppercase tracking-wide">WP</span>
                                        </div>
                                    </div>

                                    {pStats.paceMinutes > 0 ? (
                                        <div className={`flex flex-col gap-1 px-3 py-2 rounded-lg border ${paceColor}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-extrabold uppercase opacity-80">Arama Sıklığı</span>
                                                </div>
                                                <span className="text-sm font-black">{pStats.paceMinutes} dk</span>
                                            </div>
                                            <div className="text-[10px] font-medium opacity-90 text-right leading-tight">
                                                Her {pStats.paceMinutes} dakikada bir arama
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-gray-400 text-center py-2 italic bg-gray-50 rounded-lg">Henüz hız verisi oluşmadı</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Hourly Stacked Chart */}
                <ChartCard title="SAATLİK ÇALIŞMA YOĞUNLUĞU (KİŞİ BAZLI)" className="xl:col-span-2">
                    <div className="mb-4 flex items-center justify-between print:hidden">
                        <span className="text-xs text-gray-500 font-bold">Seçili Tarih:</span>
                        <input
                            type="date"
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="hour" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <RechartsTooltip
                                    cursor={{ fill: '#F3F4F6' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold' }} />
                                {relevantUsers.map((user, idx) => (
                                    <Bar
                                        key={user}
                                        dataKey={user.split('@')[0]}
                                        stackId="a"
                                        fill={COLORS[idx % COLORS.length]}
                                        radius={[0, 0, 0, 0]}
                                        barSize={30}
                                    >
                                        <LabelList dataKey={user.split('@')[0]} position="center" fill="white" fontSize={10} fontWeight="bold" formatter={(val: any) => val > 0 ? val : ''} />
                                    </Bar>
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* TOTAL SUMMARY CARD (Below Chart - Spanning 2 cols) */}
                <div className="xl:col-span-2 mt-[-1rem]">
                    {(() => {
                        const totals = Object.values(stats.performance).reduce((acc, curr) => ({
                            calls: acc.calls + curr.calls,
                            approvals: acc.approvals + curr.approvals,
                            sms: acc.sms + (curr.sms || 0),
                            whatsapp: acc.whatsapp + (curr.whatsapp || 0),
                            paceSum: acc.paceSum + (curr.paceMinutes || 0),
                            paceCount: acc.paceCount + (curr.paceMinutes > 0 ? 1 : 0)
                        }), { calls: 0, approvals: 0, sms: 0, whatsapp: 0, paceSum: 0, paceCount: 0 });

                        const avgPace = totals.paceCount > 0 ? Math.round(totals.paceSum / totals.paceCount) : 0;

                        return (
                            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col items-center justify-between gap-6 print:break-inside-avoid relative overflow-hidden">
                                {/* Decorative Background Elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                                <div className="flex items-center gap-4 w-full md:w-auto z-10">
                                    <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm border border-white/10">
                                        <Activity className="w-8 h-8 text-indigo-300" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-bold text-white tracking-tight leading-tight">TOPLAM PERFORMANS</h3>
                                        <p className="text-xs text-indigo-200 font-medium uppercase tracking-wide">Günlük Özet</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full z-10">
                                    <div className="flex flex-col items-center p-3 bg-white/5 rounded-lg border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                                        <Phone className="w-5 h-5 text-indigo-300 mb-1 opacity-70" />
                                        <span className="text-2xl font-black text-white">{totals.calls}</span>
                                        <span className="text-[9px] font-bold text-indigo-200 uppercase tracking-widest">Arama</span>
                                    </div>

                                    <div className="flex flex-col items-center p-3 bg-white/5 rounded-lg border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-300 mb-1 opacity-70" />
                                        <span className="text-2xl font-black text-white">{totals.approvals}</span>
                                        <span className="text-[9px] font-bold text-emerald-200 uppercase tracking-widest">Onay</span>
                                    </div>

                                    <div className="flex flex-col items-center p-3 bg-white/5 rounded-lg border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                                        <MessageSquare className="w-5 h-5 text-blue-300 mb-1 opacity-70" />
                                        <span className="text-2xl font-black text-white">{totals.sms}</span>
                                        <span className="text-[9px] font-bold text-blue-200 uppercase tracking-widest">SMS</span>
                                    </div>

                                    <div className="flex flex-col items-center p-3 bg-white/5 rounded-lg border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors">
                                        <MessageCircle className="w-5 h-5 text-green-300 mb-1 opacity-70" />
                                        <span className="text-2xl font-black text-white">{totals.whatsapp}</span>
                                        <span className="text-[9px] font-bold text-green-200 uppercase tracking-widest">WP</span>
                                    </div>

                                    <div className="flex flex-col items-center p-3 bg-white/5 rounded-lg border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors col-span-2 md:col-span-1">
                                        <Clock className="w-5 h-5 text-amber-300 mb-1 opacity-70" />
                                        <span className="text-2xl font-black text-white">{avgPace}<span className="text-sm font-normal opacity-60 ml-0.5">dk</span></span>
                                        <span className="text-[9px] font-bold text-amber-200 uppercase tracking-widest">Ort. Hız</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* --- ROW 3: DETAILED BREAKDOWNS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 break-inside-avoid">
                {/* 30 Day Trend (Area) */}
                <ChartCard title="30 GÜNLÜK İŞLEM HACMİ" className="lg:col-span-2">
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 'bold' }} minTickGap={30} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <RechartsTooltip />
                                <Area type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)">
                                    <LabelList dataKey="count" position="top" offset={10} fontSize={10} fontWeight="bold" formatter={(val: any) => val} />
                                </Area>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Status List (Table Replacement for Pie) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 print:border-gray-800 flex flex-col h-full">
                    <h3 className="text-base font-bold text-gray-800 mb-4 uppercase">DOSYA DURUM DAĞILIMI</h3>
                    <div className="flex-1 overflow-auto max-h-[300px] pr-2">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500 bg-gray-50 uppercase sticky top-0">
                                <tr>
                                    <th className="py-2 text-left pl-2">Durum</th>
                                    <th className="py-2 text-right">Adet</th>
                                    <th className="py-2 text-right pr-2">%</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {statusEntries.map(([status, count], idx) => (
                                    <tr key={status} className="hover:bg-gray-50/50">
                                        <td className="py-2 pl-2 font-medium text-gray-700 truncate max-w-[120px]" title={status}>{status}</td>
                                        <td className="py-2 text-right font-bold text-gray-900">{count}</td>
                                        <td className="py-2 text-right pr-2 text-gray-500 text-xs">
                                            {totalStatusCount > 0 ? `%${((count / totalStatusCount) * 100).toFixed(1)}` : '0%'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm font-bold text-gray-900">
                        <span>TOPLAM</span>
                        <span>{totalStatusCount}</span>
                    </div>
                </div>
            </div>

            {/* --- ROW 4: DEMOGRAPHICS (Bar Charts with Labels) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 break-inside-avoid">
                <ChartCard title="MESLEK DAĞILIMI (TOP 10)">
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={professionData} layout="vertical" margin={{ left: 0, right: 30 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <Bar dataKey="count" fill="#EC4899" radius={[0, 4, 4, 0]} barSize={20}>
                                    <LabelList dataKey="percent" position="right" formatter={(val: any) => `%${val}`} fontSize={11} fontWeight="bold" fill="#374151" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="EN ÇOK TALEP EDİLEN ÜRÜNLER">
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={productData} layout="vertical" margin={{ left: 0, right: 30 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <Bar dataKey="value" fill="#6366F1" radius={[0, 4, 4, 0]} barSize={20}>
                                    <LabelList dataKey="percent" position="right" formatter={(val: any) => `%${val}`} fontSize={11} fontWeight="bold" fill="#374151" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* --- ROW 5: CITY (Keep original mini tables design) --- */}
            <div className="mb-8 break-inside-avoid">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase">
                    İl Bazlı Performans Özetleri (Top 10)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <CityMiniTable title="Hacim" data={stats.city} sortKey="total" color="blue" />
                    <CityMiniTable title="Teslimat" data={stats.city} sortKey="delivered" color="emerald" showPercent />
                    <CityMiniTable title="E-Devlet Paylaşmadı" data={stats.city} sortKey="noEdevlet" color="red" showPercent />
                    <CityMiniTable title="Kefil" data={stats.city} sortKey="kefil" color="purple" showPercent />
                    <CityMiniTable title="İptal" data={stats.city} sortKey="cancelled" color="gray" showPercent />
                </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-400 text-xs hidden print:block font-bold">
                Bu rapor sistem tarafından {new Date().toLocaleString('tr-TR')} tarihinde oluşturulmuştur.
                <br />
                CepteKolay+ Yönetim Sistemi
            </div>
        </div>
    );
}

// --- COMPONENTS ---

function KpiCard({ label, value, icon: Icon, color, subtext, desc }: any) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
        green: 'bg-green-50 text-green-700 border-green-200',
    };

    const theme = colors[color] || colors.blue;

    return (
        <div className={`p-4 rounded-xl border-2 flex flex-col justify-between h-full bg-white hover:shadow-md transition-all print:border-gray-800 ${theme.replace(/bg-\w+-50/, '').replace(/text-\w+-700/, '')}`}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 print:text-black">{label}</span>
                <Icon className={`w-5 h-5 ${theme.split(' ')[1]} print:text-black`} />
            </div>
            <div>
                <span className="text-2xl font-black text-gray-900">{value}</span>
                {desc && <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase print:text-gray-600">{desc}</p>}
            </div>
        </div>
    );
}

function ChartCard({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) {
    return (
        <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 print:border-gray-800 flex flex-col ${className}`}>
            <h3 className="text-sm font-extrabold text-gray-800 mb-6 uppercase tracking-tight">{title}</h3>
            <div className="flex-1 min-h-0">
                {children}
            </div>
        </div>
    );
}

function CityMiniTable({ title, data, sortKey, color, showPercent }: { title: string; data: any; sortKey: string; color: string; showPercent?: boolean; }) {
    if (!data) return null;
    const sorted = Object.entries(data)
        .map(([name, stats]: [string, any]) => ({ name, ...stats }))
        .filter(c => c[sortKey] > 0)
        .sort((a, b) => b[sortKey] - a[sortKey])
        .slice(0, 10);

    const colorClasses: any = {
        blue: 'text-blue-800 bg-blue-50 border-blue-100',
        emerald: 'text-emerald-800 bg-emerald-50 border-emerald-100',
        red: 'text-red-800 bg-red-50 border-red-100',
        purple: 'text-purple-800 bg-purple-50 border-purple-100',
        gray: 'text-gray-800 bg-gray-50 border-gray-100',
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 print:border-gray-800 overflow-hidden text-sm">
            <div className={`px-3 py-2 font-bold text-xs uppercase tracking-wider border-b ${colorClasses[color] || 'bg-gray-50'} print:bg-gray-200 print:text-black print:border-gray-800`}>
                {title}
            </div>
            <div className="divide-y divide-gray-100 print:divide-gray-300">
                {sorted.length === 0 ? (
                    <div className="p-3 text-center text-gray-400 text-xs font-medium">Veri yok</div>
                ) : sorted.map((city, idx) => (
                    <div key={city.name} className="px-3 py-1.5 flex justify-between items-center hover:bg-gray-50/50">
                        <span className="truncate flex-1 text-gray-700 font-bold text-xs print:text-black">
                            {idx + 1}. {city.name}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-900 text-xs print:text-black">{city[sortKey]}</span>
                            {showPercent && (
                                <span className="text-[10px] text-gray-500 font-bold w-6 text-right print:text-black">
                                    {city.total > 0 ? '%' + Math.round((city[sortKey] / city.total) * 100) : '-'}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Icon helper
function TargetIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
        </svg>
    )
}
