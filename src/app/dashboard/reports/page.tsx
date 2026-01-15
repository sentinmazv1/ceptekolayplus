'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { UserPerformanceCard } from '@/components/UserPerformanceCard';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    Legend
} from 'recharts';
import {
    Loader2, ArrowLeft, Users, Phone, Printer,
    Package, TrendingUp, Clock, Calendar, Target,
    MessageSquare, MessageCircle, BadgeCheck, PhoneCall, ClipboardList
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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
        approved: number;
        approvedLimit: number;
        delivered: number;
        sale: number;
    };
    todayCalledByPerson: Record<string, number>;
    performance: Record<string, {
        calls: number;
        approvals: number;
        approvedLimit: number;
        applications: number;
        paceMinutes: number;
        sms: number;
        whatsapp: number;
        dailyGoal: number;
        image: string;
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

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div>;
    if (!stats) return <div className="p-8 text-center text-gray-500">Veri yok.</div>;

    // --- Chart Data Prep ---
    const statusEntries = Object.entries(stats.status || {}).sort((a, b) => b[1] - a[1]);
    const totalStatusCount = statusEntries.reduce((acc, curr) => acc + curr[1], 0);

    // Hourly Data (Aggregated per user across range? API returns by Date Key)
    // We want to show "Average Activity by Hour" or "Total Activity by Hour" over the period?
    // User asked "Saatlik çalışma yoğunluğunu canlı veriymiş gibi görselleştir".
    // We'll aggregate counts per hour across ALL days in range for the heat map effect.
    const aggregatedHourly: Record<number, Record<string, number>> = {};
    const relevantUsers = new Set<string>();

    Object.values(stats.hourly || {}).forEach((dayData) => {
        Object.entries(dayData).forEach(([user, hourMap]) => {
            // Exclude system users (API should have filtered, but ignore if present)
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

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-8 pb-20 print:bg-white print:p-0 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => router.back()} className="hover:bg-gray-100">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Geri
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Yönetici Paneli</h1>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 px-2 border-r border-gray-100">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-bold text-gray-500">Tarih Aralığı:</span>
                    </div>
                    <input
                        type="date"
                        className="bg-gray-50 border-0 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:bg-white transition-colors block p-2 font-bold cursor-pointer hover:bg-gray-100"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                    <span className="text-gray-400 font-bold">-</span>
                    <input
                        type="date"
                        className="bg-gray-50 border-0 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:bg-white transition-colors block p-2 font-bold cursor-pointer hover:bg-gray-100"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={() => router.push('/dashboard/delivery-reports')}
                        className="bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 px-4 py-2 rounded-lg font-bold shadow-sm"
                    >
                        <Package className="w-4 h-4 mr-2" />
                        Teslimat
                    </Button>
                    <button
                        onClick={() => window.print()}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-bold shadow-sm"
                    >
                        <Printer className="w-4 h-4" />
                        Yazdır
                    </button>
                </div>
            </div>

            {/* PRINT HEADER */}
            <div className="hidden print:block mb-6 border-b-2 border-gray-800 pb-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900">YÖNETİCİ RAPORU</h1>
                        <p className="text-gray-600 mt-2 font-bold text-lg">Operasyon Özeti</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500 font-bold">RAPOR ARALIĞI</p>
                        <p className="text-xl font-extrabold text-gray-900">
                            {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* --- ROW 1: SALES FUNNEL --- */}
            <div className="mb-8">
                <SalesFunnel stats={stats} />
            </div>

            {/* --- ROW 2: TEAM PERFORMANCE --- */}
            <div className="mb-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6 uppercase tracking-tight">
                    <Users className="w-6 h-6 text-indigo-600" />
                    Personel Performans Karnesi
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Object.entries(stats.performance).sort((a, b) => b[1].calls - a[1].calls).map(([user, pStats]) => (
                        <UserPerformanceCard key={user} user={user} stats={pStats} />
                    ))}
                </div>
            </div>

            {/* --- ROW 3: HOURLY & STATUS --- */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 break-inside-avoid">
                <ChartCard title="Saatlik Çalışma Yoğunluğu" className="xl:col-span-2">
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="hour" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <RechartsTooltip cursor={{ fill: '#F3F4F6', opacity: 0.5 }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                                {userList.map((user, idx) => (
                                    <Bar key={user} dataKey={user.split('@')[0]} stackId="a" fill={COLORS[idx % COLORS.length]} radius={[0, 0, 0, 0]} barSize={24} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
                    <h3 className="text-sm font-extrabold text-gray-800 mb-6 uppercase tracking-tight">Akıbet Dağılımı</h3>
                    <div className="flex-1 overflow-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-500 bg-gray-50 uppercase sticky top-0 z-10">
                                <tr>
                                    <th className="py-2 text-left pl-2">Durum</th>
                                    <th className="py-2 text-right">Adet</th>
                                    <th className="py-2 text-right pr-2">%</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {statusEntries.map(([status, count]) => (
                                    <tr key={status} className="hover:bg-gray-50/50">
                                        <td className="py-2 pl-2 font-medium text-gray-700 truncate max-w-[150px]" title={status}>{status}</td>
                                        <td className="py-2 text-right font-bold text-gray-900">{count}</td>
                                        <td className="py-2 text-right pr-2 text-gray-500 text-xs w-16">
                                            {totalStatusCount > 0 ? `%${((count / totalStatusCount) * 100).toFixed(1)}` : '0%'}
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
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase">
                    İl Bazlı Performans (Top 10)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <CityMiniTable title="Hacim" data={stats.city} sortKey="total" color="blue" />
                    <CityMiniTable title="Teslimat" data={stats.city} sortKey="delivered" color="emerald" showPercent />
                    <CityMiniTable title="Red" data={stats.city} sortKey="rejected" color="red" showPercent />
                    <CityMiniTable title="Kefil" data={stats.city} sortKey="kefil" color="purple" showPercent />
                    <CityMiniTable title="Ulaşılamadı" data={stats.city} sortKey="unreachable" color="gray" showPercent />
                </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-400 text-xs hidden print:block font-bold">
                CepteKolay+ Yönetim Sistemi Raporu - {new Date().toLocaleString('tr-TR')}
            </div>
        </div>
    );
}

// --- SUB COMPONENTS ---

function SalesFunnel({ stats }: { stats: any }) {
    const f = stats.funnel;

    // Formatting currency
    const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 relative overflow-hidden ring-1 ring-gray-100">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
                SATIŞ HUNİSİ (GÜNLÜK AKIŞ)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                {/* Arrow connectors */}
                <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -z-10 transform -translate-y-1/2"></div>
                <div className="hidden md:block absolute top-1/2 left-[20%] w-2 h-2 rounded-full bg-gray-300 -z-10 transform -translate-y-1/2"></div>
                <div className="hidden md:block absolute top-1/2 left-[40%] w-2 h-2 rounded-full bg-gray-300 -z-10 transform -translate-y-1/2"></div>
                <div className="hidden md:block absolute top-1/2 left-[60%] w-2 h-2 rounded-full bg-gray-300 -z-10 transform -translate-y-1/2"></div>
                <div className="hidden md:block absolute top-1/2 left-[80%] w-2 h-2 rounded-full bg-gray-300 -z-10 transform -translate-y-1/2"></div>

                <FunnelStep
                    title="YAPILAN ARAMA"
                    value={f.uniqueCalled} // Unique Count
                    subValue={`Toplam: ${f.totalCalled} Çağrı`} // Total Count
                    icon={PhoneCall}
                    color="text-indigo-600"
                    bg="bg-indigo-50"
                    desc="Tekil Kişi Sayısı"
                />

                <FunnelStep
                    title="ALINAN BAŞVURU"
                    value={f.applications}
                    icon={ClipboardList}
                    color="text-blue-600"
                    bg="bg-blue-50"
                    desc="Formu Tamamlanan"
                />

                <FunnelStep
                    title="AVUKAT SORGUSU"
                    value={f.attorneyQueries}
                    icon={ScaleIcon}
                    color="text-purple-600"
                    bg="bg-purple-50"
                    desc={`${f.attorneyPending || 0} Bekleyen`}
                    subValue={f.attorneyPending > 0 ? "Şuan İncelenen" : "Tüm Sorgular"}
                />

                <FunnelStep
                    title="ONAYLANAN"
                    value={f.approved}
                    icon={BadgeCheck}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                    desc={f.approvedLimit > 0 ? formatCurrency(f.approvedLimit) : "Toplam Limit"}
                    subValue="Toplam Limit"
                />

                <FunnelStep
                    title="TESLİM EDİLEN"
                    value={f.delivered}
                    icon={Package}
                    color="text-green-700"
                    bg="bg-green-100"
                    desc="Satışı Tamamlanan"
                    isFinal
                />
            </div>
        </div>
    );
}

function FunnelStep({ title, value, icon: Icon, color, bg, desc, subValue, isFinal }: any) {
    return (
        <div className={`relative flex flex-col items-center text-center p-5 rounded-xl border-2 transition-transform hover:-translate-y-1 ${bg} ${isFinal ? 'border-green-400 shadow-md transform scale-105' : 'border-transparent shadow-sm'}`}>
            <div className={`p-3 rounded-full bg-white shadow-sm mb-3 ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">{title}</div>
            <div className={`text-4xl font-black ${color} mb-2 tracking-tight`}>{value}</div>

            {subValue && (
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight mb-1">{subValue}</div>
            )}
            <div className="text-xs font-bold text-gray-600">{desc}</div>
        </div>
    );
}

// UserPerformanceCard removed (imported now)
function ScaleIcon(props: any) {
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
            <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="M7 21h10" />
            <path d="M12 3v18" />
            <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
        </svg>
    )
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
