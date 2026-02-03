'use client';

import { useState, useEffect } from 'react';
import { Wallet, ShoppingBag, PieChart, TrendingUp, Loader2, PhoneCall, MessageSquare, MonitorSmartphone, FileCheck, Scale, BadgeCheck, PackageCheck, ShieldAlert, ShieldCheck, Users, Package } from 'lucide-react';
import { ReportHeader } from '@/components/reports/ReportHeader';
import { KPICard } from '@/components/reports/KPICard';
import { PersonnelTable } from '@/components/reports/PersonnelTable';
import { DeliveredCustomerList } from '@/components/reports/DeliveredCustomerList';
import { Button } from '@/components/ui/Button';

// Types
interface OverviewStats {
    calls: number;
    sms: number;
    whatsapp: number;
    applications: number;
    attorneyQuery: number;
    attorneyClean: number;
    attorneyRisky: number;
    approvedCount: number;
    approvedLimit: number;
    deliveredCount: number;
    deliveredRevenue: number;
}

interface ReportStats {
    funnel: {
        deliveredVolume: number; // Ciro
        delivered: number;       // Satış Adeti
        sale: number;            // Müşteri Bazlı Satış
        applications: number;    // Başvuru
        totalCalled: number;     // Arama
    };
    daily: Record<string, number>;
}

export default function ReportsPage() {
    // Tabs
    const [activeTab, setActiveTab] = useState<'overview' | 'detailed'>('overview');

    // Global Date Filter (Only affects Detailed Tab)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1); // Default to first day of month
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    });
    const [endDate, setEndDate] = useState(() => {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    });

    // State for Detailed Report (Global KPIs)
    const [detailedStats, setDetailedStats] = useState<ReportStats | null>(null);
    const [detailedLoading, setDetailedLoading] = useState(true);

    // State for Personnel & Delivered
    const [personnelData, setPersonnelData] = useState<any[]>([]);
    const [deliveredLeads, setDeliveredLeads] = useState<any[]>([]);
    const [personnelLoading, setPersonnelLoading] = useState(false);

    const fetchDetailedData = () => {
        setDetailedLoading(true);
        setPersonnelLoading(true);

        // Fetch Global Stats
        fetch(`/api/reports?startDate=${startDate}&endDate=${endDate}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) setDetailedStats(data.stats);
            })
            .catch(err => console.error(err))
            .finally(() => setDetailedLoading(false));

        // Fetch Personnel Stats
        fetch(`/api/reports/personnel?startDate=${startDate}&endDate=${endDate}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setPersonnelData(data.data);
                    setDeliveredLeads(data.deliveredLeads || []);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setPersonnelLoading(false));
    };

    useEffect(() => {
        if (activeTab === 'detailed') {
            fetchDetailedData();
        }
    }, [startDate, endDate, activeTab]);

    // Formatters
    const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
    const formatNumber = (val: number) => new Intl.NumberFormat('tr-TR').format(val);

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 pb-24 font-sans print:bg-white print:p-0">
            {/* Tab Navigation */}
            <div className="flex items-center gap-4 mb-8">
                <Button
                    variant={activeTab === 'overview' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('overview')}
                    className={`font-bold rounded-xl shadow-sm border border-transparent ${activeTab === 'overview' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:text-gray-900'}`}
                >
                    <MonitorSmartphone className="w-4 h-4 mr-2" />
                    Kuş Bakışı (Bu Ay)
                </Button>
                <Button
                    variant={activeTab === 'detailed' ? 'primary' : 'secondary'}
                    onClick={() => setActiveTab('detailed')}
                    className={`font-bold rounded-xl shadow-sm border border-transparent ${activeTab === 'detailed' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:text-indigo-600'}`}
                >
                    <Users className="w-4 h-4 mr-2" />
                    Personel & Detay
                </Button>
            </div>

            {activeTab === 'overview' && <OverviewTab />}

            {activeTab === 'detailed' && (
                <div className="animate-in fade-in duration-500">
                    {/* HEADER */}
                    <ReportHeader
                        startDate={startDate}
                        setStartDate={setStartDate}
                        endDate={endDate}
                        setEndDate={setEndDate}
                        onRefresh={fetchDetailedData}
                    />

                    {/* Personnel Table */}
                    <div className="mb-8">
                        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            PERSONEL PERFORMANS TABLOSU
                        </h3>
                        <PersonnelTable data={personnelData} loading={personnelLoading} />
                    </div>

                    {/* Delivered Customers List */}
                    <div className="mb-12">
                        <DeliveredCustomerList data={deliveredLeads} />
                    </div>

                    {/* KPI GRID (Global Totals for Context) */}
                    <div>
                        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-gray-400" />
                            GENEL TOPLAM ({startDate} - {endDate})
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <KPICard
                                title="Toplam Ciro"
                                value={detailedStats ? formatCurrency(detailedStats.funnel.deliveredVolume) : '0 ₺'}
                                subValue="Net Satış"
                                icon={Wallet}
                                loading={detailedLoading}
                            />
                            <KPICard
                                title="Satış Adeti"
                                value={detailedStats ? formatNumber(detailedStats.funnel.delivered) : '0'}
                                subValue="Ürün Bazlı"
                                icon={ShoppingBag}
                                loading={detailedLoading}
                            />
                            <KPICard
                                title="Dönüşüm"
                                value={detailedStats && detailedStats.funnel.totalCalled > 0 ? `%${((detailedStats.funnel.sale / detailedStats.funnel.totalCalled) * 100).toFixed(1)}` : '%0'}
                                subValue="Satış / Arama"
                                icon={PieChart}
                                loading={detailedLoading}
                            />
                            <KPICard
                                title="Müşteri"
                                value={detailedStats ? formatNumber(detailedStats.funnel.sale) : '0'}
                                subValue="Teslim Edilen Kişi"
                                icon={TrendingUp}
                                loading={detailedLoading}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function OverviewTab() {
    const [stats, setStats] = useState<OverviewStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/reports/overview')
            .then(res => res.json())
            .then(data => {
                if (data.success) setStats(data.stats);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
    const formatNumber = (val: number) => new Intl.NumberFormat('tr-TR').format(val);

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
                <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <MonitorSmartphone className="w-5 h-5 text-indigo-600" />
                    BU AYIN ÖZETİ (Canlı)
                </h2>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Otomatik hesaplanır, filtreden etkilenmez</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. ROW: Communication */}
                <KPICard title="Toplam Arama (Çekilen)" value={stats ? formatNumber(stats.calls) : '0'} icon={PhoneCall} loading={loading} subValue="Müşteri Çek" />
                <KPICard title="Atılan SMS" value={stats ? formatNumber(stats.sms) : '0'} icon={MessageSquare} loading={loading} />
                <KPICard title="WhatsApp" value={stats ? formatNumber(stats.whatsapp) : '0'} icon={MessageSquare} loading={loading} />

                {/* 2. ROW: Application & Attorney */}
                <KPICard title="Alınan Başvuru" value={stats ? formatNumber(stats.applications) : '0'} icon={FileCheck} loading={loading} className="border-l-4 border-l-blue-500" />
                <KPICard title="Avukat Sorgu (Bekleyen)" value={stats ? formatNumber(stats.attorneyQuery) : '0'} icon={Scale} loading={loading} className="border-l-4 border-l-purple-500" />
                <div className="grid grid-cols-2 gap-4">
                    <KPICard title="Sorgu Temiz" value={stats ? formatNumber(stats.attorneyClean) : '0'} icon={ShieldCheck} loading={loading} trendUp={true} trend="Temiz" className="h-full" />
                    <KPICard title="Sorgu Riskli" value={stats ? formatNumber(stats.attorneyRisky) : '0'} icon={ShieldAlert} loading={loading} trendUp={false} trend="Riskli" className="h-full" />
                </div>

                {/* 3. ROW: Financials */}
                <KPICard
                    title="Onaylanan Müşteri"
                    value={stats ? formatNumber(stats.approvedCount) : '0'}
                    subValue={stats ? formatCurrency(stats.approvedLimit) : '0 ₺'}
                    icon={BadgeCheck}
                    loading={loading}
                    className="bg-emerald-50/50 border-emerald-100"
                />
                <KPICard
                    title="Teslim Edilen"
                    value={stats ? formatNumber(stats.deliveredCount) : '0'}
                    subValue={stats ? formatCurrency(stats.deliveredRevenue) : '0 ₺'}
                    icon={PackageCheck}
                    loading={loading}
                    className="bg-indigo-50/50 border-indigo-100 col-span-2"
                />
            </div>
        </div>
    );
}
