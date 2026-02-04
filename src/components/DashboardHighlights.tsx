'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, Clock, Package, X, Phone, User, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Customer } from '@/lib/types';

interface DashboardHighlightsProps {
    onSelectCustomer: (customer: Customer) => void;
    lastUpdated?: Date; // To trigger refresh
}

export function DashboardHighlights({ onSelectCustomer, lastUpdated }: DashboardHighlightsProps) {
    const [stats, setStats] = useState({
        approved: 0,
        guarantor: 0,
        delivered: 0
    });
    const [loading, setLoading] = useState(false);

    // Modal State
    const [isListOpen, setIsListOpen] = useState(false);
    const [listType, setListType] = useState<'APPROVED' | 'GUARANTOR' | 'DELIVERED' | null>(null);
    const [customerList, setCustomerList] = useState<Customer[]>([]);
    const [listLoading, setListLoading] = useState(false);

    useEffect(() => {
        fetchStats();
    }, [lastUpdated]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            // We can fetch these counts efficiently from Supabase or via our existing API
            // For speed/custom logic, let's query supabase directly for counts using head

            // 1. Approved
            const { count: approvedCount } = await supabase
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('durum', 'Onaylandı');

            // 2. Guarantor (Kefil bekleniyor)
            const { count: guarantorCount } = await supabase
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .eq('durum', 'Kefil bekleniyor');

            // 3. Delivered (This Month? Or Total?)
            // User context suggests "Current Activity", so "Delivered THIS MONTH" is usually most relevant for a dashboard.
            // But user might want "Total Delivered" to feel good. 
            // Let's stick to "This Month" to match the rest of the dashboard stats usually.
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            const { count: deliveredCount } = await supabase
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .or('durum.eq.Teslim edildi,durum.eq.Satış yapıldı/Tamamlandı')
                .gte('teslim_tarihi', startOfMonth);

            setStats({
                approved: approvedCount || 0,
                guarantor: guarantorCount || 0,
                delivered: deliveredCount || 0
            });

        } catch (e) {
            console.error('Stats fetch error', e);
        } finally {
            setLoading(false);
        }
    };

    const handleBadgeClick = async (type: 'APPROVED' | 'GUARANTOR' | 'DELIVERED') => {
        setListType(type);
        setIsListOpen(true);
        setListLoading(true);
        setCustomerList([]);

        try {
            let query = supabase
                .from('leads')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(50); // Limit to 50 for performance

            if (type === 'APPROVED') {
                query = query.eq('durum', 'Onaylandı');
            } else if (type === 'GUARANTOR') {
                query = query.eq('durum', 'Kefil bekleniyor');
            } else if (type === 'DELIVERED') {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                query = query
                    .or('durum.eq.Teslim edildi,durum.eq.Satış yapıldı/Tamamlandı')
                    .gte('teslim_tarihi', startOfMonth);
            }

            const { data, error } = await query;
            if (error) throw error;
            if (data) setCustomerList(data);

        } catch (e) {
            console.error('List fetch error', e);
            alert('Liste yüklenirken hata oluştu');
        } finally {
            setListLoading(false);
        }
    };

    const getTypeColor = () => {
        switch (listType) {
            case 'APPROVED': return 'emerald';
            case 'GUARANTOR': return 'amber';
            case 'DELIVERED': return 'indigo';
            default: return 'gray';
        }
    };

    const getTitle = () => {
        switch (listType) {
            case 'APPROVED': return 'Onaylı Müşteriler';
            case 'GUARANTOR': return 'Kefil Bekleyen Müşteriler';
            case 'DELIVERED': return 'Bu Ay Teslim Edilenler';
            default: return '';
        }
    };

    return (
        <>
            <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6">
                {/* 1. Approved */}
                <div
                    onClick={() => handleBadgeClick('APPROVED')}
                    className="bg-emerald-500 hover:bg-emerald-600 transition-colors cursor-pointer rounded-xl p-4 text-white shadow-lg shadow-emerald-200 relative overflow-hidden group"
                >
                    <div className="absolute right-[-10px] top-[-10px] opacity-20 group-hover:scale-110 transition-transform">
                        <CheckCircle className="w-20 h-20" />
                    </div>
                    <div className="relative z-10 flex flex-col">
                        <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Onaylı
                        </span>
                        <span className="text-3xl font-black mt-1">{stats.approved}</span>
                    </div>
                </div>

                {/* 2. Guarantor */}
                <div
                    onClick={() => handleBadgeClick('GUARANTOR')}
                    className="bg-amber-500 hover:bg-amber-600 transition-colors cursor-pointer rounded-xl p-4 text-white shadow-lg shadow-amber-200 relative overflow-hidden group"
                >
                    <div className="absolute right-[-10px] top-[-10px] opacity-20 group-hover:scale-110 transition-transform">
                        <User className="w-20 h-20" />
                    </div>
                    <div className="relative z-10 flex flex-col">
                        <span className="text-amber-100 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Kefil Bekliyor
                        </span>
                        <span className="text-3xl font-black mt-1">{stats.guarantor}</span>
                    </div>
                </div>

                {/* 3. Delivered */}
                <div
                    onClick={() => handleBadgeClick('DELIVERED')}
                    className="bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer rounded-xl p-4 text-white shadow-lg shadow-indigo-200 relative overflow-hidden group"
                >
                    <div className="absolute right-[-10px] top-[-10px] opacity-20 group-hover:scale-110 transition-transform">
                        <Package className="w-20 h-20" />
                    </div>
                    <div className="relative z-10 flex flex-col">
                        <span className="text-indigo-100 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <Package className="w-3 h-3" /> Teslim Edilen
                        </span>
                        <span className="text-3xl font-black mt-1">{stats.delivered}</span>
                    </div>
                </div>
            </div>

            {/* LIST MODAL */}
            {isListOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center animate-in fade-in duration-200 p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsListOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className={`p-4 border-b flex justify-between items-center bg-${getTypeColor()}-50`}>
                            <h3 className={`text-lg font-black text-${getTypeColor()}-700 uppercase`}>{getTitle()}</h3>
                            <button onClick={() => setIsListOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-auto p-0">
                            {listLoading ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-3">
                                    <Loader2 className={`w-8 h-8 animate-spin text-${getTypeColor()}-600`} />
                                    <span className="text-gray-400 text-sm font-medium">Liste yükleniyor...</span>
                                </div>
                            ) : customerList.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                    <div className="bg-gray-50 p-3 rounded-full mb-2">
                                        <X className="w-6 h-6" />
                                    </div>
                                    <p>Bu durumda kayıt bulunamadı.</p>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefon</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                                            <th className="px-4 py-3 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {customerList.map((customer) => (
                                            <tr key={customer.id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-gray-900">{customer.ad_soyad}</div>
                                                    <div className="text-xs text-gray-400">{customer.sehir || '-'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-mono text-gray-600">
                                                    {customer.telefon}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-500">
                                                    {new Date(customer.updated_at || customer.created_at).toLocaleDateString('tr-TR')}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => {
                                                            setIsListOpen(false);
                                                            onSelectCustomer(customer);
                                                        }}
                                                        className={`text-xs font-bold text-${getTypeColor()}-600 bg-${getTypeColor()}-50 hover:bg-${getTypeColor()}-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ml-auto`}
                                                    >
                                                        Detay <ExternalLink className="w-3 h-3" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t bg-gray-50 text-xs text-center text-gray-400">
                            Toplam {customerList.length} kayıt listelendi.
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
