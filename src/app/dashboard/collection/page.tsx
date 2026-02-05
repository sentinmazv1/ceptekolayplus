
'use client';

import { useState, useEffect, useRef } from 'react';
import { CustomerCard } from '@/components/CustomerCard';
import { Loader2, Play, Users, Calendar, AlertTriangle, CheckCircle, RefreshCw, X, ArrowLeft, BarChart3, Scale, ChevronDown, Printer } from 'lucide-react';
import { Customer } from '@/lib/types';

export default function CollectionPage() {
    // Modes: 'DASHBOARD' | 'LIST' | 'CARD'
    const [viewMode, setViewMode] = useState<'DASHBOARD' | 'LIST' | 'CARD'>('DASHBOARD');

    // Data
    // Data
    const [stats, setStats] = useState<any>(null);
    const [leadList, setLeadList] = useState<Customer[]>([]);
    const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1 });
    const [currentFilter, setCurrentFilter] = useState({ type: 'status', value: 'all', title: '' });

    const [activeLead, setActiveLead] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(false);
    const [listTitle, setListTitle] = useState('');

    // Filter dropdown state
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchStats();
    }, []);

    // Click outside handler for dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowFilterDropdown(false);
            }
        };

        if (showFilterDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showFilterDropdown]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/collection/stats');
            const json = await res.json();
            if (json.success) setStats(json.stats);
        } catch (e) {
            console.error('Stats error:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchList = async (type: string, value: string, title: string, page = 1) => {
        setLoading(true);
        setListTitle(title);
        // Store filter for pagination
        setCurrentFilter({ type, value, title });

        try {
            const res = await fetch(`/api/collection/list?type=${type}&value=${value}&page=${page}&limit=50`);
            const json = await res.json();
            if (json.success) {
                setLeadList(json.leads || []);
                setMeta(json.meta || { page: 1, total: 0, totalPages: 1 });
                setViewMode('LIST');
            } else {
                alert('Liste alınamadı: ' + (json.error || 'Bilinmeyen hata'));
            }
        } catch (e: any) {
            console.error('List error:', e);
            alert('Bağlantı hatası: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const changePage = (newPage: number) => {
        if (newPage < 1 || newPage > meta.totalPages) return;
        fetchList(currentFilter.type, currentFilter.value, currentFilter.title, newPage);
    };

    const fetchNext = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/collection/next');
            const json = await res.json();
            if (json.success && json.lead) {
                setActiveLead(json.lead);
                setViewMode('CARD');
            } else {
                alert(json.message || 'Sırada bekleyen müşteri yok.');
            }
        } catch (e: any) {
            alert('Hata: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = () => {
        // After save, return to list if we were in list, or dashboard if Card
        // Actually, logic: If we clicked "Next", maybe stay on card?
        // Let's go back to context. If from List => List. If from Next => Dashboard.
        if (viewMode === 'CARD' && leadList.length > 0) {
            setViewMode('LIST');
            fetchStats(); // Update numbers
        } else {
            setViewMode('DASHBOARD');
            fetchStats();
        }
        setActiveLead(null);
    };

    // --- RENDER HELPERS ---

    const StatsCard = ({ title, count, icon: Icon, color, onClick }: any) => (
        <div
            onClick={onClick}
            className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all group active:scale-95`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${color}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className="text-3xl font-black text-slate-800">{count}</div>
            </div>
            <h3 className="font-bold text-slate-600 text-sm uppercase tracking-wide group-hover:text-indigo-600 transition-colors">{title}</h3>
        </div>
    );

    // Special StatsCard with filter dropdown
    const FilterableStatsCard = ({ title, count, icon: Icon, color, stats }: any) => (
        <div className="relative" ref={dropdownRef}>
            <div
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all group active:scale-95 ${showFilterDropdown ? 'ring-2 ring-indigo-500' : ''}`}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${color}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <div className="text-3xl font-black text-slate-800">{count}</div>
                </div>
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-600 text-sm uppercase tracking-wide group-hover:text-indigo-600 transition-colors">{title}</h3>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {/* Dropdown Menu */}
            {showFilterDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2">
                        {/* All option */}
                        <button
                            onClick={() => {
                                fetchList('status', 'all', 'Tüm Dosyalar');
                                setShowFilterDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-between group"
                        >
                            <span className="font-bold text-slate-700 group-hover:text-indigo-700">Tümü</span>
                            <span className="bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-700 px-3 py-1 rounded-full font-black text-sm">
                                {stats.total}
                            </span>
                        </button>

                        {/* Divider */}
                        <div className="my-2 border-t border-slate-100"></div>

                        {/* Status options */}
                        {Object.entries(stats.byStatus || {}).map(([status, count]: any) => (
                            <button
                                key={status}
                                onClick={() => {
                                    fetchList('status', status, status);
                                    setShowFilterDropdown(false);
                                }}
                                className="w-full text-left px-4 py-3 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-between group"
                            >
                                <span className="font-medium text-slate-700 group-hover:text-indigo-700">{status}</span>
                                <span className="bg-slate-100 group-hover:bg-indigo-100 text-slate-600 group-hover:text-indigo-700 px-3 py-1 rounded-full font-black text-sm">
                                    {count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    /* Hide everything except the list */
                    body * {
                        visibility: hidden;
                    }
                    
                    /* Show only the list content */
                    .print-container,
                    .print-container * {
                        visibility: visible;
                    }
                    
                    .print-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    
                    /* Hide navigation and interactive elements */
                    .print\\:hidden {
                        display: none !important;
                    }
                    
                    /* Optimize page breaks */
                    .print-item {
                        page-break-inside: avoid;
                    }
                    
                    /* Clean background colors */
                    * {
                        background: white !important;
                        color: black !important;
                    }
                }
            `}</style>

            <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-20">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* HEADLINE */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gecikme Paneli</h1>
                            <p className="text-slate-500 font-medium">Takipteki müşteriler ve tahsilat durumu</p>
                        </div>
                        {viewMode === 'DASHBOARD' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => window.location.href = '/dashboard/collection/reports'}
                                    className="flex items-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 transition-transform active:scale-95"
                                >
                                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                                    Raporlar
                                </button>
                                <button
                                    onClick={fetchNext}
                                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-transform active:scale-95"
                                >
                                    <Play className="w-5 h-5 fill-white" />
                                    Sıradakini Getir
                                </button>
                            </div>
                        )}
                        {(viewMode === 'LIST' || viewMode === 'CARD') && (
                            <button
                                onClick={() => {
                                    if (viewMode === 'CARD' && leadList.length > 0) setViewMode('LIST');
                                    else setViewMode('DASHBOARD');
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Geri Dön
                            </button>
                        )}
                    </div>

                    {/* --- DASHBOARD VIEW --- */}
                    {viewMode === 'DASHBOARD' && stats && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">

                            {/* 1. TOP ROW: BIG STATS */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <FilterableStatsCard
                                    title="Toplam Dosya"
                                    count={stats.total}
                                    icon={Users}
                                    color="bg-slate-100 text-slate-600"
                                    stats={stats}
                                />
                                <StatsCard
                                    title="İşlem Bekleyen"
                                    count={stats.byStatus['İşlem Bekliyor'] || 0}
                                    icon={AlertTriangle}
                                    color="bg-amber-100 text-amber-600"
                                    onClick={() => fetchList('status', 'İşlem Bekliyor', 'İşlem Bekleyenler')}
                                />
                                <StatsCard
                                    title="Bugün Ödeme"
                                    count={stats.promises.today}
                                    icon={Calendar}
                                    color="bg-emerald-100 text-emerald-600"
                                    onClick={() => fetchList('date', 'today', 'Bugün Ödenecekler')}
                                />
                                <StatsCard
                                    title="Avukata Hazırlık"
                                    count={stats.byStatus['Avukata Hazırlık Aşaması'] || 0}
                                    icon={Scale}
                                    color="bg-orange-100 text-orange-600"
                                    onClick={() => fetchList('status', 'Avukata Hazırlık Aşaması', 'Avukata Hazırlık Aşaması')}
                                />
                                <StatsCard
                                    title="Sözü Geçenler"
                                    count={stats.promises.overdue}
                                    icon={X}
                                    color="bg-red-100 text-red-600"
                                    onClick={() => fetchList('date', 'overdue', 'Ödeme Sözü Geçenler')}
                                />
                            </div>

                            {/* 2. BREAKDOWN GRID */}
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-indigo-500" />
                                    Detaylı Durum Dağılımı
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {Object.entries(stats.byStatus).map(([status, count]: any) => {
                                        if (status === 'İşlem Bekliyor' || status === 'Avukata Hazırlık Aşaması') return null; // Already shown top
                                        return (
                                            <div
                                                key={status}
                                                onClick={() => fetchList('status', status, status)}
                                                className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                                            >
                                                <span className="font-bold text-slate-700">{status}</span>
                                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-black text-sm">{count}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                        </div>
                    )}

                    {/* --- LIST VIEW --- */}
                    {viewMode === 'LIST' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
                            <div className="bg-indigo-900 text-white p-4 rounded-xl flex justify-between items-center shadow-lg print:bg-white print:text-black print:border print:border-slate-300">
                                <h2 className="font-bold text-lg">{listTitle}</h2>
                                <div className="flex items-center gap-4">
                                    <span className="bg-white/20 px-3 py-1 rounded-full font-mono text-sm print:bg-slate-100 print:text-slate-700">
                                        {meta.total} Kayıt (Sayfa {meta.page}/{meta.totalPages})
                                    </span>

                                    {/* Print Button */}
                                    <button
                                        onClick={() => window.print()}
                                        className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors print:hidden"
                                        title="Listeyi Yazdır"
                                    >
                                        <Printer className="w-4 h-4" />
                                        <span className="hidden md:inline text-sm font-medium">Yazdır</span>
                                    </button>

                                    <div className="flex gap-2 print:hidden">
                                        <button
                                            onClick={() => changePage(meta.page - 1)}
                                            disabled={meta.page <= 1}
                                            className="p-1 hover:bg-white/20 rounded disabled:opacity-50"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => changePage(meta.page + 1)}
                                            disabled={meta.page >= meta.totalPages}
                                            className="p-1 hover:bg-white/20 rounded disabled:opacity-50"
                                        >
                                            <ArrowLeft className="w-5 h-5 rotate-180" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                {leadList.map((lead) => (
                                    <div
                                        key={lead.id}
                                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group relative"
                                    >
                                        <div className="flex justify-between items-start gap-4">
                                            {/* Left Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-slate-900 text-lg group-hover:text-indigo-700 transition-colors">
                                                        {lead.ad_soyad}
                                                    </h3>
                                                    {lead.talep_edilen_tutar && (
                                                        <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded text-xs">
                                                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(lead.talep_edilen_tutar)}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="text-sm font-medium text-slate-500 flex flex-wrap gap-4">
                                                    <span>{lead.telefon}</span>
                                                    {lead.odeme_sozu_tarihi && (
                                                        <span className={lead.odeme_sozu_tarihi < new Date().toISOString() ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
                                                            Söz: {new Date(lead.odeme_sozu_tarihi).toLocaleDateString('tr-TR')}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Last Note */}
                                                {lead.arama_not_kisa && (
                                                    <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 italic">
                                                        "{lead.arama_not_kisa}"
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right / Actions */}
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="text-xs bg-slate-100 px-2 py-1 rounded font-bold text-slate-600">
                                                    {lead.tahsilat_durumu || 'İşlem Bekliyor'}
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    Son: {lead.son_arama_zamani ? new Date(lead.son_arama_zamani).toLocaleDateString('tr-TR') : '-'}
                                                </div>

                                                <button
                                                    onClick={() => { setActiveLead(lead); setViewMode('CARD'); }}
                                                    className="mt-1 px-4 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white font-bold rounded-lg text-sm transition-colors"
                                                >
                                                    Detay
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {leadList.length === 0 && (
                                    <div className="text-center py-12 text-slate-400">Kayıt Bulunamadı</div>
                                )}
                            </div>

                            {/* Bottom Pagination */}
                            <div className="flex justify-center gap-4 py-4">
                                <button
                                    onClick={() => changePage(meta.page - 1)}
                                    disabled={meta.page <= 1}
                                    className="px-4 py-2 bg-white border rounded shadow-sm disabled:opacity-50"
                                >
                                    Önceki
                                </button>
                                <span className="flex items-center font-bold text-slate-600">
                                    {meta.page} / {meta.totalPages}
                                </span>
                                <button
                                    onClick={() => changePage(meta.page + 1)}
                                    disabled={meta.page >= meta.totalPages}
                                    className="px-4 py-2 bg-white border rounded shadow-sm disabled:opacity-50"
                                >
                                    Sonraki
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- CARD VIEW --- */}
                    {viewMode === 'CARD' && activeLead && (
                        <div className="w-full animate-in zoom-in-95 duration-300">
                            <CustomerCard
                                initialData={activeLead}
                                onSave={(updated) => {
                                    // Update local list if exists
                                    setLeadList(prev => prev.map(l => l.id === updated.id ? updated : l));
                                    handleSave();
                                }}
                            />
                        </div>
                    )}


                    {/* LOADING OVERLAY */}
                    {loading && (
                        <div className="fixed inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
