'use client';

import { useState, useEffect } from 'react';
import { Wallet, ShoppingBag, PieChart, TrendingUp, Loader2, Users, Package } from 'lucide-react';
import { ReportHeader } from '@/components/reports/ReportHeader';
import { KPICard } from '@/components/reports/KPICard';
import { PersonnelTable } from '@/components/reports/PersonnelTable';
import { DeliveredCustomerList } from '@/components/reports/DeliveredCustomerList';
import { CollectionServiceKPI } from '@/components/reports/CollectionServiceKPI';
import { Button } from '@/components/ui/Button';

// Types
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
    // Global Date Filter
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
    const [collectionServiceStats, setCollectionServiceStats] = useState<any>(null);
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

        // Fetch Collection Service Stats
        fetch(`/api/reports/collection-service?startDate=${startDate}&endDate=${endDate}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setCollectionServiceStats(data.stats);
                }
            })
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchDetailedData();
    }, [startDate, endDate]);

    // Formatters
    const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(val);
    const formatNumber = (val: number) => new Intl.NumberFormat('tr-TR').format(val);

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 pb-24 font-sans print:bg-white print:p-0">
            <div className="animate-in fade-in duration-500">
                {/* HEADER */}
                <ReportHeader
                    startDate={startDate}
                    setStartDate={setStartDate}
                    endDate={endDate}
                    setEndDate={setEndDate}
                    onRefresh={fetchDetailedData}
                />

                {/* Collection Service KPI */}
                {collectionServiceStats && (
                    <div className="mb-6">
                        <CollectionServiceKPI data={collectionServiceStats} loading={!collectionServiceStats} />
                    </div>
                )}

                {/* Personnel Table */}
                <div className="mb-6">
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
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-gray-400" />
                        GENEL TOPLAM ({startDate} - {endDate})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
                        <KPICard
                            title="Toplam Ciro"
                            value={detailedStats ? formatCurrency(detailedStats.funnel.deliveredVolume) : '0 ₺'}
                            subValue="Net Satış"
                            icon={Wallet}
                            loading={detailedLoading}
                            className="text-xs lg:col-span-1"
                        />
                        <KPICard
                            title="Ürün Adedi"
                            value={detailedStats ? formatNumber(detailedStats.funnel.delivered) : '0'}
                            subValue="Teslim Edilen"
                            icon={ShoppingBag}
                            loading={detailedLoading}
                            className="text-xs"
                        />
                        <KPICard
                            title="Müşteri Sayısı"
                            value={detailedStats ? formatNumber(detailedStats.funnel.sale) : '0'}
                            subValue="Teslim Edilen"
                            icon={Users}
                            loading={detailedLoading}
                            className="text-xs"
                        />
                        <KPICard
                            title="Toplam Arama"
                            value={detailedStats ? formatNumber(detailedStats.funnel.totalCalled) : '0'}
                            subValue="Çekilen"
                            icon={Package}
                            loading={detailedLoading}
                            className="text-xs"
                        />
                        <KPICard
                            title="Başvuru"
                            value={detailedStats ? formatNumber(detailedStats.funnel.applications) : '0'}
                            subValue="Alınan"
                            icon={TrendingUp}
                            loading={detailedLoading}
                            className="text-xs"
                        />
                        <KPICard
                            title="Arama→Başvuru"
                            value={detailedStats && detailedStats.funnel.totalCalled > 0 ? `%${((detailedStats.funnel.applications / detailedStats.funnel.totalCalled) * 100).toFixed(1)}` : '%0'}
                            subValue="Dönüşüm"
                            icon={TrendingUp}
                            loading={detailedLoading}
                            className="text-xs"
                        />
                        <KPICard
                            title="Başvuru→Satış"
                            value={detailedStats && detailedStats.funnel.applications > 0 ? `%${((detailedStats.funnel.sale / detailedStats.funnel.applications) * 100).toFixed(1)}` : '%0'}
                            subValue="Dönüşüm"
                            icon={PieChart}
                            loading={detailedLoading}
                            className="text-xs"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
