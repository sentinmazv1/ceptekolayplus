'use client';

import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { ReportHeader } from '@/components/reports/ReportHeader';
import { PersonnelTable } from '@/components/reports/PersonnelTable';
import { DeliveredCustomerList } from '@/components/reports/DeliveredCustomerList';
import { CollectionServiceKPI } from '@/components/reports/CollectionServiceKPI';

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
                        itemsText = products
                            .map((p: any) => `${p.urun_adi || p.name || 'Ürün'} (${p.adet || 1} adet)`)
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
                work: lead.meslek || '-',
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
                    <DeliveredCustomerList data={transformDeliveredLeads(deliveredLeads)} />
                </div>
            </div>
        </div>
    );
}
