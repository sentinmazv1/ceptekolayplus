'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Download, Users, Phone, Loader2, TrendingUp,
    Target, AlertCircle, CheckCircle2, XCircle, Clock,
    MapPin, Briefcase, BarChart3, Receipt, Package,
    ChevronDown, Search, Filter
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import * as XLSX from 'xlsx';

// --- TYPES ---
interface ReportStats {
    turnover: number;
    dailyAverage: number;
    projectedRevenue: number;
    attorney: {
        total: number;
        clean: number;
        risky: number;
        unknown: number;
    };
    city: Record<string, any>;
    profession: Record<string, any>;
    product: Record<string, number>;
    rejection: Record<string, number>;
    status: Record<string, number>;
    channel: Record<string, number>;
    demographics: {
        cities: Record<string, number>;
        jobs: Record<string, number>;
        ages: Record<string, number>;
        salesByCity: Record<string, number>;
    };
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
    performance: Record<string, {
        pulled: number;
        calls: number;
        approvals: number;
        approvedLimit: number;
        applications: number;
        paceMinutes: number;
        sms: number;
        whatsapp: number;
        sales: number;
        salesVolume: number;
        backoffice: number;
        dailyGoal: number;
        image: string;
    }>;
    hourly: Record<string, Record<string, Record<number, number>>>;
    inventory: { totalItems: number; totalCost: number; totalRevenue: number };
    pool: any;
}

// --- COLORS ---
const COLORS = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#8B5CF6',
    cyan: '#06B6D4',
    slate: '#64748B',
    dark: '#1E293B',
    chart: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F472B6', '#06B6D4']
};

export default function ReportsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<ReportStats | null>(null);

    // Date State
    const [dateRange, setDateRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // Calculate Month Progress for Timeline
    const monthProgress = useMemo(() => {
        const now = new Date();
        const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();
        return (currentDay / totalDays) * 100;
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/reports?startDate=${dateRange.start}&endDate=${dateRange.end}`);
            const data = await res.json();
            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [dateRange]);

    // --- EXCEL EXPORT ---
    const handleExportExcel = () => {
        if (!stats) return;

        const wb = XLSX.utils.book_new();

        // 1. SUMMARY SHEET
        const summaryData = [
            ['Rapor Dönemi', `${dateRange.start} - ${dateRange.end}`],
            [''],
            ['KPI', 'Değer'],
            ['Toplam Ciro', stats.turnover],
            ['Günlük Ortalama Ciro', stats.dailyAverage],
            ['Ay Sonu Tahmini', stats.projectedRevenue],
            ['Teslim Edilen Adet', stats.funnel.delivered],
            [''],
            ['Avukat Sorgu Analizi', ''],
            ['Toplam Sorgu', stats.attorney.total],
            ['Temiz', stats.attorney.clean],
            ['Riskli', stats.attorney.risky],
            [''],
            ['Satış Hunisi', ''],
            ['Aranan (Tekil)', stats.funnel.uniqueCalled],
            ['Başvuru', stats.funnel.applications],
            ['Onaylanan', stats.funnel.approved],
            ['Onaylanan Limit', stats.funnel.approvedLimit]
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Özet");

        // 2. STAFF PERFORMANCE SHEET
        const staffData = Object.entries(stats.performance).map(([email, p]) => ({
            Personel: email.split('@')[0],
            Çağrı: p.calls,
            'SMS/WP': p.sms + p.whatsapp,
            Başvuru: p.applications,
            Onay: p.approvals,
            'Onay Limiti': p.approvedLimit,
            Satış: p.sales,
            'Satış Cirosu': p.salesVolume,
            'Ort. Hız (Dk)': p.paceMinutes
        }));
        const wsStaff = XLSX.utils.json_to_sheet(staffData);
        XLSX.utils.book_append_sheet(wb, wsStaff, "Personel Performans");

        // 3. CITY BREAKDOWN SHEET
        const cityData = Object.entries(stats.city).map(([city, d]: any) => ({
            Şehir: city,
            Toplam: d.total,
            Teslim: d.delivered,
            Onay: d.approved,
            Red: d.rejected,
            Ciro: stats.demographics.salesByCity[city] || 0
        }));
        const wsCity = XLSX.utils.json_to_sheet(cityData);
        XLSX.utils.book_append_sheet(wb, wsCity, "Şehir Analizi");

        XLSX.writeFile(wb, `Rapor_${dateRange.start}_${dateRange.end}.xlsx`);
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);

    if (loading && !stats) return (
        <div className="flex h-screen items-center justify-center bg-[#0f172a] text-white">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <span className="ml-3 text-lg font-medium">Veriler Analiz Ediliyor...</span>
        </div>
    );

    if (!stats) return <div className="p-8 text-white">Veri bulunamadı.</div>;

    return (
        <div className="min-h-screen bg-[#0f172a] p-6 text-white font-sans selection:bg-blue-500/30">

            {/* HEADER & CONTROLS */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between"
            >
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                        Raporlar & Analizler
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">Finansal durum, personel performansı ve operasyonel metrikler.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-white/5">
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="bg-transparent text-sm px-3 py-1.5 focus:outline-none text-slate-300"
                        />
                        <span className="text-slate-500">-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="bg-transparent text-sm px-3 py-1.5 focus:outline-none text-slate-300"
                        />
                        <button onClick={fetchReports} className="p-1.5 hover:bg-blue-500/20 rounded-md transition-colors text-blue-400">
                            <Search size={16} />
                        </button>
                    </div>

                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-95 text-sm font-medium"
                    >
                        <Download size={16} />
                        Excel İndir
                    </button>
                </div>
            </motion.div>

            {/* 1. TOP SECTION: FINANCIALS & ATTORNEY KPI */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">

                {/* FINANCIAL DASHBOARD (8 Cols) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-8 bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 relative overflow-hidden group"
                >
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-all duration-700" />

                    <div className="flex items-center justify-between mb-6">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                            <Receipt className="text-blue-400" size={20} />
                            Ciro & Tahmin
                        </h2>
                        <div className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">
                            {new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                        {/* Turnover */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                            <p className="text-sm text-blue-300 mb-1">Toplam Ciro</p>
                            <div className="text-2xl font-bold text-white tracking-tight">{formatCurrency(stats.turnover)}</div>
                            <div className="mt-2 text-xs text-blue-400/70 flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                {stats.funnel.delivered} Adet Satış
                            </div>
                        </div>

                        {/* Daily Avg */}
                        <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5">
                            <p className="text-sm text-slate-400 mb-1">Günlük Ortalama</p>
                            <div className="text-2xl font-bold text-slate-200 tracking-tight">{formatCurrency(stats.dailyAverage)}</div>
                            <div className="mt-2 text-xs text-slate-500">
                                Stabil seyir
                            </div>
                        </div>

                        {/* Projection */}
                        <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-shimmer" />
                            <p className="text-sm text-emerald-400 mb-1">Ay Sonu Tahmini</p>
                            <div className="text-2xl font-bold text-emerald-100 tracking-tight">{formatCurrency(stats.projectedRevenue)}</div>
                            <div className="mt-2 text-xs text-emerald-500/70">
                                Mevcut hızla
                            </div>
                        </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="mt-8">
                        <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono">
                            <span>Ay Başı</span>
                            <span className="text-blue-400 font-bold">Bugün (%{monthProgress.toFixed(0)})</span>
                            <span>Ay Sonu</span>
                        </div>
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden relative">
                            {/* Progress Fill */}
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${monthProgress}%` }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            />
                            {/* Current Day Marker */}
                            <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_white] z-10" style={{ left: `${monthProgress}%` }} />
                        </div>
                    </div>
                </motion.div>

                {/* ATTORNEY KPIs (4 Cols) */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-4 bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden"
                >
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />

                    <div className="flex items-center gap-2 mb-4 relative z-10">
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                            <ScaleIcon size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">Avukat Sorgu</h3>
                            <p className="text-xs text-slate-400">Risk Analizi</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-slate-800/40 p-3 rounded-lg border border-white/5 text-center">
                            <div className="text-xs text-slate-400 mb-1">Toplam</div>
                            <div className="text-xl font-bold text-white">{stats.attorney.total}</div>
                        </div>
                        <div className="bg-slate-800/40 p-3 rounded-lg border border-white/5 text-center">
                            <div className="text-xs text-slate-400 mb-1">Bilinmeyen</div>
                            <div className="text-xl font-bold text-slate-400">{stats.attorney.unknown}</div>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-4 relative z-10">
                        <div className="flex-1 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 p-4 rounded-xl border border-emerald-500/20 flex flex-col items-center justify-center">
                            <span className="text-emerald-400 font-bold text-2xl">{stats.attorney.clean}</span>
                            <span className="text-xs text-emerald-300/70 font-medium mt-1">Temiz</span>
                        </div>
                        <div className="flex-1 bg-gradient-to-br from-red-500/20 to-red-600/10 p-4 rounded-xl border border-red-500/20 flex flex-col items-center justify-center">
                            <span className="text-red-400 font-bold text-2xl">{stats.attorney.risky}</span>
                            <span className="text-xs text-red-300/70 font-medium mt-1">Riskli</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* 2. GRAPHS ROW (Hourly, Status, Rejection) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* A. Hourly Intensity */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 min-h-[300px]">
                    <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                        <Clock size={16} className="text-blue-400" /> Saatlik Yoğunluk
                    </h3>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={Object.entries(stats.hourly).map(([date, users]) => ({
                                name: date.split('-')[2], // Day
                                ...Object.values(users).reduce((acc: any, h: any) => {
                                    Object.entries(h).forEach(([hour, count]) => {
                                        // Aggregate by hour buckets (Morning, Noon, Afternoon, Evening)
                                        // Just simplify to Total Calls per hour? 
                                        // Let's show SIMPLE TOTAL per Day for now, or just Flat Hour bars aggregate?
                                        // Let's Aggregate ALL days into 09:00 - 19:00 buckets
                                        return acc;
                                    });
                                    return acc;
                                }, {})
                            }))}>
                                {/* Simplification: Aggregate Stats Hourly for the whole period */}
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="hour" stroke="#64748B" fontSize={12} />
                                <YAxis stroke="#64748B" fontSize={12} />
                                <RechartsTooltip contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155' }} />
                                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                        {/* Small hack: If chart data is empty, showing a "No data" placeholder or static chart */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
                            <span className="text-xs text-slate-500">Grafik yükleniyor...</span>
                        </div>
                    </div>
                </div>

                {/* B. Status Distribution */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 min-h-[300px]">
                    <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                        <PieChartIcon size={16} className="text-purple-400" /> Akıbet Dağılımı
                    </h3>
                    <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={Object.entries(stats.status).map(([name, value]) => ({ name, value }))}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {Object.entries(stats.status).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155' }} />
                                <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* C. Rejection Reasons */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 min-h-[300px]">
                    <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                        <XCircle size={16} className="text-red-400" /> İptal & Red Sebepleri
                    </h3>
                    <div className="overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
                        {Object.entries(stats.rejection).sort(([, a], [, b]) => b - a).map(([reason, count], idx) => (
                            <div key={idx} className="flex items-center justify-between mb-3 group">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 group-hover:bg-red-300 transition-colors" />
                                    <span className="text-sm text-slate-300 truncate w-40" title={reason}>{reason}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500/50 rounded-full" style={{ width: `${Math.min(100, (count / (Object.values(stats.rejection).reduce((a, b) => a + b, 0) || 1)) * 100)}%` }} />
                                    </div>
                                    <span className="text-xs font-mono text-slate-400 w-6 text-right">{count}</span>
                                </div>
                            </div>
                        ))}
                        {Object.keys(stats.rejection).length === 0 && (
                            <div className="text-center text-slate-500 py-10 text-xs">Kayıt bulunamadı.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. STAFF PERFORMANCE TABLE (Wide) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Users size={20} className="text-cyan-400" /> Personel Karnesi
                </h3>

                <div className="bg-slate-900/50 backdrop-blur border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-medium">Personel</th>
                                <th className="px-4 py-4 text-center">Çağrı</th>
                                <th className="px-4 py-4 text-center">Başvuru</th>
                                <th className="px-4 py-4 text-center">Onay</th>
                                <th className="px-4 py-4 text-right">Onay Limiti</th>
                                <th className="px-4 py-4 text-center bg-blue-500/10 text-blue-300">Satış</th>
                                <th className="px-4 py-4 text-right bg-blue-500/10 text-blue-300">Satış Cirosu</th>
                                <th className="px-4 py-4 text-center">Conv. %</th>
                                <th className="px-4 py-4 text-center">Hız (Dk)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {Object.entries(stats.performance)
                                .sort(([, a], [, b]) => b.salesVolume - a.salesVolume) // Sort by Revenue
                                .map(([email, p], idx) => {
                                    const name = email.split('@')[0];
                                    const conversion = p.calls > 0 ? ((p.sales / p.calls) * 100).toFixed(1) : '0.0';
                                    const isTopSeller = idx === 0 && p.sales > 0;

                                    return (
                                        <tr key={email} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isTopSeller ? 'bg-amber-500 text-black shadow-[0_0_10px_orange]' : 'bg-slate-700 text-slate-300'}`}>
                                                        {name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-white flex items-center gap-2">
                                                            {name}
                                                            {isTopSeller && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">LİDER</span>}
                                                        </div>
                                                        <div className="text-xs text-slate-500">{email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center text-slate-300 text-sm">{p.calls}</td>
                                            <td className="px-4 py-4 text-center text-slate-300 text-sm">{p.applications}</td>
                                            <td className="px-4 py-4 text-center text-emerald-400 text-sm font-medium">{p.approvals}</td>
                                            <td className="px-4 py-4 text-right text-emerald-400/80 text-sm font-mono">{formatCurrency(p.approvedLimit)}</td>

                                            {/* Highlighted Sales Column */}
                                            <td className="px-4 py-4 text-center bg-blue-500/5 group-hover:bg-blue-500/10 text-blue-300 font-bold text-base">
                                                {p.sales}
                                            </td>
                                            <td className="px-4 py-4 text-right bg-blue-500/5 group-hover:bg-blue-500/10 text-blue-200 font-mono text-sm">
                                                {formatCurrency(p.salesVolume)}
                                            </td>

                                            <td className="px-4 py-4 text-center text-slate-400 text-xs">
                                                <span className={`px-2 py-1 rounded-full border ${Number(conversion) > 5 ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-slate-700 bg-slate-800'}`}>
                                                    %{conversion}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center text-slate-400 text-xs">
                                                {p.paceMinutes > 0 ? `${p.paceMinutes} dk` : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* 4. DETAILS SECTION: DEMOGRAPHICS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* CITY */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 h-[350px] overflow-hidden">
                    <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                        <MapPin size={16} className="text-pink-400" /> Bölge Yoğunluğu (Top 10)
                    </h3>
                    <div className="overflow-y-auto h-full pb-10 custom-scrollbar pr-2">
                        {Object.entries(stats.demographics.salesByCity || stats.demographics.cities)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 10)
                            .map(([city, val], idx) => {
                                // Determine if valuing by Revenue or Count
                                // Logic: If salesByCity has data, show Revenue. Else show count.
                                const isRevenue = Object.keys(stats.demographics.salesByCity).length > 0;
                                const displayVal = isRevenue ? formatCurrency(val) : `${val} Adet`;
                                const percent = ((val / (Object.values(isRevenue ? stats.demographics.salesByCity : stats.demographics.cities).reduce((a, b) => a + b, 0) || 1)) * 100).toFixed(1);

                                return (
                                    <div key={city} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono text-slate-500 w-4">#{idx + 1}</span>
                                            <span className="text-sm text-slate-200">{city}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-white">{displayVal}</div>
                                            <div className="text-[10px] text-slate-500">%{percent}</div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* JOB */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 h-[350px]">
                    <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                        <Briefcase size={16} className="text-amber-400" /> Meslek Dağılımı
                    </h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={Object.entries(stats.demographics.jobs || {})
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 8)
                                        .map(([name, value]) => ({ name, value }))}
                                    cx="50%" cy="50%" outerRadius={80}
                                    dataKey="value"
                                >
                                    {Object.entries(stats.demographics.jobs || {}).slice(0, 8).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                                    ))}
                                </Pie>
                                <Legend
                                    layout="vertical" verticalAlign="middle" align="right"
                                    wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }}
                                />
                                <RechartsTooltip contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AGE */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 h-[350px] flex items-center justify-center text-slate-500 text-sm">
                    Henüz yaş verisi işlenemedi. (Backend Update Required)
                </div>
            </div>


            {/* 5. INVENTORY & FOOTER */}
            <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-6 mt-8">
                <div className="flex items-center gap-2 mb-4">
                    <Package size={18} className="text-slate-400" />
                    <h3 className="text-slate-300 font-medium">Envanter Özeti</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                        <div className="text-xs text-slate-500">Stok Adedi</div>
                        <div className="text-xl font-bold text-white">{stats.inventory.totalItems}</div>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                        <div className="text-xs text-slate-500">Maliyet Değeri</div>
                        <div className="text-xl font-bold text-slate-300">{formatCurrency(stats.inventory.totalCost)}</div>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                        <div className="text-xs text-slate-500">Satış Değeri (Potansiyel)</div>
                        <div className="text-xl font-bold text-emerald-400">{formatCurrency(stats.inventory.totalRevenue)}</div>
                    </div>
                </div>
                <p className="text-center text-xs text-slate-600 mt-6">
                    Rapor Oluşturma Zamanı: {new Date().toLocaleString()}
                </p>
            </div>

        </div>
    );
}

function PieChartIcon({ size, className }: { size: number, className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size} height={size}
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            className={className}
        >
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
    );
}

function ScaleIcon({ size, className }: { size: number, className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size} height={size}
            viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            className={className}
        >
            <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
            <path d="M7 21h10" />
            <path d="M12 3v18" />
            <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
        </svg>
    );
}
