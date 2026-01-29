'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Customer } from '@/lib/types';
import { Loader2, Inbox, Phone, Globe, HelpCircle, CheckCircle, XCircle, ChevronRight, UserPlus, Trash2 } from 'lucide-react';
import { CustomerCard } from '@/components/CustomerCard';

export default function RequestsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<Customer[]>([]);
    const [activeTab, setActiveTab] = useState<'ALL' | 'Aranma Talebi' | 'Web Başvuru' | 'Durum Sorgulama'>('ALL');
    const [selectedRequest, setSelectedRequest] = useState<Customer | null>(null);

    // Fetch Requests
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Pending (Bekleyen)
            const p1 = fetch('/api/leads?durum=TALEP_BEKLEYEN').then(res => res.json());
            // Fetch Closed (Kapatılan)
            const p2 = fetch('/api/leads?durum=TALEP_KAPATILDI').then(res => res.json());

            const [res1, res2] = await Promise.all([p1, p2]);

            const leads1 = res1.leads || [];
            const leads2 = res2.leads || [];

            setRequests([...leads1, ...leads2]);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConvert = async (req: Customer) => {
        // Option 1: Just open CustomerCard (Status is currently TALEP_BEKLEYEN)
        // User changes status to "Yeni" or "Aranacak" and saves.
        // We might want to auto-update status to "Yeni" FIRST to "Claim" it?
        // Let's just open the card. The User can save it as "Aranacak" or whatever.

        // HOWEVER: The "CustomerCard" might not support 'TALEP_BEKLEYEN' status in dropdown if it's hidden?
        // We should probably convert it to "Yeni" or "Aranacak" immediately upon clicking "Başvuru Oluştur"
        // and then open the card.

        if (!confirm('Bu talebi başvuruya dönüştürmek istiyor musunuz?')) return;

        try {
            // Update status to 'Yeni'
            const res = await fetch(`/api/customers/${req.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ durum: 'Yeni', basvuru_kanali: req.basvuru_kanali })
            });

            if (res.ok) {
                const updated = await res.json();
                // Close current list item locally
                setRequests(requests.filter(r => r.id !== req.id));
                // Open modal or redirect? 
                // User said: "başvuru oluştur butonu ile bizim müşteri kartıyla açılsın"
                setSelectedRequest(updated.customer);
            } else {
                alert('Hata oluştu');
            }
        } catch (e) {
            alert('Bağlantı hatası');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu talebi silmek/kapatmak istediğinize emin misiniz?')) return;
        try {
            const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setRequests(requests.filter(r => r.id !== id));
            } else {
                alert('Silinemedi');
            }
        } catch (e) {
            alert('Hata');
        }
    };

    // Filter Logic
    const filtered = requests.filter(r => {
        if (activeTab === 'ALL') return true;
        return r.basvuru_kanali === activeTab;
    });

    const getIcon = (source: string) => {
        if (source === 'Aranma Talebi') return <Phone className="w-4 h-4" />;
        if (source === 'Web Başvuru') return <Globe className="w-4 h-4" />;
        if (source === 'Durum Sorgulama') return <HelpCircle className="w-4 h-4" />;
        return <Inbox className="w-4 h-4" />;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Inbox className="w-8 h-8 text-orange-500" />
                        Gelen Talepler
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Web sitesi ve diğer kanallardan gelen, henüz incelenmemiş {requests.length} yeni talep var.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push('/dashboard')}>
                        Geri Dön
                    </Button>
                    <Button onClick={fetchData} disabled={loading}>
                        <CheckCircle className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Yenile
                    </Button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 bg-white px-4 pt-2 rounded-t-xl overflow-x-auto">
                {[
                    { id: 'ALL', label: 'Tümü', icon: Inbox, color: 'text-gray-600' },
                    { id: 'Aranma Talebi', label: 'Aranma', icon: Phone, color: 'text-blue-600' },
                    { id: 'Web Başvuru', label: 'Başvuru', icon: Globe, color: 'text-green-600' },
                    { id: 'Durum Sorgulama', label: 'Sorgu', icon: HelpCircle, color: 'text-purple-600' },
                ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    const count = requests.filter(r => tab.id === 'ALL' ? true : r.basvuru_kanali === tab.id).length;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                                ${isActive
                                    ? `border-indigo-600 text-indigo-700 bg-indigo-50/50`
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
                            `}
                        >
                            <tab.icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : tab.color}`} />
                            {tab.label}
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-200 text-gray-600'}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* List */}
            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-b-xl border border-t-0 border-gray-200">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Inbox className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Talep Bulunamadı</h3>
                    <p className="text-gray-500">Bu kategoride bekleyen yeni talep yok.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filtered.map((req) => (
                        <div key={req.id} className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">

                            {/* Left: Info */}
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl shrink-0 ${req.basvuru_kanali === 'Aranma Talebi' ? 'bg-blue-50 text-blue-600' :
                                    req.basvuru_kanali === 'Web Başvuru' ? 'bg-green-50 text-green-600' :
                                        'bg-purple-50 text-purple-600'
                                    }`}>
                                    {getIcon(req.basvuru_kanali || '')}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-gray-900">{req.ad_soyad}</h3>
                                        <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{req.telefon}</span>
                                        {req.tc_kimlik && <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{req.tc_kimlik}</span>}
                                    </div>
                                    <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                                        <span className="flex items-center gap-1">
                                            <Globe className="w-3 h-3" />
                                            {req.basvuru_kanali}
                                        </span>
                                        <span className="text-gray-300">|</span>
                                        <span className="italic">{req.aciklama_uzun || 'Açıklama yok'}</span>
                                        {req.talep_edilen_urun && (
                                            <>
                                                <span className="text-gray-300">|</span>
                                                <span className="font-semibold text-indigo-600">{req.talep_edilen_urun}</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-2">
                                        {new Date(req.created_at || '').toLocaleString('tr-TR')} tarihinde oluşturuldu
                                    </div>
                                </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <Button
                                    onClick={() => handleConvert(req)}
                                    className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"
                                >
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Başvuru Oluştur
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleDelete(req.id)}
                                    className="bg-white border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>

                        </div>
                    ))}
                </div>
            )}

            {/* Modal for Editing (CustomerCard) */}
            {selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedRequest(null)} />
                    <div className="relative bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex justify-between items-center">
                            <h2 className="text-lg font-bold">Müşteri Kartı Düzenle</h2>
                            <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                <XCircle className="w-6 h-6 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-1">
                            {/* We reuse the CustomerCard component */}
                            <CustomerCard
                                initialData={selectedRequest}
                                onSave={() => {
                                    setSelectedRequest(null);
                                    fetchData(); // Refresh list to remove if status changed
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
