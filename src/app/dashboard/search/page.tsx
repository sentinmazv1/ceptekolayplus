'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, Loader2, Calendar, Phone, Clock, User, FileText, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
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
    sahip?: string;

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
    const [tc, setTc] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SearchResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tc || tc.length < 11) {
            setError('Geçerli bir TC Kimlik No giriniz.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        setSearched(false);

        try {
            const res = await fetch(`/api/customers/search?tc=${tc}`);
            const json = await res.json();

            if (json.success) {
                if (json.found) {
                    setResult(json.customer);
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

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2">
                <Search className="w-6 h-6 text-indigo-600" />
                Müşteri Sorgulama
            </h1>

            {/* Search Box */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            TC Kimlik Numarası
                        </label>
                        <input
                            type="text"
                            maxLength={11}
                            value={tc}
                            onChange={(e) => setTc(e.target.value.replace(/\D/g, ''))}
                            placeholder="11 haneli TC no giriniz"
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
            {searched && !result && !error && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Kayıt Bulunamadı</h3>
                    <p className="text-gray-500">Bu TC numarasına ait bir başvuru sistemde kayıtlı değil.</p>
                </div>
            )}

            {/* Result Card */}
            {result && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Header */}
                    <div className="bg-gray-50 p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl font-bold text-gray-900">{result.ad_soyad}</h2>
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(result.onay_durumu || result.durum)}`}>
                                    {result.onay_durumu || result.durum}
                                </span>
                            </div>
                            <p className="text-gray-500 flex items-center gap-2">
                                <span className="font-mono bg-gray-200 px-2 py-0.5 rounded text-xs text-gray-700">ID: {result.id.slice(0, 8)}</span>
                                <span className="text-gray-300">|</span>
                                <span className="text-sm">Oluşturma: {formatDate(result.created_at)}</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Son İşlem</p>
                            <p className="font-medium text-gray-900">{formatDate(result.updated_at)}</p>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Left Column: Application Details */}
                        <div className="space-y-6">
                            <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
                                <h3 className="text-sm font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Başvuru Detayları
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between border-b border-indigo-100 pb-2">
                                        <span className="text-gray-600">Talep Edilen Ürün</span>
                                        <span className="font-medium text-gray-900">{result.talep_edilen_urun || '-'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-indigo-100 pb-2">
                                        <span className="text-gray-600">Talep Tutarı</span>
                                        <span className="font-medium text-gray-900">
                                            {result.talep_edilen_tutar ? `${result.talep_edilen_tutar.toLocaleString('tr-TR')} ₺` : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Kanal</span>
                                        <span className="font-medium text-gray-900">{result.basvuru_kanali || 'Bilinmiyor'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <User className="w-4 h-4" /> Temsilci Notları
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">İlgilenen Temsilci</p>
                                        <p className="font-medium text-gray-900 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            {result.sahip || 'Henüz atanmadı'}
                                        </p>
                                    </div>
                                    {(result.arama_not_kisa || result.aciklama_uzun) ? (
                                        <div className="bg-white p-3 rounded border border-gray-200 text-sm text-gray-700 italic">
                                            "{result.arama_not_kisa || result.aciklama_uzun}"
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">Henüz not girilmemiş.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Interaction & Status */}
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-orange-500" /> Zaman Çizelgesi & İletişim
                                </h3>
                                <div className="space-y-4 relative pl-4 border-l-2 border-gray-100">
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
                                        <p className="text-xs text-gray-500">Çekilme / Aranma Zamanı</p>
                                        <p className="font-medium text-gray-900">{formatDate(result.cekilme_zamani)}</p>
                                    </div>
                                    <div className="relative">
                                        <div className={`absolute -left-[21px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${result.son_arama_zamani ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <p className="text-xs text-gray-500">Son Başarılı Arama</p>
                                        <p className="font-medium text-gray-900">{formatDate(result.son_arama_zamani) || 'Aranmadı'}</p>
                                    </div>
                                    {result.sonraki_arama_zamani && (
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-purple-500 border-2 border-white shadow-sm"></div>
                                            <p className="text-xs text-gray-500">Planlanan Arama</p>
                                            <p className="font-medium text-gray-900">{formatDate(result.sonraki_arama_zamani)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Admin Feedback Section */}
                            {(result.onay_durumu || result.kredi_limiti) && (
                                <div className={`p-4 rounded-lg border ${result.onay_durumu === 'Onaylandı' ? 'bg-green-50 border-green-200' :
                                        result.onay_durumu === 'Reddedildi' ? 'bg-red-50 border-red-200' :
                                            'bg-yellow-50 border-yellow-200'
                                    }`}>
                                    <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${result.onay_durumu === 'Onaylandı' ? 'text-green-800' :
                                            result.onay_durumu === 'Reddedildi' ? 'text-red-800' :
                                                'text-yellow-800'
                                        }`}>
                                        {result.onay_durumu === 'Onaylandı' ? <CheckCircle className="w-4 h-4" /> :
                                            result.onay_durumu === 'Reddedildi' ? <XCircle className="w-4 h-4" /> :
                                                <AlertCircle className="w-4 h-4" />}
                                        Yönetici Kararı
                                    </h3>

                                    <div className="space-y-2">
                                        {result.kredi_limiti && (
                                            <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                                                <span className="text-sm font-medium opacity-80">Onaylanan Limit</span>
                                                <span className="text-lg font-bold">{result.kredi_limiti}</span>
                                            </div>
                                        )}
                                        {result.admin_notu && (
                                            <div className="mt-2 text-sm italic opacity-90 border-t border-black/5 pt-2">
                                                " {result.admin_notu} "
                                            </div>
                                        )}
                                        {result.onay_durumu === 'Kefil İstendi' && (
                                            <div className="text-xs bg-white/80 p-2 rounded text-orange-800 font-medium">
                                                ⚠️ Bu başvuru için kefil bilgileri bekleniyor.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
