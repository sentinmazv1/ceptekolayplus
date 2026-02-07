'use client';

import { useState, useEffect } from 'react';
import { Wallet, ShoppingBag, PieChart, TrendingUp, Users, Package } from 'lucide-react';
import { ReportHeader } from '@/components/reports/ReportHeader';
import { KPICard } from '@/components/reports/KPICard';
import { formatCurrencyCompact, formatLargeNumber } from '@/lib/format-utils';
import { PersonnelTable } from '@/components/reports/PersonnelTable';
import { DeliveredCustomerList } from '@/components/reports/DeliveredCustomerList';
import { CollectionServiceKPI } from '@/components/reports/CollectionServiceKPI';
import { AnalyticsCharts } from '@/components/reports/AnalyticsCharts';

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
    // Global Date Filter - Default to TODAY
    const [startDate, setStartDate] = useState(() => {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
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
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [personnelLoading, setPersonnelLoading] = useState(false);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

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
            .then(d => {
                if (d.success) {
                    setCollectionServiceStats(d.stats);
                }
            })
            .catch(err => console.error('Collection service fetch error:', err));

        // Fetch Analytics Data
        setAnalyticsLoading(true);
        fetch(`/api/reports/analytics?startDate=${startDate}&endDate=${endDate}`)
            .then(res => res.json())
            .then(d => {
                if (d.success) {
                    setAnalyticsData(d.data);
                }
                setAnalyticsLoading(false);
            })
            .catch(err => {
                console.error('Analytics fetch error:', err);
                setAnalyticsLoading(false);
            });
    };

    useEffect(() => {
        fetchDetailedData();
    }, [startDate, endDate]);

    // Transform raw API data for DeliveredCustomerList
    const transformDeliveredLeads = (rawLeads: any[]) => {
        console.log('🔍 [DeliveredLeads] Raw data received:', rawLeads?.length || 0, 'leads');

        if (!rawLeads || rawLeads.length === 0) {
            console.log('⚠️ [DeliveredLeads] No raw leads data');
            return [];
        }

        const transformed = rawLeads.map((lead: any) => {
            // Parse products from satilan_urunler JSON
            let itemsText = '-';
            try {
                if (lead.satilan_urunler) {
                    const products = typeof lead.satilan_urunler === 'string'
                        ? JSON.parse(lead.satilan_urunler)
                        : lead.satilan_urunler;

                    if (Array.isArray(products) && products.length > 0) {
                        // Debug: Log first product to see structure
                        if (products[0]) {
                            console.log('🔍 [Product Structure]:', products[0]);
                        }

                        itemsText = products
                            .map((p: any) => {
                                // SoldItem structure: { marka, model, imei, satis_tarihi, ... }
                                const productName = p.marka && p.model
                                    ? `${p.marka} ${p.model}`
                                    : (p.marka || p.model || 'Ürün');
                                return `${productName} (1 adet)`;
                            })
                            .join(', ');
                    }
                }
            } catch (e) {
                console.error('❌ [DeliveredLeads] Error parsing products:', e);
            }

            // Parse revenue from kredi_limiti
            const parsePrice = (val: any): number => {
                if (!val) return 0;
                let str = String(val).replace(/[^0-9,.-]/g, '');
                if (str.includes(',') && str.includes('.')) {
                    str = str.replace(/\./g, '').replace(',', '.');
                } else if (str.includes(',')) {
                    str = str.replace(',', '.');
                }
                return parseFloat(str) || 0;
            };

            return {
                id: lead.id,
                name: lead.ad_soyad || 'İsimsiz',
                work: lead.calisma_sekli || '-',
                items: itemsText,
                revenue: parsePrice(lead.kredi_limiti),
                date: lead.teslim_tarihi || lead.updated_at || new Date().toISOString()
            };
        });

        console.log('✅ [DeliveredLeads] Transformed data:', transformed.length, 'leads');
        console.log('📊 [DeliveredLeads] Sample:', transformed[0]);

        return transformed;
    };

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

                {/* OVERALL AI SUMMARY */}
                {!detailedLoading && detailedStats && (
                    <div className="mb-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-5 rounded-2xl border-2 border-indigo-200 shadow-lg">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <span className="text-white text-lg font-black">AI</span>
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <span>📊 Günlük Performans Değerlendirmesi</span>
                                    <span className="text-xs font-normal text-gray-500">({startDate === endDate ? startDate : `${startDate} - ${endDate}`})</span>
                                </h3>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    {(() => {
                                        const parts = [];
                                        const stats = detailedStats.funnel;

                                        // Determine if we're looking at today or past dates
                                        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
                                        const isToday = startDate === today && endDate === today;
                                        const isSingleDay = startDate === endDate;

                                        // Date-aware prefix
                                        const datePrefix = isToday ? "Bugün" : isSingleDay ? "Seçilen tarihte" : "Seçilen dönemde";

                                        // Main overview - Revenue
                                        if (stats.deliveredVolume > 0) {
                                            parts.push(`${datePrefix} **${formatCurrencyCompact(stats.deliveredVolume)}** ciro gerçekleştirildi.`);
                                        } else {
                                            parts.push(`${datePrefix} satış gerçekleşmedi.`);
                                        }

                                        // Product sales
                                        if (stats.delivered > 0) {
                                            parts.push(`**${stats.delivered} ürün** teslim edildi.`);
                                        }

                                        // Customer count
                                        if (stats.sale > 0) {
                                            parts.push(`**${stats.sale} müşteri** ile satış tamamlandı.`);
                                        }

                                        // Applications
                                        if (stats.applications > 0) {
                                            parts.push(`**${stats.applications} başvuru** alındı.`);
                                        }

                                        // Calls
                                        if (stats.totalCalled > 0) {
                                            parts.push(`**${stats.totalCalled} arama** gerçekleştirildi.`);
                                        }

                                        // Professional performance note (no emojis, no casual language)
                                        if (stats.deliveredVolume === 0 && stats.applications === 0 && stats.totalCalled === 0) {
                                            parts.push(`Henüz aktivite kaydedilmedi.`);
                                        } else if (stats.deliveredVolume === 0 && (stats.applications > 0 || stats.totalCalled > 0)) {
                                            parts.push(`Satış öncesi süreçler devam ediyor.`);
                                        }

                                        return parts.join(' ');
                                    })()}
                                </p>
                            </div>
                        </div>
                    </div>
                )}


                {/* GENEL TOPLAM KPI GRID */}
                <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-gray-400" />
                        GENEL TOPLAM ({startDate} - {endDate})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                        <KPICard
                            title="Toplam Ciro"
                            value={detailedStats ? formatCurrencyCompact(detailedStats.funnel.deliveredVolume) : '0 ₺'}
                            subValue="Net Satış"
                            icon={Wallet}
                            loading={detailedLoading}
                            className="text-xs lg:col-span-1"
                        />
                        <KPICard
                            title="Ürün Adedi"
                            value={detailedStats ? formatLargeNumber(detailedStats.funnel.delivered) : '0'}
                            subValue="Teslim Edilen"
                            icon={ShoppingBag}
                            loading={detailedLoading}
                            className="text-xs"
                        />
                        <KPICard
                            title="Müşteri Sayısı"
                            value={detailedStats ? formatLargeNumber(detailedStats.funnel.sale) : '0'}
                            subValue="Benzersiz Müşteri"
                            icon={Users}
                            loading={detailedLoading}
                            className="text-xs"
                        />
                        <KPICard
                            title="Toplam Arama"
                            value={detailedStats ? formatLargeNumber(detailedStats.funnel.totalCalled) : '0'}
                            subValue="Çekilen"
                            icon={Package}
                            loading={detailedLoading}
                            className="text-xs"
                        />
                        <KPICard
                            title="Başvuru"
                            value={detailedStats ? formatLargeNumber(detailedStats.funnel.applications) : '0'}
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

                {/* Analytics Charts */}
                {analyticsData && (
                    <AnalyticsCharts data={analyticsData} loading={analyticsLoading} />
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
                <div className="mb-6">
                    <DeliveredCustomerList data={transformDeliveredLeads(deliveredLeads)} />
                </div>

                {/* Collection Service KPI */}
                {collectionServiceStats && (
                    <div className="mb-6">
                        <CollectionServiceKPI data={collectionServiceStats} loading={!collectionServiceStats} />
                    </div>
                )}
            </div>
        </div>
    );
}
