'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Customer } from '@/lib/types';
import { Loader2, Inbox, Phone, Globe, HelpCircle, CheckCircle, XCircle, ChevronRight, UserPlus, Trash2, Plus } from 'lucide-react';
import { CustomerCard } from '@/components/CustomerCard';

export default function RequestsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<Customer[]>([]);
    const [activeTab, setActiveTab] = useState<'ALL' | 'Aranma Talebi' | 'Web Başvuru' | 'Durum Sorgulama' | 'HISTORY'>('ALL');
    const [selectedRequest, setSelectedRequest] = useState<Customer | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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

    const handleClose = async (id: string) => {
        if (!confirm('Bu talebi kapatmak istediğinize emin misiniz? (Geçmiş sekmesinden görebilirsiniz)')) return;
        try {
            // Update status to 'TALEP_KAPATILDI' instead of full delete
            const res = await fetch(`/api/customers/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ durum: 'TALEP_KAPATILDI' })
            });

            if (res.ok) {
                // If in history tab, we might want to keep it? No, usually we refresh or just kept it?
                // If we are in 'Pending' tabs, we remove it from view.
                // If we are in 'History', we might keep it.
                // Simplest: Update local state.
                setRequests(prev => prev.map(p => p.id === id ? { ...p, durum: 'TALEP_KAPATILDI' } : p));
            } else {
                alert('Kapatılamadı');
            }
        } catch (e) {
            alert('Hata');
        }
    };

    // Filter Logic
    const filtered = requests.filter(r => {
        // If Active Tab is HISTORY, show only closed. Else show only PENDING.
        const isHistory = activeTab === 'HISTORY';
        const isClosed = r.durum === 'TALEP_KAPATILDI';

        if (isHistory) {
            return isClosed;
        } else {
            // Normal Tabs
            if (isClosed) return false; // Don't show closed in normal tabs
            if (activeTab === 'ALL') return true;
            return r.basvuru_kanali === activeTab;
        }
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
                    <Button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Yeni Talep
                    </Button>
                    <Button onClick={fetchData} disabled={loading} variant="ghost">
                        <CheckCircle className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
                    { id: 'HISTORY', label: 'Geçmiş', icon: XCircle, color: 'text-red-500' },
                ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    let count = 0;
                    if (tab.id === 'HISTORY') count = requests.filter(r => r.durum === 'TALEP_KAPATILDI').length;
                    else if (tab.id === 'ALL') count = requests.filter(r => r.durum !== 'TALEP_KAPATILDI').length;
                    else count = requests.filter(r => r.durum !== 'TALEP_KAPATILDI' && r.basvuru_kanali === tab.id).length;

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
                        <div key={req.id} className={`bg-white p-5 rounded-xl border hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 justify-between items-start md:items-center ${req.durum === 'TALEP_KAPATILDI' ? 'opacity-75 border-gray-100 bg-gray-50' : 'border-gray-200'}`}>

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
                                {activeTab !== 'HISTORY' && (
                                    <>
                                        <Button
                                            onClick={() => handleConvert(req)}
                                            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"
                                        >
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            Başvuru
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleClose(req.id)}
                                            className="bg-white border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Kapat
                                        </Button>
                                    </>
                                )}
                                {activeTab === 'HISTORY' && (
                                    <span className="text-sm font-bold text-gray-400 border border-gray-200 px-3 py-1 rounded-lg bg-gray-50">Kapatıldı</span>
                                )}
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

            {/* Modal for Adding New Request */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
                    <div className="relative bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">Yeni Talep Ekle</h3>
                            <button onClick={() => setIsAddModalOpen(false)}><XCircle className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <AddRequestForm
                            onClose={() => setIsAddModalOpen(false)}
                            onSuccess={(newReq) => {
                                setIsAddModalOpen(false);
                                setRequests([newReq, ...requests]);
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function AddRequestForm({ onClose, onSuccess }: { onClose: () => void, onSuccess: (req: Customer) => void }) {
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const data = {
            ad_soyad: formData.get('ad_soyad'),
            telefon: formData.get('telefon'),
            basvuru_kanali: formData.get('basvuru_kanali'),
            aciklama_uzun: formData.get('aciklama_uzun') || '',
            durum: 'TALEP_BEKLEYEN'
        };

        try {
            const res = await fetch('/api/leads/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const json = await res.json();
            if (json.success) {
                onSuccess(json.lead);
            } else {
                alert(json.message || 'Hata oluştu');
            }
        } catch (error) {
            alert('Bağlantı hatası');
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
                <input name="ad_soyad" required className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Müşteri Adı" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input name="telefon" required className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="05XX..." />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kaynak / Kanal</label>
                <select name="basvuru_kanali" className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="Aranma Talebi">Aranma Talebi</option>
                    <option value="Web Başvuru">Web Başvuru</option>
                    <option value="Durum Sorgulama">Durum Sorgulama</option>
                    <option value="Whatsapp">Whatsapp</option>
                    <option value="Telefon">Telefon (Gelen Arama)</option>
                    <option value="Mağaza">Mağaza Ziyareti</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Not / Açıklama</label>
                <textarea name="aciklama_uzun" className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 h-20" placeholder="Kısa not..." />
            </div>
            <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose} className="w-full">İptal</Button>
                <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                    {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
            </div>
        </form>
    );
}
