'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, Loader2, Calendar, Phone, Clock, User, FileText, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { CustomerCard } from '@/components/CustomerCard';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface SearchResult {
    id: string;
    ad_soyad: string;
    tc_kimlik: string;
    telefon: string;
    durum: string;
    created_at?: string;
    updated_at?: string;
    sahip?: string | null;

    // Call Details
    cekilme_zamani?: string;
    son_arama_zamani?: string;
    sonraki_arama_zamani?: string;

    // Product Details
    talep_edilen_urun?: string;
    talep_edilen_tutar?: number;
    basvuru_kanali?: string;

    // Notes
    arama_not_kisa?: string;
    aciklama_uzun?: string;

    // Admin
    onay_durumu?: string;
    admin_notu?: string;
    kredi_limiti?: string;
}

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query || query.length < 2) {
            setError('En az 2 karakter giriniz.');
            return;
        }

        setLoading(true);
        setError(null);
        setResults([]);
        setSelectedResult(null);
        setSearched(false);

        try {
            const res = await fetch(`/api/customers/search?q=${encodeURIComponent(query)}`);
            const json = await res.json();

            if (json.success) {
                if (json.customers && json.customers.length > 0) {
                    setResults(json.customers);
                    if (json.customers.length === 1) {
                        setSelectedResult(json.customers[0]);
                    }
                }
                setSearched(true);
            } else {
                setError(json.message || 'Bir hata oluştu.');
            }
        } catch (err) {
            setError('Bağlantı hatası.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (d?: string) => {
        if (!d) return '-';
        try {
            return format(new Date(d), 'd MMMM yyyy HH:mm', { locale: tr });
        } catch {
            return d;
        }
    };

    const getStatusColor = (status: string) => {
        if (['Onaylandı', 'Satış yapıldı/Tamamlandı', 'Teslim edildi'].includes(status)) return 'text-green-600 bg-green-50 border-green-200';
        if (['Reddedildi', 'Reddetti', 'İptal/Vazgeçti'].includes(status)) return 'text-red-600 bg-red-50 border-red-200';
        if (['Kefil bekleniyor', 'Kefil İstendi', 'Onaya gönderildi'].includes(status)) return 'text-orange-600 bg-orange-50 border-orange-200';
        return 'text-blue-600 bg-blue-50 border-blue-200';
    };

    const handleBackToList = () => {
        setSelectedResult(null);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 pb-32">
            <h1 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2">
                <Search className="w-6 h-6 text-indigo-600" />
                Müşteri Sorgulama
            </h1>

            {/* Search Box */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Arama (İsim, Telefon veya TC)
                        </label>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ad Soyad, Telefon veya TC giriniz"
                            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <Button type="submit" isLoading={loading} size="lg" className="h-[52px] px-8 text-lg">
                        Sorgula
                    </Button>
                </form>
                {error && <p className="mt-3 text-red-600 bg-red-50 p-2 rounded">{error}</p>}
            </div>

            {/* No Result State */}
            {searched && results.length === 0 && !error && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Kayıt Bulunamadı</h3>
                    <p className="text-gray-500">Aramanızla eşleşen müşteri bulunamadı.</p>
                </div>
            )}

            {/* Results List */}
            {searched && results.length > 1 && !selectedResult && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-700">{results.length} Kayıt Bulundu</h3>
                        <span className="text-xs text-gray-500">Detay için seçiniz</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {results.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedResult(item)}
                                className="p-4 hover:bg-indigo-50 cursor-pointer transition-colors flex justify-between items-center group"
                            >
                                <div>
                                    <h4 className="font-bold text-gray-900 mb-1 group-hover:text-indigo-700">{item.ad_soyad || 'İsimsiz'}</h4>
                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                        <span>{item.telefon}</span>
                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                        <span>{item.tc_kimlik}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(item.durum)}`}>{item.durum}</span>
                                    <span className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm">Seç &rarr;</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Detail View / Edit Card */}
            {selectedResult && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 mb-16">
                    {/* Back Button if came from list */}
                    {results.length > 1 && (
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <button onClick={handleBackToList} className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1">
                                &larr; Listeye Dön
                            </button>
                            <span className="text-xs text-gray-400">Düzenleme Modu</span>
                        </div>
                    )}

                    <div className="p-0">
                        {/* We need to cast SearchResult to Customer because SearchResult might be slightly different 
                             or strictly defined in this file. Looking at interfaces, they are compatible enough 
                             or we might need to fetch full customer data.
                             Actually SearchResult interface in this file mirrors Customer but has optional fields.
                             Let's pass it as any or cast to Customer.
                         */}
                        <CustomerCard
                            initialData={selectedResult as any}
                            onSave={async (updatedLead) => {
                                // Update the result in the list locally
                                setResults(prev => prev.map(r => r.id === updatedLead.id ? { ...r, ...updatedLead } : r));
                                setSelectedResult(updatedLead as any);
                                alert('Kayıt güncellendi!');
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
