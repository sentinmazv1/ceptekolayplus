'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, LabelList
} from 'recharts';
import {
    Loader2, ArrowLeft, Users, Phone,
    Package, CheckCircle, Share2, ClipboardList, TrendingUp, Clock, Activity, Download
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
    hourly: Record<string, Record<number, number>>; // Date keys -> Hour keys -> Count
    funnel: {
        total: number;
        sale: number;
    };
    todayCalled: number;
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
        fetch('/api/reports')
            .then(res => res.json())
            .then(data => {
                if (data.success) setStats(data.stats);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-600" /></div>;
    if (!stats) return <div className="p-8 text-center text-gray-500">Veri yok.</div>;

    // Charts Data Preparation
    // Status - Top 5 Only
    const statusData = Object.entries(stats.status || {})
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Limit to Top 5

    const channelData = Object.entries(stats.channel || {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Profession (Top 10)
    const professionData = Object.entries(stats.profession || {})
        .filter(([name, d]) => d.count > 0 && name && name !== 'Diğer' && name !== 'Bilinmiyor' && name.trim() !== '')
        .map(([name, d]) => ({ name, count: d.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const productData = Object.entries(stats.product || {}).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Hourly Data (0-23)
    // Filter by selected Date
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
        const hourKey = i;
        // Safety check for stats.hourly being undefined or selectedDate not found
        const dateStats = stats.hourly ? stats.hourly[selectedDate] : undefined;
        const count = dateStats ? (dateStats[hourKey] || 0) : 0;

        return {
            hour: `${String(i).padStart(2, '0')}:00`,
            count: count
        };
    });

    // Daily Trend
    const dailyData = Object.entries(stats.daily || {}).map(([date, count]) => ({ date, count }));

    // Sales Rate
    const salesRate = stats.totalCalled > 0
        ? ((stats.totalDelivered / stats.totalCalled) * 100).toFixed(1)
        : '0';

    // Rejection Data Preparation with Percentages
    const rejectionTotal = Object.values(stats.rejection || {}).reduce((a, b) => a + b, 0);
    const rejectionData = Object.entries(stats.rejection || {})
        .map(([name, value]) => {
            const percent = rejectionTotal > 0 ? ((value / rejectionTotal) * 100).toFixed(1) : '0';
            return {
                name,
                value,
                percentStr: `%${percent}`,
                fullLabel: `${name} (%${percent})` // For XAxis
            };
        })
        .sort((a, b) => b.value - a.value);

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 md:p-8 pb-20 print:bg-white print:p-0">
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
                <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                    <Share2 className="w-4 h-4 mr-2" />
                    PDF Olarak İndir
                </Button>
            </div>

            {/* PRINT HEADER (Visible only on print) */}
            <div className="hidden print:block mb-8 border-b pb-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Yönetici Raporu</h1>
                        <p className="text-gray-500 mt-1">CepteKolay+ Operasyon Analizi</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-400">Rapor Tarihi</p>
                        <p className="font-semibold text-gray-800">{new Date().toLocaleDateString('tr-TR')}</p>
                    </div>
                </div>
            </div>

            {/* --- ROW 1: EXECUTIVE KPIs --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8 auto-rows-fr">
                <KpiCard label="Toplam Başvuru" value={stats.funnel.total} icon={Users} color="blue" />
                <KpiCard label="Bugüne Kadar Aranan" value={stats.totalCalled} icon={Phone} color="indigo" />
                <KpiCard label="Bugün Aranan" value={stats.todayCalled} icon={Phone} color="cyan" />
                <KpiCard label="Kalan Aranacak" value={stats.remainingToCall} icon={ClipboardList} color="amber" />

                <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow h-full">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">En Çok İstenen</span>
                    <div className="mt-1 font-bold text-gray-800 text-sm truncate" title={productData[0]?.[0]}>
                        {productData[0]?.[0] || '-'}
                    </div>
                </div>

                <KpiCard label="Satış Oranı %" value={`%${salesRate}`} icon={TrendingUp} color="emerald" subtext="(Aranan)" />

                {/* Clickable Delivered */}
                <div onClick={() => router.push('/dashboard/delivery-reports')} className="cursor-pointer transition-transform hover:scale-105 active:scale-95 relative group print:hover:scale-100 h-full">
                    <div className="absolute inset-0 bg-green-500 opacity-0 group-hover:opacity-5 rounded-xl transition-opacity" />
                    <KpiCard label="Teslim Edilen" value={stats.totalDelivered} icon={Package} color="green" />
                </div>
            </div>

            {/* --- ROW 2: CITY ANALYSIS GRIDS --- */}
            <div className="mb-8 break-inside-avoid">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-600" />
                    İl Bazlı Performans Özetleri (Top 10)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <CityMiniTable title="Hacim" data={stats.city} sortKey="total" color="blue" />
                    <CityMiniTable title="Teslimat" data={stats.city} sortKey="delivered" color="emerald" showPercent />
                    <CityMiniTable title="E-Devlet Paylaşmadı" data={stats.city} sortKey="noEdevlet" color="red" showPercent />
                    {/* Unreachable removed as per request */}
                    <CityMiniTable title="Kefil" data={stats.city} sortKey="kefil" color="purple" showPercent />
                    <CityMiniTable title="İptal" data={stats.city} sortKey="cancelled" color="gray" showPercent />
                </div>
            </div>

            {/* --- ROW 3: OPERATION RHYTHM (HOURLY + TREND) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 break-inside-avoid">
                {/* Hourly Intensity Heatmap */}
                <ChartCard title="Saatlik Çalışma Yoğunluğu" className="lg:col-span-2">
                    {/* Date Picker Header */}
                    <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs text-gray-500">Seçili Tarih:</span>
                        <input
                            type="date"
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>

                    <div className="h-[300px]">
                        {stats.hourly && Object.keys(stats.hourly).length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={hourlyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                    <XAxis dataKey="hour" tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <RechartsTooltip
                                        cursor={{ fill: '#F3F4F6' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={20}>
                                        {hourlyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fillOpacity={0.6 + (entry.count / (Math.max(...hourlyData.map(h => h.count)) || 1)) * 0.4} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-gray-400 text-sm">
                                Henüz saatlik veri oluşmadı. (Aramalar başladıkça dolacaktır)
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 text-center mt-2">Gün içindeki arama ve işlem yoğunluğu (00:00 - 23:00)</p>
                </ChartCard>

                {/* Daily Trend Area */}
                <ChartCard title="30 Günlük Trend">
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#8B5CF6"
                                    fillOpacity={1}
                                    fill="url(#colorTrend)"
                                    strokeWidth={3}
                                    activeDot={{ r: 6 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* --- ROW 4: DEMOGRAPHICS & DISTRIBUTION --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 break-inside-avoid">
                {/* Profession Bar */}
                <ChartCard title="Meslek Dağılımı (Top 10)" className="md:col-span-1">
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={professionData} layout="vertical" margin={{ left: 0, right: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 10, fill: '#4B5563' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <RechartsTooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="count" fill="#EC4899" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* Channel Donut */}
                <ChartCard title="Başvuru Kanalı">
                    <div className="h-[250px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={channelData}
                                    cx="50%" cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, value, percent }) => `${name} (${value})`}
                                    labelLine={false}
                                >
                                    {channelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                        {channelData.slice(0, 3).map((e, i) => (
                            <span key={i} className="text-xs text-gray-500 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                                {e.name}
                            </span>
                        ))}
                    </div>
                </ChartCard>

                {/* Status Donut - Top 5 Only */}
                <ChartCard title="Dosya Durumu (Top 5)">
                    <div className="h-[250px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%" cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, value }) => value > 0 ? value : ''}
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                        {statusData.map((e, i) => (
                            <span key={i} className="text-[10px] text-gray-500 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[(i + 4) % COLORS.length] }}></span>
                                {e.name}
                            </span>
                        ))}
                    </div>
                </ChartCard>
            </div>

            {/* --- ROW 5: REJECTION / CANCELLATION ANALYSIS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 break-inside-avoid">
                <ChartCard title="Ret ve İptal Nedenleri" className="md:col-span-2">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={rejectionData}
                                layout="horizontal"
                                margin={{ bottom: 20, top: 20 }} // Add top margin for labels
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFF6FF" />
                                <XAxis
                                    dataKey="name"
                                    tick={({ x, y, payload }) => {
                                        // We can find the full label from data if needed, or just use payload.value
                                        // Since we want the axis to be clean or detailed?
                                        // User asked for "permanent data", let's keep the axis somewhat standard
                                        // but maybe less cluttered if the bar has the label?
                                        // Let's use the standard name on Axis, and value+percent on Bar.

                                        return (
                                            <g transform={`translate(${x},${y})`}>
                                                <text x={0} y={0} dy={10} textAnchor="end" fill="#6B7280" fontSize={10} transform="rotate(-15)">
                                                    {payload.value.length > 15 ? payload.value.slice(0, 15) + '...' : payload.value}
                                                </text>
                                            </g>
                                        );
                                    }}
                                    interval={0}
                                    height={60}
                                />
                                <YAxis hide />
                                <RechartsTooltip
                                    cursor={{ fill: '#F9FAFB' }}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any, name: any, props: any) => {
                                        // Just show the raw value, the user can see percent on bar
                                        // Or show both consistency.
                                        const item = props.payload;
                                        return [`${value} (${item.percentStr})`, name];
                                    }}
                                />
                                <Bar dataKey="value" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={40}>
                                    {/* Colors */}
                                    {rejectionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name.includes('İptal') || entry.name === 'Fiyat Yüksek' ? '#F59E0B' : '#EF4444'} />
                                    ))}
                                    {/* Permanent Label on Top */}
                                    <LabelList dataKey="percentStr" position="top" fill="#374151" fontSize={11} fontWeight="bold" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* Footer Signature */}
            <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-400 text-xs hidden print:block">
                Bu rapor sistem tarafından {new Date().toLocaleString('tr-TR')} tarihinde oluşturulmuştur.
                <br />
                CepteKolay+ Yönetim Sistemi
            </div>
        </div>
    );
}

// --- COMPONENTS ---

// Updated KpiCard with colored borders for ALL
function KpiCard({ label, value, icon: Icon, color, subtext }: any) {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50 border-blue-200',
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-200',
        cyan: 'text-cyan-600 bg-cyan-50 border-cyan-200',
        amber: 'text-amber-600 bg-amber-50 border-amber-200',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        green: 'text-green-600 bg-green-50 border-green-200',
        purple: 'text-purple-600 bg-purple-50 border-purple-200',
    };

    // Default fallback
    const themeClass = colors[color] || colors.blue;

    // Extract border color for the card container
    // The previous implementation used 'theme' for the ICON container, which is fine.
    // We want the border on the main div.

    const borderColor = themeClass.split(' ').find((c: string) => c.startsWith('border-')) || 'border-gray-200';

    return (
        <div className={`bg-white p-4 rounded-xl shadow-sm border-2 flex flex-col justify-between hover:shadow-md transition-all h-full ${borderColor}`}>
            <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
                <div className={`p-1.5 rounded-lg ${themeClass.replace(/border-\w+-\d+/, '')}`}>
                    {/* remove border from icon container to avoid double border visual if any */}
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <div className="mt-2">
                <span className="text-2xl font-bold text-gray-900">{value}</span>
                {subtext && <span className="text-xs text-gray-400 ml-1">{subtext}</span>}
            </div>
        </div>
    );
}

function ChartCard({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) {
    return (
        <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col ${className}`}>
            <h3 className="text-base font-semibold text-gray-800 mb-4">{title}</h3>
            <div className="flex-1 min-h-0">
                {children}
            </div>
        </div>
    );
}

function CityMiniTable({ title, data, sortKey, color, showPercent }: {
    title: string;
    data: any;
    sortKey: string;
    color: string;
    showPercent?: boolean;
}) {
    if (!data) return null;

    const sorted = Object.entries(data)
        .map(([name, stats]: [string, any]) => ({ name, ...stats }))
        .filter(c => c[sortKey] > 0)
        .sort((a, b) => b[sortKey] - a[sortKey])
        .slice(0, 10); // STRICTLY TOP 10

    const colorClasses: any = {
        blue: 'text-blue-700 bg-blue-50',
        emerald: 'text-emerald-700 bg-emerald-50',
        red: 'text-red-700 bg-red-50',
        orange: 'text-orange-700 bg-orange-50',
        purple: 'text-purple-700 bg-purple-50',
        gray: 'text-gray-700 bg-gray-50',
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden text-sm">
            <div className={`px-3 py-2 font-semibold text-xs uppercase tracking-wider ${colorClasses[color] || 'bg-gray-50'}`}>
                {title}
            </div>
            <div className="divide-y divide-gray-100">
                {sorted.length === 0 ? (
                    <div className="p-3 text-center text-gray-400 text-xs">Veri yok</div>
                ) : sorted.map((city, idx) => (
                    <div key={city.name} className="px-3 py-2 flex justify-between items-center hover:bg-gray-50/50">
                        <span className="truncate flex-1 text-gray-600 font-medium" title={city.name}>
                            {idx + 1}. {city.name}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800">{city[sortKey]}</span>
                            {showPercent && (
                                <span className="text-[10px] text-gray-400 w-8 text-right">
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
