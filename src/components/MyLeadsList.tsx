'use client';

import { useState, useEffect } from 'react';
import { Customer } from '@/lib/types';
import { Button } from './ui/Button';
import { Loader2, Phone, CheckCircle, XCircle } from 'lucide-react';

interface MyLeadsListProps {
    userEmail: string;
    onSelectLead?: (lead: Customer) => void;
}

export function MyLeadsList({ userEmail, onSelectLead }: MyLeadsListProps) {
    const [leads, setLeads] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchLeads();
    }, [filter]);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter) params.append('status', filter);
            if (search) params.append('search', search);

            const res = await fetch(`/api/leads/my-leads?${params.toString()}`);
            const json = await res.json();

            if (res.ok) {
                setLeads(json.leads || []);
            }
        } catch (error) {
            console.error('Failed to fetch leads', error);
        } finally {
            setLoading(false);
        }
    };

    const statusBadge = (status: string) => {
        const colors: Record<string, string> = {
            'Başvuru alındı': 'bg-blue-100 text-blue-800',
            'Onaya gönderildi': 'bg-yellow-100 text-yellow-800',
            'Onaylandı': 'bg-green-100 text-green-800', // NEW
            'Mağazaya davet edildi': 'bg-purple-100 text-purple-800',
            'Teslim edildi': 'bg-emerald-100 text-emerald-800',
            'Satış yapıldı/Tamamlandı': 'bg-teal-100 text-teal-800',
            'Reddetti': 'bg-red-100 text-red-800',
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Benim Müşterilerim</h2>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-4">
                <input
                    type="text"
                    placeholder="İsim veya telefon ara..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchLeads()}
                />
                <select
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >
                    <option value="">Tüm Durumlar</option>
                    <option value="Yeni">Yeni</option>
                    <option value="Aranacak">Aranacak</option>
                    <option value="Ulaşılamadı">Ulaşılamadı</option>
                    <option value="Meşgul/Hattı kapalı">Meşgul/Hattı kapalı</option>
                    <option value="Yanlış numara">Yanlış numara</option>
                    <option value="Daha sonra aranmak istiyor">Daha sonra aranmak istiyor</option>
                    <option value="WhatsApp’tan bilgi istiyor">WhatsApp’tan bilgi istiyor</option>
                    <option value="E-Devlet paylaşmak istemedi">E-Devlet paylaşmak istemedi</option>
                    <option value="Başvuru alındı">Başvuru alındı</option>
                    <option value="Mağazaya davet edildi">Mağazaya davet edildi</option>
                    <option value="Kefil bekleniyor">Kefil bekleniyor</option>
                    <option value="Eksik evrak bekleniyor">Eksik evrak bekleniyor</option>
                    <option value="Onaya gönderildi">Onaya gönderildi</option>
                    <option value="Onaylandı">Onaylandı</option>
                    <option value="Teslim edildi">Teslim edildi</option>
                    <option value="Satış yapıldı/Tamamlandı">Satış yapıldı/Tamamlandı</option>
                    <option value="Reddetti">Reddetti</option>
                    <option value="Uygun değil">Uygun değil</option>
                    <option value="İptal/Vazgeçti">İptal/Vazgeçti</option>
                </select>
                <Button onClick={fetchLeads} size="sm">Ara</Button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
            ) : leads.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Henüz müşteriniz yok.</p>
            ) : (
                <div className="space-y-3">
                    {leads.map((lead) => (
                        <div
                            key={lead.id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-50"
                            onClick={() => onSelectLead?.(lead)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{lead.ad_soyad}</h3>
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {lead.telefon}
                                    </p>
                                </div>
                                {statusBadge(lead.durum)}
                            </div>

                            {lead.onay_durumu && (
                                <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                                    {lead.onay_durumu === 'Onaylandı' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                    {lead.onay_durumu === 'Reddedildi' && <XCircle className="w-4 h-4 text-red-500" />}
                                    <span>Onay: {lead.onay_durumu}</span>
                                    {lead.kredi_limiti && <span className="ml2"> • Limit: {lead.kredi_limiti}</span>}
                                </div>
                            )}

                            {lead.arama_not_kisa && (
                                <p className="mt-2 text-sm text-gray-600 italic">{lead.arama_not_kisa}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
