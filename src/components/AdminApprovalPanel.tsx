'use client';

import { useState, useEffect } from 'react';
import { Customer } from '@/lib/types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomerCard } from './CustomerCard';


import { useSearchParams } from 'next/navigation';

export function AdminApprovalPanel() {
    const searchParams = useSearchParams();
    const [leads, setLeads] = useState<Customer[]>([]);
    const [approvedLeads, setApprovedLeads] = useState<Customer[]>([]); // New state for approved
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending'); // Tab state

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'guarantor'>('approve');
    const [selectedLead, setSelectedLead] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({ kredi_limiti: '', admin_notu: '' });

    // Filter State
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'approved') {
            setActiveTab('approved');
        } else {
            setActiveTab('pending');
        }
    }, [searchParams]);

    useEffect(() => {
        if (activeTab === 'pending') {
            fetchPendingApprovals();
        } else {
            fetchApprovedLeads();
        }
    }, [activeTab]);

    const fetchPendingApprovals = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/pending-approvals');
            const json = await res.json();
            if (res.ok) {
                setLeads(json.leads || []);
            }
        } catch (error) {
            console.error('Failed to fetch pending approvals', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchApprovedLeads = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                startDate: dateRange.start,
                endDate: dateRange.end
            });
            const res = await fetch(`/api/admin/approved?${query.toString()}`);
            const json = await res.json();
            if (res.ok) {
                setApprovedLeads(json.leads || []);
            }
        } catch (error) {
            console.error('Failed to fetch approved leads', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (lead: Customer, action: 'approve' | 'reject' | 'guarantor') => {
        setSelectedLead(lead);
        setModalAction(action);
        setFormData({ kredi_limiti: '', admin_notu: '' });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedLead(null);
        setFormData({ kredi_limiti: '', admin_notu: '' });
    };

    const handleApprove = async () => {
        if (!selectedLead || !formData.kredi_limiti) {
            alert('Lütfen kredi limitini girin');
            return;
        }

        setProcessing(selectedLead.id);
        try {
            const payload = {
                customerId: selectedLead.id,
                kredi_limiti: formData.kredi_limiti,
                admin_notu: formData.admin_notu
            };

            const res = await fetch('/api/admin/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Başvuru onaylandı!');
                fetchPendingApprovals();
                closeModal();
            } else {
                const errorData = await res.json();
                alert(`Onaylama başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
            }
        } catch (error) {
            alert('Bir hata oluştu.');
        } finally {
            setProcessing(null);
        }
    };

    const handleRejectOrGuarantor = async () => {
        if (!selectedLead) {
            alert('Müşteri seçilmedi!');
            return;
        }

        setProcessing(selectedLead.id);
        try {
            const payload = {
                customerId: selectedLead.id,
                action: modalAction === 'reject' ? 'reject' : 'request_guarantor',
                reason: formData.admin_notu
            };

            const res = await fetch('/api/admin/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(modalAction === 'reject' ? 'Başvuru reddedildi.' : 'Kefil istendi.');
                fetchPendingApprovals();
                closeModal();
            } else {
                const errorData = await res.json();
                alert(`İşlem başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
            }
        } catch (error) {
            alert('Bir hata oluştu.');
        } finally {
            setProcessing(null);
        }
    };

    const viewDetail = (lead: Customer) => {
        setDetailCustomer(lead);
        setViewMode('detail');
    };

    const backToList = () => {
        setViewMode('list');
        setDetailCustomer(null);
        // Refresh appropriate list
        if (activeTab === 'pending') fetchPendingApprovals();
        else fetchApprovedLeads();
    };

    // Navigation Logic
    const handleNavigation = (direction: 'prev' | 'next') => {
        const list = activeTab === 'pending' ? leads : approvedLeads;
        if (!detailCustomer || list.length === 0) return;

        const currentIndex = list.findIndex(l => l.id === detailCustomer.id);
        if (currentIndex === -1) return;

        let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

        if (newIndex >= 0 && newIndex < list.length) {
            setDetailCustomer(list[newIndex]);
        }
    };

    // Helper to get current index info
    const getNavigationInfo = () => {
        const list = activeTab === 'pending' ? leads : approvedLeads;
        if (!detailCustomer || list.length === 0) return { current: 0, total: 0, hasPrev: false, hasNext: false };
        const index = list.findIndex(l => l.id === detailCustomer.id);
        return {
            current: index + 1,
            total: list.length,
            hasPrev: index > 0,
            hasNext: index < list.length - 1
        };
    };

    // Detail View
    if (viewMode === 'detail' && detailCustomer) {
        const nav = getNavigationInfo();

        return (
            <div className="bg-white rounded-lg shadow p-6">
                {/* Header with Nav and Actions */}
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">

                    {/* Left: Back Button */}
                    <Button variant="outline" size="sm" onClick={backToList} className="flex items-center gap-2 self-start">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden md:inline">Listeye Dön</span>
                    </Button>

                    {/* Center: Navigation */}
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 self-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleNavigation('prev')}
                            disabled={!nav.hasPrev}
                            className="h-8 w-8 p-0"
                            title="Önceki Başvuru"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <span className="text-xs font-medium text-gray-500 w-16 text-center select-none">
                            {nav.current} / {nav.total}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleNavigation('next')}
                            disabled={!nav.hasNext}
                            className="h-8 w-8 p-0"
                            title="Sonraki Başvuru"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Right: Quick Actions (Only for Pending) */}
                    <div className="flex items-center gap-2 self-end md:self-auto">
                        {activeTab === 'pending' ? (
                            <>
                                <Button
                                    size="sm"
                                    onClick={() => openModal(detailCustomer, 'approve')}
                                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white h-9"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="hidden sm:inline">Onayla</span>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openModal(detailCustomer, 'guarantor')}
                                    className="flex items-center gap-1 border-yellow-500 text-yellow-600 hover:bg-yellow-50 h-9"
                                >
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="hidden sm:inline">Kefil</span>
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => openModal(detailCustomer, 'reject')}
                                    className="flex items-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 h-9"
                                >
                                    <XCircle className="w-4 h-4" />
                                    <span className="hidden sm:inline">Reddet</span>
                                </Button>
                            </>
                        ) : (
                            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium border border-green-200 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Onaylandı
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-2">
                    <h2 className="text-xl font-bold mb-4 hidden">Başvuru Detayı</h2>
                    <CustomerCard
                        initialData={detailCustomer}
                        onSave={(updated) => {
                            setDetailCustomer(updated);
                            // Refresh list silently
                            if (activeTab === 'pending') fetchPendingApprovals();
                        }}
                    />
                </div>

                {/* Modal for Detail View */}
                {modalOpen && selectedLead && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <h3 className="text-lg font-bold mb-4">
                                {modalAction === 'approve' && 'Başvuruyu Onayla'}
                                {modalAction === 'reject' && 'Başvuruyu Reddet'}
                                {modalAction === 'guarantor' && 'Kefil İste'}
                            </h3>

                            <p className="text-sm text-gray-600 mb-4">
                                <strong>{selectedLead.ad_soyad}</strong> için işlemi tamamlayın.
                            </p>

                            {modalAction === 'approve' && (
                                <Input
                                    label="Kredi Limiti *"
                                    type="text"
                                    placeholder="Örn: 50000 TL"
                                    value={formData.kredi_limiti}
                                    onChange={(e) => setFormData({ ...formData, kredi_limiti: e.target.value })}
                                    className="mb-4"
                                />
                            )}

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Not {modalAction === 'approve' ? '(Opsiyonel)' : '(Zorunlu)'}
                                </label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                                    placeholder={modalAction === 'reject' ? 'Red sebebini yazın' : 'Notunuzu yazın'}
                                    value={formData.admin_notu}
                                    onChange={(e) => setFormData({ ...formData, admin_notu: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={closeModal}>İptal</Button>
                                <Button
                                    onClick={modalAction === 'approve' ? handleApprove : handleRejectOrGuarantor}
                                    isLoading={processing === selectedLead.id}
                                >
                                    Onayla
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // List View
    return (
        <div className="bg-white rounded-lg shadow min-h-[500px]">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 ${activeTab === 'pending'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <span>Onay Bekleyenler</span>
                        {leads.length > 0 && (
                            <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-xs">
                                {leads.length}
                            </span>
                        )}
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('approved')}
                    className={`flex-1 py-4 text-sm font-medium text-center transition-colors border-b-2 ${activeTab === 'approved'
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <span>Onaylananlar</span>
                        <CheckCircle className="w-4 h-4" />
                    </div>
                </button>
            </div>

            {/* Date Filters for Approved Tab */}
            {activeTab === 'approved' && (
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Başlangıç:</label>
                        <input
                            type="date"
                            className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Bitiş:</label>
                        <input
                            type="date"
                            className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={fetchApprovedLeads}
                        className="ml-auto"
                    >
                        Filtrele
                    </Button>
                </div>
            )}

            <div className="p-6">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    </div>
                ) : activeTab === 'pending' ? (
                    // PENDING LIST
                    leads.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Onay bekleyen başvuru yok.</p>
                    ) : (
                        <div className="space-y-4">
                            {leads.map((lead) => (
                                <div
                                    key={lead.id}
                                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => viewDetail(lead)}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{lead.ad_soyad}</h3>
                                            <p className="text-sm text-gray-600">{lead.telefon}</p>
                                            <p className="text-xs text-gray-500 mt-1">Sahip: {lead.sahip}</p>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {new Date(lead.created_at).toLocaleDateString('tr-TR')}
                                        </span>
                                    </div>
                                    {lead.avukat_sorgu_durumu && (
                                        <div className="mb-2">
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${lead.avukat_sorgu_durumu === 'OLUMLU' ? 'bg-green-100 text-green-700' :
                                                lead.avukat_sorgu_durumu === 'OLUMSUZ' ? 'bg-red-100 text-red-700' :
                                                    lead.avukat_sorgu_durumu === 'BEKLİYOR' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-gray-100 text-gray-700'
                                                }`}>
                                                Avukat: {lead.avukat_sorgu_durumu}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            size="sm"
                                            onClick={() => openModal(lead, 'approve')}
                                            isLoading={processing === lead.id}
                                            className="flex items-center gap-1"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Onayla
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openModal(lead, 'guarantor')}
                                            isLoading={processing === lead.id}
                                            className="flex items-center gap-1"
                                        >
                                            <AlertTriangle className="w-4 h-4" />
                                            Kefil İste
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => openModal(lead, 'reject')}
                                            isLoading={processing === lead.id}
                                            className="flex items-center gap-1"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Reddet
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    // APPROVED CARD GRID
                    approvedLeads.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Henüz onaylanmış başvuru yok.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {approvedLeads.map((lead) => (
                                <div key={lead.id} className="border border-green-200 bg-green-50/30 rounded-xl p-4 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-gray-900 truncate">{lead.ad_soyad}</h3>
                                        <span className="text-xs text-gray-400 whitespace-nowrap">
                                            {lead.created_at ? new Date(lead.created_at).toLocaleDateString('tr-TR') : '-'}
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-sm mb-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Limit:</span>
                                            <span className="font-bold text-green-700">{lead.kredi_limiti ? `${lead.kredi_limiti} TL` : '-'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Ürün:</span>
                                            <span className="font-medium text-gray-900 truncate max-w-[150px]" title={lead.talep_edilen_urun}>{lead.talep_edilen_urun || '-'}</span>
                                        </div>
                                        {lead.admin_notu && (
                                            <div className="bg-white p-2 rounded border border-green-100 text-xs text-gray-600 italic mt-2 line-clamp-2" title={lead.admin_notu}>
                                                <span className="font-semibold text-green-700">Admin:</span> {lead.admin_notu}
                                            </div>
                                        )}
                                        {lead.arama_not_kisa && (
                                            <div className="bg-white p-2 rounded border border-blue-100 text-xs text-gray-600 italic mt-1 line-clamp-2" title={lead.arama_not_kisa}>
                                                <span className="font-semibold text-blue-700">Kısa Not:</span> {lead.arama_not_kisa}
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full bg-white hover:bg-gray-50 text-indigo-600 border-indigo-200"
                                        onClick={() => viewDetail(lead)}
                                    >
                                        Detayları Gör
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Modal */}
            {modalOpen && selectedLead && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold mb-4">
                            {modalAction === 'approve' && 'Başvuruyu Onayla'}
                            {modalAction === 'reject' && 'Başvuruyu Reddet'}
                            {modalAction === 'guarantor' && 'Kefil İste'}
                        </h3>

                        <p className="text-sm text-gray-600 mb-4">
                            <strong>{selectedLead.ad_soyad}</strong> için işlemi tamamlayın.
                        </p>

                        {modalAction === 'approve' && (
                            <Input
                                label="Kredi Limiti *"
                                type="text"
                                placeholder="Örn: 50000 TL"
                                value={formData.kredi_limiti}
                                onChange={(e) => setFormData({ ...formData, kredi_limiti: e.target.value })}
                                className="mb-4"
                            />
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Not {modalAction === 'approve' ? '(Opsiyonel)' : '(Zorunlu)'}
                            </label>
                            <textarea
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                                placeholder={modalAction === 'reject' ? 'Red sebebini yazın' : 'Notunuzu yazın'}
                                value={formData.admin_notu}
                                onChange={(e) => setFormData({ ...formData, admin_notu: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={closeModal}>İptal</Button>
                            <Button
                                onClick={modalAction === 'approve' ? handleApprove : handleRejectOrGuarantor}
                                isLoading={processing === selectedLead.id}
                            >
                                Onayla
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
