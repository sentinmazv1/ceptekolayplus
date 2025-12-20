'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Loader2, ArrowLeft, TrendingUp, Users, ShoppingBag, PieChart as PieChartIcon, Calendar, CheckCircle, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReportStats {
    city: Record<string, number>;
    profession: Record<string, { count: number, totalIncome: number, avgIncome: number }>;
    product: Record<string, number>;
    rejection: Record<string, number>;
    status: Record<string, number>;
    channel?: Record<string, number>; // New
    daily: Record<string, number>;
    funnel: {
        total: number;
        contacted: number;
        storeVisit: number;
        sale: number;
    };
    todayCalled?: number; // NEW
    todayApproved?: number; // NEW
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ef4444', '#f97316'];

export default function ReportsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<ReportStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/reports');
                const json = await res.json();
                if (json.success) {
                    setStats(json.stats);
                } else {
                    setError(json.error || 'API Error');
                }
            } catch (error: any) {
                console.error('Failed to load reports', error);
                setError(error.message || 'Network Error');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <div className="bg-red-50 text-red-600 p-4 rounded-lg max-w-lg">
                    <h3 className="font-bold mb-2">Raporlar Yüklenemedi</h3>
                    <p>{error}</p>
                    <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">Tekrar Dene</Button>
                </div>
            </div>
        );
    }

    if (!stats) return <div className="p-8 text-center text-gray-500">Veri bulunamadı.</div>;

    // Transform Data for Charts

    // 1. City (Top 10)
    const cityData = Object.entries(stats.city || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

    // 2. Product (Top 10)
    const productData = Object.entries(stats.product || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

    // 3. Profession & Income (Top 10 by count, sorted by Income)
    const professionData = Object.entries(stats.profession || {})
        .filter(([_, d]) => d.count > 0)
        .sort((a, b) => b[1].avgIncome - a[1].avgIncome)
        .slice(0, 10)
        .map(([name, d]) => ({ name, income: d.avgIncome, count: d.count }));

    // 4. Sales Funnel
    const funnelData = [
        { name: 'Başvuru', value: stats.funnel?.total || 0 },
        { name: 'İletişim', value: stats.funnel?.contacted || 0 },
        { name: 'Mağaza Ziyareti', value: stats.funnel?.storeVisit || 0 },
        { name: 'Satış', value: stats.funnel?.sale || 0 },
    ];

    // 5. Status Distribution (Pie)
    const statusData = Object.entries(stats.status || {})
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // 6. Channel Distribution (New Pie)
    const channelData = Object.entries(stats.channel || {})
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // 7. Daily Trend (Line/Area)
    const dailyData = Object.entries(stats.daily || {})
        .map(([date, count]) => ({ date, count }));

    const conversionRate = (stats.funnel?.total || 0) > 0
        ? (((stats.funnel?.sale || 0) / stats.funnel.total) * 100).toFixed(1)
        : '0';

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 space-y-8 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => router.back()} size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Geri
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900">Gelişmiş Yönetici Raporları</h1>
                </div>
                <div className="text-sm text-gray-500">
                    Son Güncelleme: {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* KPI Cards Row 1 (Sales Funnel Summary) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Toplam Başvuru</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats.funnel.total}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </div>
                {/* ... other existing cards if any, or just overwrite structure ... */}
            </div>

            {/* KPI Cards Row 2 (Daily Activity) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Bugün Arananlar</p>
                        <h3 className="text-2xl font-bold text-gray-800">{stats.todayCalled || 0}</h3>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <Phone className="w-6 h-6 text-blue-600" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Bugün Onaylananlar</p>
                        <h3 className="text-2xl font-bold text-green-700">{stats.todayApproved || 0}</h3>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">En Çok İstenen</p>
                        <div className="group relative">
                            <h3 className="text-lg font-bold text-gray-800 truncate max-w-[150px]">
                                {productData.length > 0 ? productData[0].name : 'Veri Yok'}
                            </h3>
                            {productData.length > 0 && productData[0].name.length > 15 && (
                                <div className="invisible group-hover:visible absolute left-0 bottom-full mb-2 w-48 bg-gray-900 text-white text-xs rounded p-2 z-10 shadow-lg">
                                    {productData[0].name}
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">
                            {productData.length > 0 ? `${productData[0].count} adet` : '-'}
                        </p>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-lg">
                        <ShoppingBag className="w-6 h-6 text-purple-600" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Satış Oranı</p>
                        <h3 className="text-2xl font-bold text-gray-800">
                            {stats.funnel.total > 0
                                ? `%${Math.round((stats.funnel.sale / stats.funnel.total) * 100)}`
                                : '%0'}
                        </h3>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                </div>
            </div>


            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Daily Trend (New) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        Günlük Başvuru Trendi (Son 30 Gün)
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" />
                                <YAxis />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <RechartsTooltip />
                                <Area type="monotone" dataKey="count" stroke="#4F46E5" fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sales Funnel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Satış Hunisi (Funnel)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" width={100} />
                                <RechartsTooltip />
                                <Bar dataKey="value" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={40}>
                                    {funnelData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Distribution (New Pie Chart) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Dosya Durum Dağılımı</h3>
                    <div className="flex flex-col md:flex-row items-center h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Channel Distribution (New Pie Chart) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Başvuru Kanalı Dağılımı</h3>
                    <div className="flex flex-col md:flex-row items-center h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={channelData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#82ca9d"
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                >
                                    {channelData.map((entry, index) => (
                                        <Cell key={`cell-ch-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* City Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Şehir Dağılımı (Top 10)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={cityData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip />
                                <Bar dataKey="count" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Product Demand */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">En Çok Talep Edilen Ürünler</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={productData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                                <RechartsTooltip />
                                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Profession vs Income */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Meslek & Ortalama Gelir Analizi</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={professionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" />
                                <YAxis />
                                <RechartsTooltip formatter={(val) => `₺${val}`} />
                                <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Ort. Maaş" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">* En az 1 kayıtlı veri olan meslekler</p>
                </div>
            </div>
        </div >
    );
}
