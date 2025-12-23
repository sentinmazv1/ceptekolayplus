'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import {
    Loader2, ArrowLeft, Users, Phone,
    Package, CheckCircle, Share2, ClipboardList, TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReportStats {
    city: Record<string, { total: number, delivered: number, approved: number, rejected: number, noEdevlet: number, unreachable: number, other: number }>;
    profession: Record<string, { count: number, totalIncome: number, avgIncome: number }>;
    product: Record<string, number>;
    status: Record<string, number>;
    channel: Record<string, number>;
    daily: Record<string, number>;
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
    const statusData = Object.entries(stats.status || {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const channelData = Object.entries(stats.channel || {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    // City - Filter out empty/invalid
    const cityData = Object.entries(stats.city || {})
        .filter(([name]) => name && name !== 'Belirsiz')
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
    // Profession - Filter out empty/invalid
    const professionData = Object.entries(stats.profession || {})
        .filter(([name, d]) => d.count > 0 && name && name !== 'Diğer' && name !== 'Bilinmiyor' && name.trim() !== '')
        .map(([name, d]) => ({ name, count: d.count, income: d.avgIncome }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    const productData = Object.entries(stats.product || {}).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Sales Rate (Delivered / Called)
    // User Request: "Satış oranını hesaplamasını toplam arananlara göre yapalım"
    const salesRate = stats.totalCalled > 0
        ? ((stats.totalDelivered / stats.totalCalled) * 100).toFixed(1)
        : '0';

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8 pb-20 print:bg-white print:p-0">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 print:hidden">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Geri
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900">Yönetici Raporları</h1>
                </div>
                <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Share2 className="w-4 h-4 mr-2" />
                    PDF Paylaş
                </Button>
            </div>

            {/* TOP METRICS ROW (Single Line if possible, or grid) */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                {/* 1. Total Applications */}
                <KpiCard label="Toplam Başvuru" value={stats.funnel.total} icon={Users} color="blue" />

                {/* 2. Called To Date */}
                <KpiCard label="Bugüne Kadar Aranan" value={stats.totalCalled} icon={Phone} color="indigo" />

                {/* 3. Today Called */}
                <KpiCard label="Bugün Aranan" value={stats.todayCalled} icon={Phone} color="cyan" />

                {/* 4. Remaining */}
                <KpiCard label="Kalan Aranacak" value={stats.remainingToCall} icon={ClipboardList} color="amber" />

                {/* 5. Top Product */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                    <span className="text-xs font-medium text-gray-500">En Çok İstenen</span>
                    <div className="mt-1 font-bold text-gray-800 text-sm truncate" title={productData[0]?.[0]}>
                        {productData[0]?.[0] || '-'}
                    </div>
                </div>

                {/* 6. Sales Rate (Delivered / Called) */}
                <KpiCard label="Satış Oranı %" value={`%${salesRate}`} icon={TrendingUp} color="emerald" subtext="(Aranan)" />

                {/* 7. Delivered */}
                <KpiCard label="Teslim Edilen" value={stats.totalDelivered} icon={Package} color="green" />
            </div>

            {/* CHARTS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block print:space-y-8">

                {/* 1. Dosya Durumu Dağılımı */}
                <ChartCard title="Dosya Durumu Dağılımı">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%" cy="50%"
                                innerRadius={60} outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, value, percent }) => `${name}: ${value} (%${((percent || 0) * 100).toFixed(0)})`}
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 flex flex-wrap justify-center gap-3">
                        {statusData.slice(0, 5).map((entry, index) => (
                            <div key={index} className="flex items-center gap-1 text-xs text-gray-600">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                {entry.name}: {entry.value}
                            </div>
                        ))}
                    </div>
                </ChartCard>

                {/* 2. Başvuru Kanalı Dağılımı */}
                <ChartCard title="Başvuru Kanalı Dağılımı">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={channelData}
                                cx="50%" cy="50%"
                                innerRadius={60} outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, value, percent }) => `${name}: ${value} (%${((percent || 0) * 100).toFixed(0)})`}
                            >
                                {channelData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 flex flex-wrap justify-center gap-3">
                        {channelData.slice(0, 5).map((entry, index) => (
                            <div key={index} className="flex items-center gap-1 text-xs text-gray-600">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[(index + 4) % COLORS.length] }}></div>
                                {entry.name}: {entry.value}
                            </div>
                        ))}
                    </div>
                </ChartCard>

                {/* --- Regional Analysis Section (Detailed) --- */}
                <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8 break-inside-avoid">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-indigo-600" />
                            Bölgesel Performans Analizi
                        </h2>
                    </div>

                    {/* Insight Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        {(() => {
                            const cities = Object.entries(stats?.city || {}).map(([name, data]) => ({ name, ...data }));
                            if (cities.length === 0) return <div className="col-span-4 text-center text-gray-400">Veri yok</div>;

                            const topVol = [...cities].sort((a, b) => b.total - a.total)[0];
                            const topDel = [...cities].sort((a, b) => b.delivered - a.delivered)[0];
                            const topNoEdevlet = [...cities].sort((a, b) => b.noEdevlet - a.noEdevlet)[0];
                            const topUnreach = [...cities].filter(c => c.total > 1).sort((a, b) => {
                                const rateA = a.total > 0 ? (a.unreachable / a.total) : 0;
                                const rateB = b.total > 0 ? (b.unreachable / b.total) : 0;
                                return rateB - rateA;
                            })[0];

                            return (
                                <>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <p className="text-xs text-gray-500 font-medium uppercase">En Yüksek Hacim</p>
                                        <p className="text-lg font-bold text-gray-800 truncate" title={topVol?.name}>{topVol?.name || '-'}</p>
                                        <p className="text-xs text-indigo-600">{topVol?.total || 0} Başvuru</p>
                                    </div>
                                    <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                                        <p className="text-xs text-emerald-600 font-medium uppercase">Teslimat Şampiyonu</p>
                                        <p className="text-lg font-bold text-emerald-900 truncate" title={topDel?.name}>{topDel?.name || '-'}</p>
                                        <p className="text-xs text-emerald-700">{topDel?.delivered || 0} Teslimat</p>
                                    </div>
                                    <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                        <p className="text-xs text-red-600 font-medium uppercase">E-Devlet Sorunu</p>
                                        <p className="text-lg font-bold text-red-900 truncate" title={topNoEdevlet?.name}>{topNoEdevlet?.name || '-'}</p>
                                        <p className="text-xs text-red-700">{topNoEdevlet?.noEdevlet || 0} Kişi Vermedi</p>
                                    </div>
                                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                                        <p className="text-xs text-orange-600 font-medium uppercase">En Zor Ulaşılan</p>
                                        <p className="text-lg font-bold text-orange-900 truncate" title={topUnreach?.name}>{topUnreach?.name || '-'}</p>
                                        <p className="text-xs text-orange-700">
                                            {topUnreach && topUnreach.total > 0 ? `%${Math.round((topUnreach.unreachable / topUnreach.total) * 100)}` : '%0'} Ulaşılamadı
                                        </p>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={Object.entries(stats?.city || {})
                                    .map(([name, data]) => ({ name, ...data }))
                                    .sort((a, b) => b.total - a.total)
                                    .slice(0, 15)}
                                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="name"
                                    angle={-45}
                                    textAnchor="end"
                                    interval={0}
                                    height={80}
                                    tick={{ fill: '#6B7280', fontSize: 11 }}
                                />
                                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#F3F4F6' }}
                                />
                                <Bar dataKey="delivered" name="Teslim Edildi" stackId="a" fill="#10B981" />
                                <Bar dataKey="approved" name="Onaylandı" stackId="a" fill="#3B82F6" />
                                <Bar dataKey="noEdevlet" name="E-Devlet Yok" stackId="a" fill="#EF4444" />
                                <Bar dataKey="unreachable" name="Ulaşılamadı" stackId="a" fill="#9CA3AF" />
                                <Bar dataKey="rejected" name="Red/İptal" stackId="a" fill="#F59E0B" />
                                <Bar dataKey="other" name="Diğer" stackId="a" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 4. Meslek Dağılımı (Bar) */}
                <ChartCard title="Meslek Dağılımı (Top 10)">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={professionData} margin={{ top: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                            <YAxis />
                            <RechartsTooltip />
                            <Bar dataKey="count" fill="#EC4899" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Print Footer */}
            <div className="hidden print:block text-center mt-12 text-sm text-gray-500">
                CepteKolay+ Raporu - {new Date().toLocaleDateString('tr-TR')}
            </div>
        </div>
    );
}

// Helpers
function KpiCard({ label, value, icon: Icon, color, subtext }: any) {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50',
        indigo: 'text-indigo-600 bg-indigo-50',
        cyan: 'text-cyan-600 bg-cyan-50',
        amber: 'text-amber-600 bg-amber-50',
        emerald: 'text-emerald-600 bg-emerald-50',
        green: 'text-green-600 bg-green-50',
        purple: 'text-purple-600 bg-purple-50',
    };
    const theme = colors[color] || colors.blue;

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-gray-500">{label}</span>
                <div className={`p-1.5 rounded-lg ${theme}`}>
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

function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 break-inside-avoid">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">{title}</h3>
            {children}
        </div>
    );
}
