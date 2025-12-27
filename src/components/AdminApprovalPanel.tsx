'use client';

import { useState, useEffect } from 'react';
import { Customer } from '@/lib/types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { CustomerCard } from './CustomerCard';

export function AdminApprovalPanel() {
    const [leads, setLeads] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'guarantor'>('approve');
    const [selectedLead, setSelectedLead] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({ kredi_limiti: '', admin_notu: '' });

    useEffect(() => {
        fetchPendingApprovals();
    }, []);

    const fetchPendingApprovals = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/pending-approvals');
            const json = await res.json();

            console.log('Pending approvals response:', json);
            if (json.leads && json.leads.length > 0) {
                console.log('First lead from API:', json.leads[0]);
            }

            if (res.ok) {
                setLeads(json.leads || []);
            }
        } catch (error) {
            console.error('Failed to fetch pending approvals', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (lead: Customer, action: 'approve' | 'reject' | 'guarantor') => {
        console.log('Opening modal for lead:', lead.id, 'with action:', action);
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
            console.log('Sending approval request:', payload);

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
                console.error('Approval failed:', errorData);
                alert(`Onaylama başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
            }
        } catch (error) {
            console.error('Approve error:', error);
            alert('Bir hata oluştu.');
        } finally {
            setProcessing(null);
        }
    };

    const handleRejectOrGuarantor = async () => {
        if (!selectedLead) {
            console.error('No lead selected!');
            alert('Müşteri seçilmedi!');
            return;
        }

        console.log('Selected lead:', selectedLead);
        console.log('Modal action:', modalAction);

        setProcessing(selectedLead.id);
        try {
            const payload = {
                customerId: selectedLead.id,
                action: modalAction === 'reject' ? 'reject' : 'request_guarantor',
                reason: formData.admin_notu
            };
            console.log('Sending reject/guarantor request:', payload);

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
                console.error('Reject/Guarantor failed:', errorData);
                alert(`İşlem başarısız: ${errorData.message || 'Bilinmeyen hata'}`);
            }
        } catch (error) {
            console.error('Error:', error);
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
    };

    // Detail View
    if (viewMode === 'detail' && detailCustomer) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-4 flex items-center justify-between">
                    <Button variant="outline" onClick={backToList} className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Listeye Dön
                    </Button>
                    <h2 className="text-xl font-bold">Başvuru Detayı</h2>
                </div>

                <CustomerCard
                    initialData={detailCustomer}
                    onSave={(updated) => {
                        setDetailCustomer(updated);
                        fetchPendingApprovals();
                    }}
                />

                {/* Admin Actions */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border-t border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3">Yönetici İşlemleri</h3>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            onClick={() => openModal(detailCustomer, 'approve')}
                            className="flex items-center gap-1"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Onayla
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openModal(detailCustomer, 'guarantor')}
                            className="flex items-center gap-1"
                        >
                            <AlertTriangle className="w-4 h-4" />
                            Kefil İste
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openModal(detailCustomer, 'reject')}
                            className="flex items-center gap-1"
                        >
                            <XCircle className="w-4 h-4" />
                            Reddet
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // List View
    return (
        <>
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Onay Bekleyen Başvurular</h2>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    </div>
                ) : leads.length === 0 ? (
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
        </>
    );
}
