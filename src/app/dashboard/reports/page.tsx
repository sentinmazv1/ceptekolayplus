'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { UserPerformanceCard } from '@/components/UserPerformanceCard';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    Legend
} from 'recharts';
import {
    Loader2, ArrowLeft, Users, Printer,
    Package, TrendingUp, Calendar,
    ClipboardList, BadgeCheck, PhoneCall, Scale, FileText
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { InventoryItem } from '@/lib/types';

interface ReportStats {
    city: Record<string, { total: number; delivered: number; approved: number; rejected: number; cancelled: number; kefil: number; noEdevlet: number; unreachable: number; other: number; }>;
    profession: Record<string, { count: number, totalIncome: number, avgIncome: number }>;
    product: Record<string, number>;
    status: Record<string, number>;
    channel: Record<string, number>;
    rejection: Record<string, number>;
    daily: Record<string, number>;
    hourly: Record<string, Record<string, Record<number, number>>>;
    funnel: {
        totalCalled: number;
        uniqueCalled: number;
        applications: number;
        attorneyQueries: number;
        attorneyPending: number;
        attorneyClean: number;
        attorneyRisky: number;
        attorneyApproved: number;
        attorneyRejected: number;
        approved: number;
        approvedLimit: number;
        delivered: number;
        deliveredVolume: number;
        sale: number;
    };
    inventory: {
        totalItems: number;
        totalCost: number;
        totalRevenue: number;
    };
    todayCalledByPerson: Record<string, number>;
    performance: Record<string, {
        calls: number;
        approvals: number;
        approvedLimit: number,
        applications: number,
        paceMinutes: number,
        sms: number,
        whatsapp: number,
        dailyGoal: number,
        image: string,
        totalLogs: number;
    }>;
}

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'];

export default function ReportsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<ReportStats | null>(null);

    // Date Range State
    const [startDate, setStartDate] = useState<string>(() => {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    });
    const [endDate, setEndDate] = useState<string>(() => {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    });



    useEffect(() => {
        setLoading(true);
        fetch(`/api/reports?startDate=${startDate}&endDate=${endDate}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) setStats(data.stats);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [startDate, endDate]);

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="animate-spin w-10 h-10 text-indigo-600" /></div>;
    if (!stats) return <div className="p-8 text-center text-gray-500 font-medium">Veri bulunamadı.</div>;

    // --- Chart Data Prep ---
    const statusEntries = Object.entries(stats.status || {}).sort((a, b) => b[1] - a[1]);
    const totalStatusCount = statusEntries.reduce((acc, curr) => acc + curr[1], 0);

    // Hourly Data Prep
    const aggregatedHourly: Record<number, Record<string, number>> = {};
    const relevantUsers = new Set<string>();

    Object.values(stats.hourly || {}).forEach((dayData) => {
        Object.entries(dayData).forEach(([user, hourMap]) => {
            if (['sistem', 'ibrahim', 'admin'].some(x => user.toLowerCase().includes(x))) return;

            relevantUsers.add(user);
            Object.entries(hourMap).forEach(([hourStr, count]) => {
                const h = parseInt(hourStr);
                if (!aggregatedHourly[h]) aggregatedHourly[h] = {};
                aggregatedHourly[h][user] = (aggregatedHourly[h][user] || 0) + count;
            });
        });
    });

    const hoursToCheck = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00 to 21:00
    const hourlyData = hoursToCheck.map(h => {
        const row: any = { hour: `${String(h).padStart(2, '0')}:00` };
        relevantUsers.forEach(user => {
            const count = aggregatedHourly[h]?.[user] || 0;
            if (count > 0) row[user.split('@')[0]] = count;
        });
        return row;
    });
    const userList = Array.from(relevantUsers);

    // Helpers for Inventory Display
    const formatTRY = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 pb-24 print:bg-white print:p-0 font-sans">
            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-6 print:hidden">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => router.back()} className="hover:bg-white hover:shadow-md transition-all border-gray-200">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Geri Dön
                    </Button>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Yönetici Raporları</h1>
                        <p className="text-gray-500 font-medium">Detaylı Performans ve Satış Analizi</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm w-full md:w-auto justify-center md:justify-start">
                        <div className="flex items-center gap-2 px-3 border-r border-gray-100">
                            <Calendar className="w-5 h-5 text-indigo-500" />
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tarih Aralığı</span>
                        </div>
                        <input
                            type="date"
                            className="bg-gray-50 border-0 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors block p-2.5 font-bold cursor-pointer hover:bg-gray-100"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-gray-300 font-bold px-1 hidden md:inline">→</span>
                        <input
                            type="date"
                            className="bg-gray-50 border-0 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors block p-2.5 font-bold cursor-pointer hover:bg-gray-100"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <Button
                            onClick={() => router.push('/dashboard/delivery-reports')}
                            className="flex-1 md:flex-none bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 px-6 py-6 h-auto rounded-xl font-bold shadow-sm transition-all hover:shadow-md"
                        >
                            <div className="flex flex-col items-center gap-1">
                                <Package className="w-5 h-5" />
                                <span className="text-xs">Teslimat</span>
                            </div>
                        </Button>

                        <button
                            onClick={() => window.print()}
                            className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-6 rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all flex flex-col items-center gap-1 font-bold shadow-md active:scale-95"
                        >
                            <Printer className="w-5 h-5" />
                            <span className="text-xs">Yazdır / PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* PRINT HEADER */}
            <div className="hidden print:block mb-8 border-b-2 border-gray-900 pb-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-5xl font-black text-gray-900 tracking-tight">YÖNETİCİ RAPORU</h1>
                        <p className="text-gray-600 mt-2 font-bold text-xl uppercase tracking-wider">Operasyonel Performans Özeti</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-widest">RAPORLANAN DÖNEM</p>
                        <div className="inline-block bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">
                            <p className="text-2xl font-black text-gray-900 tabular-nums">
                                {new Date(startDate).toLocaleDateString('tr-TR')} - {new Date(endDate).toLocaleDateString('tr-TR')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ROW 0: INVENTORY STATS --- */}
            {stats.inventory && (
                <div className="mb-8 animate-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center gap-3 mb-6 px-1">
                        <div className="p-2.5 bg-slate-900 rounded-xl text-white shadow-sm">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Envanter Durumu</h2>
                            <p className="text-xs font-bold text-gray-500 hidden md:block">Güncel Stok & Maliyet Analizi</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Card 1: Total Stock */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-colors">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Toplam Stok Adeti</p>
                                <p className="text-3xl font-black text-slate-800 tabular-nums">{stats.inventory.totalItems || 0} <span className="text-sm font-bold text-gray-400">Adet</span></p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Package className="w-6 h-6" />
                            </div>
                        </div>
                        {/* Card 2: Cost Volume */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-colors">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Toplam Alış Hacmi (Maliyet)</p>
                                <p className="text-3xl font-black text-slate-800 tabular-nums">{formatTRY(stats.inventory.totalCost || 0)}</p>
                            </div>
                            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                        </div>
                        {/* Card 3: Potential Volume */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-colors">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Toplam Potansiyel Ciro (15 Ay)</p>
                                <p className="text-3xl font-black text-slate-800 tabular-nums">{formatTRY(stats.inventory.totalRevenue || 0)}</p>
                            </div>
                            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <BadgeCheck className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ROW 1: SALES FUNNEL (PREMIUM CARD) --- */}
            <div className="mb-8 animate-in slide-in-from-bottom-4 duration-500">
                <SalesFunnel stats={stats} />
            </div>

            {/* --- ROW 2: TEAM PERFORMANCE --- */}
            <div className="mb-10 animate-in slide-in-from-bottom-6 duration-700 delay-100">
                <div className="flex items-center gap-3 mb-6 px-1">
                    <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600 shadow-sm">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Personel Karneleri</h2>
                        <p className="text-xs font-bold text-gray-500 hidden md:block">Bireysel Performans ve Hedef Takibi</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {Object.entries(stats.performance)
                        .sort((a, b) => b[1].calls - a[1].calls)
                        .map(([user, pStats]) => (
                            <div key={user} className="transform hover:-translate-y-1 transition-transform duration-300">
                                <UserPerformanceCard user={user} stats={pStats} />
                            </div>
                        ))}
                </div>
            </div>

            {/* --- ROW 3: HOURLY & STATUS --- */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10 break-inside-avoid animate-in slide-in-from-bottom-8 duration-700 delay-200">
                <ChartCard title="Saatlik Çalışma Yoğunluğu" className="xl:col-span-2 h-[400px]">
                    <div className="h-full w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                <XAxis dataKey="hour" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fontWeight: 'bold', fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                <RechartsTooltip
                                    cursor={{ fill: '#F9FAFB' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)', padding: '12px' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }} iconType="circle" />
                                {userList.map((user, idx) => (
                                    <Bar key={user} dataKey={user.split('@')[0]} stackId="a" fill={COLORS[idx % COLORS.length]} radius={[0, 0, 0, 0]} barSize={32} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <div className="bg-white p-8 rounded-3xl shadow-lg shadow-gray-200/50 border border-gray-100 flex flex-col h-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <h3 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-tight relative z-10 flex items-center gap-2">
                        <BadgeCheck className="w-5 h-5 text-gray-400" />
                        Akıbet Dağılımı
                    </h3>

                    <div className="flex-1 overflow-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent relative z-10">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-400 font-bold uppercase sticky top-0 bg-white z-10">
                                <tr>
                                    <th className="py-3 text-left pl-2">Durum</th>
                                    <th className="py-3 text-right">Adet</th>
                                    <th className="py-3 text-right pr-2">Oran</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {statusEntries.map(([status, count], idx) => (
                                    <tr key={status} className="group hover:bg-gray-50 transition-colors">
                                        <td className="py-3 pl-2 font-bold text-gray-700 truncate max-w-[140px] group-hover:text-indigo-600 transition-colors" title={status}>
                                            <span className="inline-block w-2 h-2 rounded-full mr-2 bg-gray-300 group-hover:bg-indigo-500 transition-colors"></span>
                                            {status}
                                        </td>
                                        <td className="py-3 text-right font-black text-gray-900 tabular-nums">{count}</td>
                                        <td className="py-3 text-right pr-2">
                                            <span className="inline-block px-2 py-1 rounded-md bg-gray-100 text-[10px] font-bold text-gray-600 tabular-nums min-w-[3rem] text-center">
                                                {totalStatusCount > 0 ? `%${((count / totalStatusCount) * 100).toFixed(1)}` : '0%'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- ROW 4: MINI TABLES --- */}
            <div className="mb-8 break-inside-avoid">
                <div className="flex items-center gap-3 mb-6 px-1">
                    <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600 shadow-sm">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                        İl Bazlı Performans Analizi
                        <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold align-middle">TOP 10</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <CityMiniTable title="En Çok Arama" data={stats.city} sortKey="total" color="blue" />
                    <CityMiniTable title="En Çok Teslimat" data={stats.city} sortKey="delivered" color="emerald" showPercent />
                    <CityMiniTable title="En Çok Red" data={stats.city} sortKey="rejected" color="red" showPercent />
                    <CityMiniTable title="En Çok Kefil" data={stats.city} sortKey="kefil" color="purple" showPercent />
                    <CityMiniTable title="En Çok Ulaşılamayan" data={stats.city} sortKey="unreachable" color="gray" showPercent />
                </div>
            </div>

            <div className="mt-16 pt-8 border-t border-gray-200 flex flex-col items-center justify-center text-center gap-2 print:flex opacity-60">
                <div className="flex items-center gap-2 font-black text-gray-400 text-sm uppercase tracking-widest">
                    <Package className="w-4 h-4" /> CepteKolay+
                </div>
                <div className="text-xs font-bold text-gray-400">
                    Sistem Raporu • {new Date().toLocaleString('tr-TR')}
                </div>
            </div>


        </div>
    );
}

// --- SUB COMPONENTS ---

function SalesFunnel({ stats }: { stats: any }) {
    const f = stats.funnel;
    const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-indigo-100 border border-indigo-50 relative overflow-hidden ring-1 ring-gray-100 group">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-indigo-50/50 to-transparent rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-purple-50/50 to-transparent rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none"></div>

            <div className="relative z-10 p-8">
                <div className="flex items-center gap-3 mb-10">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-200">
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">GÜNLÜK SATIŞ HUNİSİ</h2>
                        <p className="text-sm font-bold text-gray-500">Operasyonel Dönüşüm Oranları</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative px-4">
                    {/* Arrow connectors (Desktop) */}
                    <div className="hidden md:block absolute top-[40%] left-0 w-full h-1 bg-gray-100 -z-10 rounded-full"></div>

                    <FunnelStep
                        title="YAPILAN ARAMA"
                        value={f.totalCalled}
                        subValue={`TEKİL: ${f.uniqueCalled}`}
                        icon={PhoneCall}
                        color="text-indigo-600"
                        bg="bg-indigo-50"
                        desc="Toplam Çağrı"
                        step={1}
                    />

                    <FunnelStep
                        title="BAŞVURU ALINAN"
                        value={f.applications}
                        icon={ClipboardList}
                        color="text-blue-600"
                        bg="bg-blue-50"
                        desc="Formu Doldurulan"
                        step={2}
                    />

                    <FunnelStep
                        title="AVUKAT SORGUSU"
                        value={f.attorneyQueries}
                        subValue={
                            <div className="flex flex-col gap-0.5 mt-1">
                                <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md self-center border border-gray-200">
                                    {f.attorneyPending || 0} BEKLEYEN
                                </span>
                                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100 flex items-center gap-0.5" title="Temiz">
                                        ✅ {f.attorneyClean || 0}
                                    </span>
                                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100 flex items-center gap-0.5" title="Riskli">
                                        ⚠️ {f.attorneyRisky || 0}
                                    </span>
                                </div>
                            </div>
                        }
                        icon={Scale}
                        color="text-purple-600"
                        bg="bg-purple-50"
                        desc="Sorgulanan"
                        step={3}
                    />

                    <FunnelStep
                        title="ONAYLANAN KREDİ"
                        value={f.approved}
                        subValue={f.approvedLimit > 0 ? formatCurrency(f.approvedLimit) : "0 ₺"}
                        icon={BadgeCheck}
                        color="text-emerald-600"
                        bg="bg-emerald-50"
                        desc="Onaylanan Toplam Limit"
                        step={4}
                    />

                    <FunnelStep
                        title="TESLİM EDİLEN"
                        value={f.delivered}
                        subValue={f.deliveredVolume > 0 ? formatCurrency(f.deliveredVolume) : "0 ₺"}
                        icon={Package}
                        color="text-green-700"
                        bg="bg-gradient-to-br from-green-100 to-emerald-100"
                        desc="Teslimat & Günün Cirosu"
                        isFinal
                        step={5}
                    />
                </div>
            </div>
        </div>
    );
}

function FunnelStep({ title, value, icon: Icon, color, bg, desc, subValue, isFinal, step }: any) {
    return (
        <div className={`relative flex flex-col items-center text-center group/card`}>
            {/* Step Number Badge */}
            <div className={`absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm border-2 border-white z-20 ${isFinal ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400 group-hover/card:bg-indigo-500 group-hover/card:text-white transition-colors'}`}>
                {step}
            </div>

            <div className={`w-full p-6 rounded-3xl border-2 transition-all duration-300 ${bg} ${isFinal ? 'border-green-300 shadow-xl shadow-green-100 scale-105' : 'border-transparent shadow-sm hover:shadow-xl hover:-translate-y-2 hover:bg-white hover:border-indigo-100'}`}>
                <div className={`mx-auto w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center mb-4 ${color}`}>
                    <Icon className="w-7 h-7" />
                </div>

                <div className="text-[10px] uppercase font-extrabold text-gray-500 tracking-widest mb-2">{title}</div>

                <div className={`text-4xl font-black ${color} mb-1 tracking-tighter tabular-nums`}>
                    {value}
                </div>

                {subValue && (
                    <div className="inline-block px-2 py-0.5 rounded-md bg-white/60 text-[10px] font-bold text-gray-500 uppercase tracking-tight mb-2 border border-black/5">
                        {subValue}
                    </div>
                )}

                <div className="text-xs font-bold text-gray-600 border-t border-black/5 pt-2 mt-1 w-full">
                    {desc}
                </div>
            </div>
        </div>
    );
}

function ChartCard({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) {
    return (
        <div className={`bg-white p-8 rounded-3xl shadow-lg shadow-gray-200/50 border border-gray-100 flex flex-col ${className}`}>
            <h3 className="text-lg font-black text-gray-900 mb-2 uppercase tracking-tight">{title}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Canlı Veri Analizi</p>
            <div className="flex-1 min-h-0 relative z-10">
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
        blue: 'from-blue-500 to-blue-600',
        emerald: 'from-emerald-500 to-emerald-600',
        red: 'from-red-500 to-red-600',
        purple: 'from-purple-500 to-purple-600',
        gray: 'from-gray-500 to-gray-600',
    };

    // Light backgrounds for items
    const bgClasses: any = {
        blue: 'hover:bg-blue-50',
        emerald: 'hover:bg-emerald-50',
        red: 'hover:bg-red-50',
        purple: 'hover:bg-purple-50',
        gray: 'hover:bg-gray-50',
    };

    // Text colors
    const textClasses: any = {
        blue: 'text-blue-600',
        emerald: 'text-emerald-600',
        red: 'text-red-600',
        purple: 'text-purple-600',
        gray: 'text-gray-600',
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
            <div className={`px-4 py-3 bg-gradient-to-r ${colorClasses[color]} text-white`}>
                <div className="font-bold text-xs uppercase tracking-wider flex justify-between items-center">
                    {title}
                    <span className="opacity-80 text-[10px]">İLK 10</span>
                </div>
            </div>

            <div className="divide-y divide-gray-50 p-2 flex-1">
                {sorted.length === 0 ? (
                    <div className="h-full flex items-center justify-center p-4 text-center text-gray-300 text-xs font-bold uppercase tracking-wider">
                        Veri Yok
                    </div>
                ) : sorted.map((city, idx) => (
                    <div key={city.name} className={`px-3 py-2 flex justify-between items-center rounded-lg transition-colors ${bgClasses[color]}`}>
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-[10px] font-black text-gray-500`}>
                                {idx + 1}
                            </span>
                            <span className="truncate flex-1 text-gray-700 font-bold text-xs">
                                {city.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 pl-2">
                            <span className={`font-black text-sm tabular-nums ${textClasses[color]}`}>{city[sortKey]}</span>
                            {showPercent && (
                                <span className="text-[9px] text-gray-400 font-bold w-7 text-right bg-gray-50 px-1 py-0.5 rounded tabular-nums">
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
