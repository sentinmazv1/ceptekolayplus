'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, LabelList, Legend
} from 'recharts';
import {
    Loader2, ArrowLeft, Users, Phone, Printer,
    Package, CheckCircle, Share2, ClipboardList, TrendingUp, Clock, Activity, Download, PhoneForwarded,
    CheckCircle2, MessageSquare, MessageCircle
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
                    <div className="flex items-center">
                        <span className="mr-3 text-sm font-bold text-gray-600">Tarih:</span>
                        <input
                            type="date"
                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-bold shadow-sm"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={() => router.push('/dashboard/delivery-reports')}
                        className="bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-bold shadow-sm"
                    >
                        <Package className="w-4 h-4" />
                        Teslimat Detay
                    </Button>
                    <button
                        onClick={() => window.print()}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-bold shadow-sm"
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
                        <p className="text-gray-600 mt-2 font-bold text-lg">Günlük Satış & Operasyon Özeti</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500 font-bold">RAPOR TARİHİ</p>
                        <p className="text-xl font-extrabold text-gray-900">{new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>
            </div>

            {/* --- ROW 1: SALES FUNNEL (NEW) --- */}
            <div className="mb-8">
                <SalesFunnel stats={stats} />
            </div>

            {/* --- ROW 2: TEAM PERFORMANCE (REDESIGNED) --- */}
            <div className="mb-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-6 uppercase tracking-tight">
                    <Users className="w-6 h-6 text-indigo-600" />
                    Personel Performans Karnesi
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Object.entries(stats.performance).map(([user, pStats]) => (
                        <UserPerformanceCard key={user} user={user} stats={pStats} />
                    ))}
                </div>
            </div>

            {/* --- ROW 3: HOURLY & TREND --- */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 break-inside-avoid">
                <ChartCard title="Saatlik Çalışma Yoğunluğu" className="xl:col-span-2">
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={hourlyData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="hour" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px' }} />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold' }} />
                                {relevantUsers.map((user, idx) => (
                                    <Bar key={user} dataKey={user.split('@')[0]} stackId="a" fill={COLORS[idx % COLORS.length]} radius={[0, 0, 0, 0]} barSize={20} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
                    <h3 className="text-sm font-extrabold text-gray-800 mb-6 uppercase tracking-tight">Dosya Durum Dağılımı</h3>
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
                                {statusEntries.map(([status, count]) => (
                                    <tr key={status} className="hover:bg-gray-50/50">
                                        <td className="py-2 pl-2 font-medium text-gray-700 truncate max-w-[150px]" title={status}>{status}</td>
                                        <td className="py-2 text-right font-bold text-gray-900">{count}</td>
                                        <td className="py-2 text-right pr-2 text-gray-500 text-xs text-right w-16">
                                            {totalStatusCount > 0 ? `%${((count / totalStatusCount) * 100).toFixed(1)}` : '0%'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- ROW 4: MINI TABLES (City etc) --- */}
            <div className="mb-8 break-inside-avoid">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 uppercase">
                    İl Bazlı Performans (Top 10)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <CityMiniTable title="Hacim" data={stats.city} sortKey="total" color="blue" />
                    <CityMiniTable title="Teslimat" data={stats.city} sortKey="delivered" color="emerald" showPercent />
                    <CityMiniTable title="E-Devlet Yok" data={stats.city} sortKey="noEdevlet" color="red" showPercent />
                    <CityMiniTable title="Kefil" data={stats.city} sortKey="kefil" color="purple" showPercent />
                    <CityMiniTable title="İptal" data={stats.city} sortKey="cancelled" color="gray" showPercent />
                </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-400 text-xs hidden print:block font-bold">
                CepteKolay+ Yönetim Sistemi Raporu - {new Date().toLocaleString('tr-TR')}
            </div>
        </div>
    );
}

// --- NEW COMPONENTS ---

function SalesFunnel({ stats }: { stats: any }) {
    // Funnel Steps: Called -> Application -> Attorney -> Approved -> Delivered
    // We also show "Attorney Pending" as a sub-metric under Attorney
    const f = stats.funnel;

    // For visualization percentages (relative to previous step roughly, or just max width)
    // Let's keep it simple: Flex row with arrows

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
                SATIŞ HUNİSİ (GÜNLÜK AKIŞ)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                {/* Arrow connectors (Hidden on mobile) */}
                <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -z-10 transform -translate-y-1/2"></div>

                <FunnelStep
                    title="YAPILAN ARAMA"
                    value={stats.todayCalled}
                    icon={Phone}
                    color="text-indigo-600"
                    bg="bg-indigo-50"
                    desc="Bugün Aranan Tekil Kişi"
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
                    desc={`${f.attorneyPending || 0} Bekleyen Sorgu`}
                    subValue={f.attorneyPending ? `(${f.attorneyPending} Bekleyen)` : undefined}
                />

                <FunnelStep
                    title="ONAYLANAN"
                    value={f.approved}
                    icon={CheckCircle2}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                    desc="Kredi Onayı Alan"
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
        <div className={`relative flex flex-col items-center text-center p-4 rounded-xl border-2 transition-transform hover:-translate-y-1 ${bg} ${isFinal ? 'border-green-400 shadow-md transform scale-105' : 'border-transparent'}`}>
            <div className={`p-3 rounded-full bg-white shadow-sm mb-3 ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">{title}</div>
            <div className={`text-3xl font-black ${color} mb-1`}>{value}</div>
            <div className="text-xs font-bold text-gray-500">{desc}</div>
            {/* Connector Triangle for Mobile */}
            <div className="md:hidden mt-4 text-gray-300">▼</div>
        </div>
    );
}

function UserPerformanceCard({ user, stats }: { user: string, stats: any }) {
    // Rates
    const appRate = stats.calls > 0 ? Math.round((stats.applications / stats.calls) * 100) : 0;
    const approvalRate = stats.applications > 0 ? Math.round((stats.approvals / stats.applications) * 100) : 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                        {user.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 text-base">{user.split('@')[0]}</div>
                        <div className="text-xs text-gray-500 font-medium">Satış Temsilcisi</div>
                    </div>
                </div>
                {/* Score Badge (Optional) */}
                <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-gray-400">GÜNLÜK HEDEF</span>
                    <span className="text-xs font-bold text-gray-800"> -- </span>
                </div>
            </div>

            <div className="p-4 grid grid-cols-2 gap-4 divide-x divide-gray-100">
                {/* Left: Activity */}
                <div className="pr-2 space-y-4">
                    <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">AKTİVİTE</h4>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span className="text-xs font-bold">Arama</span>
                        </div>
                        <span className="text-lg font-black text-gray-900">{stats.calls}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-gray-600">
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-xs font-bold">SMS</span>
                        </div>
                        <span className="text-base font-bold text-gray-700">{stats.sms || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-gray-600">
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-xs font-bold">WP</span>
                        </div>
                        <span className="text-base font-bold text-gray-700">{stats.whatsapp || 0}</span>
                    </div>
                </div>

                {/* Right: Funnel & Results */}
                <div className="pl-4 space-y-4">
                    <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">SONUÇ & DÖNÜŞÜM</h4>

                    <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-blue-600">Başvuru</span>
                            <span className="text-[9px] text-gray-400 font-bold">Aramadan Dönüş</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-lg font-black text-blue-600">{stats.applications || 0}</span>
                            <span className="text-[10px] font-bold text-gray-400">%{appRate}</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-emerald-600">Onay</span>
                            <span className="text-[9px] text-gray-400 font-bold">Başvurudan Dönüş</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-lg font-black text-emerald-600">{stats.approvals}</span>
                            <span className="text-[10px] font-bold text-gray-400">%{approvalRate}</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* Footer: Pace */}
            <div className="bg-gray-50 p-2 flex justify-between items-center border-t border-gray-100">
                <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Arama Hızı
                </span>
                <span className={`text-xs font-black ${stats.paceMinutes > 15 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {stats.paceMinutes > 0 ? `${stats.paceMinutes} dk/çağrı` : '-'}
                </span>
            </div>
        </div>
    );
}

// Icon helper
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
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 print:text-black">{label}</span>
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
