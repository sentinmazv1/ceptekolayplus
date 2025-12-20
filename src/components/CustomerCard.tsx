'use client';

import { useState } from 'react';
import { Customer, LeadStatus } from '@/lib/types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Loader2, AlertCircle, CheckCircle, Info, Phone } from 'lucide-react';

interface CustomerCardProps {
    initialData: Customer;
    onSave?: (updated: Customer) => void;
    isNew?: boolean;
}

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
    { value: 'Yeni', label: 'Yeni' },
    { value: 'Aranacak', label: 'Aranacak' },
    { value: 'Ulaşılamadı', label: 'Ulaşılamadı' },
    { value: 'Meşgul/Hattı kapalı', label: 'Meşgul/Hattı kapalı' },
    { value: 'Yanlış numara', label: 'Yanlış numara' },
    { value: 'Daha sonra aranmak istiyor', label: 'Daha sonra aranmak istiyor' },
    { value: "WhatsApp'tan bilgi istiyor", label: "WhatsApp'tan bilgi istiyor" },
    { value: 'E-Devlet paylaşmak istemedi', label: 'E-Devlet paylaşmak istemedi' },
    { value: 'Başvuru alındı', label: 'Başvuru alındı (Yönetici Onayında)' },
    { value: 'Mağazaya davet edildi', label: 'Mağazaya davet edildi' },
    { value: 'Kefil bekleniyor', label: 'Kefil bekleniyor' },
    { value: 'Eksik evrak bekleniyor', label: 'Eksik evrak bekleniyor' },
    { value: 'Teslim edildi', label: 'Teslim edildi' },
    { value: 'Satış yapıldı/Tamamlandı', label: 'Satış yapıldı/Tamamlandı' },
    { value: 'Reddetti', label: 'Reddetti' },
    { value: 'Uygun değil', label: 'Uygun değil' },
    { value: 'İptal/Vazgeçti', label: 'İptal/Vazgeçti' },
    { value: 'Onaylandı', label: 'Onaylandı' },
];

const YES_NO_OPTIONS = [
    { value: '', label: 'Seçiniz...' },
    { value: 'Evet', label: 'Evet' },
    { value: 'Hayır', label: 'Hayır' }
];

export function CustomerCard({ initialData, onSave, isNew = false }: CustomerCardProps) {
    const [data, setData] = useState<Customer>(initialData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (field: keyof Customer, value: any) => {
        setData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setError(null);
        setLoading(true);

        // Validation
        if (!data.ad_soyad || !data.telefon || !data.tc_kimlik) {
            setError('Ad Soyad, Telefon ve TC Kimlik zorunludur.');
            setLoading(false);
            return;
        }

        if (data.durum === 'Daha sonra aranmak istiyor' && !data.sonraki_arama_zamani) {
            setError('"Daha sonra aranmak istiyor" durumu için Sonraki Arama Zamanı zorunludur.');
            setLoading(false);
            return;
        }

        // Validate delivery fields when marking as delivered
        if ((data.durum === 'Teslim edildi' || data.durum === 'Satış yapıldı/Tamamlandı') && (!data.urun_seri_no || !data.urun_imei)) {
            setError('Teslimat tamamlamak için Ürün Seri No ve IMEI zorunludur.');
            setLoading(false);
            return;
        }

        // Guarantor Validation
        // Only enforce if the sales rep is re-submitting for approval ('Başvuru alındı')
        if (data.onay_durumu === 'Kefil İstendi' && data.durum === 'Başvuru alındı') {
            if (!data.kefil_ad_soyad || !data.kefil_telefon || !data.kefil_tc_kimlik) {
                setError('Kefil İstendiği ve onay süreci için; Kefil Ad Soyad, Telefon ve TC Kimlik zorunludur.');
                setLoading(false);
                return;
            }
        }

        try {
            // Auto-fill delivery tracking if marking as delivered
            const updateData = { ...data };
            if ((data.durum === 'Teslim edildi' || data.durum === 'Satış yapıldı/Tamamlandı') && !data.teslim_tarihi) {
                updateData.teslim_tarihi = new Date().toISOString();
                updateData.teslim_eden = data.sahip || 'Unknown';
            }

            const url = isNew ? '/api/leads/create' : `/api/leads/${data.id}`;
            const method = isNew ? 'POST' : 'PUT';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (!res.ok) {
                const errJson = await res.json();
                throw new Error(errJson.message || 'Bir hata oluştu');
            }

            const json = await res.json();

            if (isNew) {
                alert('Müşteri başarıyla oluşturuldu!');
                // Reset form or redirect handled by parent usually, but here we just update local state if we want to continue editing
                if (onSave) onSave(json.lead);
            } else {
                setData(json.lead); // Update local state with server response
                if (onSave) onSave(json.lead);
                alert('Kaydedildi!');
            }
        } catch (err: any) {
            setError(err.message || 'Kaydedilemedi. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white shadow rounded-lg max-w-4xl mx-auto border border-gray-200 overflow-hidden">
            {/* Admin Feedback Header */}
            {data.onay_durumu && (
                <div className={`p-4 border-b ${data.onay_durumu === 'Onaylandı' ? 'bg-green-50 border-green-200' :
                    data.onay_durumu === 'Reddedildi' ? 'bg-red-50 border-red-200' :
                        data.onay_durumu === 'Kefil İstendi' ? 'bg-yellow-50 border-yellow-200' :
                            'bg-gray-50 border-gray-200'
                    }`}>
                    <div className="flex items-start gap-3">
                        {data.onay_durumu === 'Onaylandı' ? <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" /> :
                            data.onay_durumu === 'Reddedildi' ? <AlertCircle className="w-6 h-6 text-red-600 mt-0.5" /> :
                                <Info className="w-6 h-6 text-yellow-600 mt-0.5" />}

                        <div className="flex-1">
                            <h3 className={`font-semibold text-lg ${data.onay_durumu === 'Onaylandı' ? 'text-green-800' :
                                data.onay_durumu === 'Reddedildi' ? 'text-red-800' :
                                    'text-yellow-800'
                                }`}>
                                Başvuru Durumu: {data.onay_durumu}
                            </h3>

                            {data.kredi_limiti && (
                                <p className="mt-1 font-medium text-green-700">
                                    💰 Onaylanan Limit: {data.kredi_limiti}
                                </p>
                            )}

                            {data.admin_notu && (
                                <div className="mt-2 text-sm p-2 bg-white/60 rounded border border-gray-200/50">
                                    <span className="font-semibold text-gray-700">Yönetici Notu:</span> {data.admin_notu}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 flex justify-between items-center">
                    {isNew ? 'Yeni Müşteri Kaydı' : 'Müşteri Kartı'}
                    {!isNew && <span className="text-sm font-normal text-gray-500">ID: {data.id.slice(0, 8)}...</span>}
                </h2>

                {error && (
                    <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Temel Bilgiler */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 bg-gray-50 p-2 rounded mb-3 flex justify-between items-center">
                            <span>👤 Kimlik, İletişim ve Kanal</span>
                            {data.cekilme_zamani && (
                                <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                    Aranma Zamanı: {new Date(data.cekilme_zamani).toLocaleString('tr-TR')}
                                </span>
                            )}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Ad Soyad *"
                                value={data.ad_soyad || ''}
                                onChange={(e) => handleChange('ad_soyad', e.target.value)}
                            />
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <Input
                                        label="Telefon *"
                                        value={data.telefon || ''}
                                        onChange={(e) => handleChange('telefon', e.target.value)}
                                        placeholder="05XX..."
                                    />
                                </div>
                                {data.telefon && (
                                    <a
                                        href={`tel:${data.telefon}`}
                                        className="mb-[2px] h-[42px] px-4 flex items-center justify-center bg-green-100 text-green-700 rounded-lg border border-green-200 hover:bg-green-200 transition-colors"
                                        title="PC'den Ara"
                                    >
                                        <Phone className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                            <Input
                                label="TC Kimlik *"
                                value={data.tc_kimlik || ''}
                                onChange={(e) => handleChange('tc_kimlik', e.target.value)}
                                maxLength={11}
                            />
                            <Input
                                label="Winner Müşteri No"
                                value={data.winner_musteri_no || ''}
                                onChange={(e) => handleChange('winner_musteri_no', e.target.value)}
                                placeholder="Opsiyonel"
                            />
                            <Select
                                label="Başvuru Kanalı"
                                value={data.basvuru_kanali || ''}
                                onChange={(e) => handleChange('basvuru_kanali', e.target.value)}
                                options={[
                                    { value: '', label: 'Seçiniz...' },
                                    { value: 'Sosyal Medya', label: 'Sosyal Medya' },
                                    { value: 'Whatsapp Hattı', label: 'Whatsapp Hattı' },
                                    { value: 'Sabit Hat', label: 'Sabit Hat' },
                                    { value: 'Mağazadan', label: 'Mağazadan' }
                                ]}
                            />
                            <Input
                                label="Şehir"
                                value={data.sehir || ''}
                                onChange={(e) => handleChange('sehir', e.target.value)}
                            />
                            <Input
                                label="E-Devlet Şifre"
                                value={data.e_devlet_sifre || ''}
                                onChange={(e) => handleChange('e_devlet_sifre', e.target.value)}
                                placeholder="Müşteriden alınan şifre"
                            />
                        </div>
                    </section>

                    {/* Takip Durumu */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 bg-gray-50 p-2 rounded mb-3">📌 Takip Durumu</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select
                                label="Durum"
                                value={data.durum}
                                onChange={(e) => handleChange('durum', e.target.value)}
                                options={STATUS_OPTIONS}
                            />
                            <Input
                                type="datetime-local"
                                label="Sonraki Arama Zamanı"
                                value={data.sonraki_arama_zamani || ''}
                                onChange={(e) => handleChange('sonraki_arama_zamani', e.target.value)}
                            />
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kısa Not (Takip Notu)</label>
                                <input
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={data.arama_not_kisa || ''}
                                    onChange={(e) => handleChange('arama_not_kisa', e.target.value)}
                                    placeholder="Örn: Müsait değil, yarın aranacak"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Talep Edilen Ürün */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 bg-gray-50 p-2 rounded mb-3">🛍️ Talep Bilgileri (Yeni)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Talep Edilen Ürün"
                                value={data.talep_edilen_urun || ''}
                                onChange={(e) => handleChange('talep_edilen_urun', e.target.value)}
                                placeholder="Örn: iPhone 15 Pro 128GB"
                            />
                            <Input
                                label="Talep Edilen Tutar (TL)"
                                type="number"
                                value={data.talep_edilen_tutar || ''}
                                onChange={(e) => handleChange('talep_edilen_tutar', Number(e.target.value))}
                                placeholder="Örn: 50000"
                            />
                        </div>
                    </section>

                    {/* İş ve Gelir Durumu */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 bg-gray-50 p-2 rounded mb-3">💼 İş ve Gelir Durumu</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                label="Meslek / İş"
                                value={data.meslek_is || ''}
                                onChange={(e) => handleChange('meslek_is', e.target.value)}
                            />
                            <Input
                                label="Son Yatan Maaş"
                                value={data.son_yatan_maas || ''}
                                onChange={(e) => handleChange('son_yatan_maas', e.target.value)}
                                placeholder="Örn: 25.000 TL"
                            />
                            <Input
                                label="Aynı İşyerinde Süre (Ay)"
                                value={data.ayni_isyerinde_sure_ay || ''}
                                onChange={(e) => handleChange('ayni_isyerinde_sure_ay', e.target.value)}
                                placeholder="Örn: 12"
                            />
                        </div>
                    </section>

                    {/* Varlıklar */}
                    <section>
                        <h3 className="text-sm font-semibold text-gray-900 bg-gray-50 p-2 rounded mb-3">🏠 Varlıklar</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Select
                                label="Mülkiyet Durumu"
                                value={data.mulkiyet_durumu || ''}
                                onChange={(e) => handleChange('mulkiyet_durumu', e.target.value)}
                                options={[
                                    { value: '', label: 'Seçiniz...' },
                                    { value: 'Kira', label: 'Kira' },
                                    { value: 'Kendi Evi', label: 'Kendi Evi' },
                                    { value: 'Aile mülkü', label: 'Aile mülkü' }
                                ]}
                            />

                            <div className="space-y-2">
                                <Select
                                    label="Araç Var mı?"
                                    value={data.arac_varmi || ''}
                                    onChange={(e) => handleChange('arac_varmi', e.target.value)}
                                    options={YES_NO_OPTIONS}
                                />
                                {data.arac_varmi === 'Evet' && (
                                    <Input
                                        label="Araç Detayı"
                                        value={data.arac_detay || ''}
                                        onChange={(e) => handleChange('arac_detay', e.target.value)}
                                        placeholder="Marka/Model/Yıl"
                                        className="bg-blue-50/50"
                                    />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Select
                                    label="Tapu Var mı?"
                                    value={data.tapu_varmi || ''}
                                    onChange={(e) => handleChange('tapu_varmi', e.target.value)}
                                    options={YES_NO_OPTIONS}
                                />
                                {data.tapu_varmi === 'Evet' && (
                                    <Input
                                        label="Tapu Detayı"
                                        value={data.tapu_detay || ''}
                                        onChange={(e) => handleChange('tapu_detay', e.target.value)}
                                        placeholder="Arsa/Tarla/Ev detay"
                                        className="bg-blue-50/50"
                                    />
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Yasal & E-Devlet Sorgusu */}
                    <section className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                        <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            ⚖️ E-Devlet & Yasal Sorgu
                            <span className="text-xs font-normal text-blue-600 bg-blue-100 px-2 py-0.5 rounded">Detaylı İnceleme</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <Select
                                label="Hizmet Dökümü Var mı?"
                                value={data.hizmet_dokumu_varmi || ''}
                                onChange={(e) => handleChange('hizmet_dokumu_varmi', e.target.value)}
                                options={YES_NO_OPTIONS}
                            />

                            {/* Psikoteknik - NEW */}
                            <div className="space-y-2">
                                <Select
                                    label="Psikoteknik Raporu"
                                    value={data.psikoteknik_varmi || ''}
                                    onChange={(e) => handleChange('psikoteknik_varmi', e.target.value)}
                                    options={YES_NO_OPTIONS}
                                />
                                {data.psikoteknik_varmi === 'Evet' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Psikoteknik Notu</label>
                                        <textarea
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[60px]"
                                            value={data.psikoteknik_notu || ''}
                                            onChange={(e) => handleChange('psikoteknik_notu', e.target.value)}
                                            placeholder="Psikoteknik raporu hakkında notlar..."
                                        />
                                    </div>
                                )}
                            </div>

                            <Select
                                label="İkametgah Var mı?"
                                value={data.ikametgah_varmi || ''}
                                onChange={(e) => handleChange('ikametgah_varmi', e.target.value)}
                                options={YES_NO_OPTIONS}
                            />

                            <div className="space-y-2">
                                <Select
                                    label="Dava Dosyası?"
                                    value={data.dava_dosyasi_varmi || ''}
                                    onChange={(e) => handleChange('dava_dosyasi_varmi', e.target.value)}
                                    options={YES_NO_OPTIONS}
                                />
                                {data.dava_dosyasi_varmi === 'Evet' && (
                                    <Input
                                        label="Dava Detayı"
                                        value={data.dava_detay || ''}
                                        onChange={(e) => handleChange('dava_detay', e.target.value)}
                                        placeholder="Dosya içeriği/durumu"
                                        className="bg-white"
                                    />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Select
                                    label="Gizli Dosya?"
                                    value={data.gizli_dosya_varmi || ''}
                                    onChange={(e) => handleChange('gizli_dosya_varmi', e.target.value)}
                                    options={YES_NO_OPTIONS}
                                />
                                {data.gizli_dosya_varmi === 'Evet' && (
                                    <Input
                                        label="Gizli Dosya Detayı"
                                        value={data.gizli_dosya_detay || ''}
                                        onChange={(e) => handleChange('gizli_dosya_detay', e.target.value)}
                                        placeholder="Detaylar"
                                        className="bg-white"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            <div className="space-y-2">
                                <Select
                                    label="Açık İcra Var mı?"
                                    value={data.acik_icra_varmi || ''}
                                    onChange={(e) => handleChange('acik_icra_varmi', e.target.value)}
                                    options={YES_NO_OPTIONS}
                                />
                                {data.acik_icra_varmi === 'Evet' && (
                                    <Input
                                        label="Açık İcra Detayı"
                                        value={data.acik_icra_detay || ''}
                                        onChange={(e) => handleChange('acik_icra_detay', e.target.value)}
                                        placeholder="Tutar/Dosya No"
                                        className="bg-white"
                                    />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Select
                                    label="Kapalı İcra Var mı?"
                                    value={data.kapali_icra_varmi || ''}
                                    onChange={(e) => handleChange('kapali_icra_varmi', e.target.value)}
                                    options={YES_NO_OPTIONS}
                                />
                                {data.kapali_icra_varmi === 'Evet' && (
                                    <Input
                                        label="Kapalı İcra Kapanış/Detay"
                                        value={data.kapali_icra_kapanis_sekli || ''}
                                        onChange={(e) => handleChange('kapali_icra_kapanis_sekli', e.target.value)}
                                        placeholder="Ödeme, Feragat vb."
                                        className="bg-white"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="UYAP/Avukat Sorgu Durumu"
                                value={data.avukat_sorgu_durumu || ''}
                                onChange={(e) => handleChange('avukat_sorgu_durumu', e.target.value)}
                                placeholder="Yapıldı / Yapılmadı"
                            />
                            <Input
                                label="Sorgu Sonucu / Notlar"
                                value={data.avukat_sorgu_sonuc || ''}
                                onChange={(e) => handleChange('avukat_sorgu_sonuc', e.target.value)}
                                placeholder="Örn: Riskli bir durum görünmüyor"
                            />
                        </div>
                    </section>

                    {/* Kefil Bilgileri (Yeni Phase 3) */}
                    <section className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 mt-4">
                        <h3 className="text-sm font-semibold text-orange-900 mb-3 flex items-center gap-2">
                            🤝 Kefil Bilgileri (Gerekiyorsa)
                            {data.onay_durumu === 'Kefil İstendi' && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">Zorunlu!</span>
                            )}
                        </h3>

                        {/* Temel Kefil Bilgileri */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <Input
                                label="Kefil Ad Soyad"
                                value={data.kefil_ad_soyad || ''}
                                onChange={(e) => handleChange('kefil_ad_soyad', e.target.value)}
                            />
                            <Input
                                label="Kefil Telefon"
                                value={data.kefil_telefon || ''}
                                onChange={(e) => handleChange('kefil_telefon', e.target.value)}
                            />
                            <Input
                                label="Kefil TC Kimlik"
                                value={data.kefil_tc_kimlik || ''}
                                onChange={(e) => handleChange('kefil_tc_kimlik', e.target.value)}
                                maxLength={11}
                            />
                            <Input
                                label="Kefil E-Devlet Şifre"
                                value={data.kefil_e_devlet_sifre || ''}
                                onChange={(e) => handleChange('kefil_e_devlet_sifre', e.target.value)}
                            />
                        </div>

                        {/* Kefil İş & Gelir */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <Input
                                label="Kefil Meslek"
                                value={data.kefil_meslek_is || ''}
                                onChange={(e) => handleChange('kefil_meslek_is', e.target.value)}
                            />
                            <Input
                                label="Kefil Maaş"
                                value={data.kefil_son_yatan_maas || ''}
                                onChange={(e) => handleChange('kefil_son_yatan_maas', e.target.value)}
                            />
                            <Input
                                label="Kefil Çalışma Süresi (Ay)"
                                value={data.kefil_ayni_isyerinde_sure_ay || ''}
                                onChange={(e) => handleChange('kefil_ayni_isyerinde_sure_ay', e.target.value)}
                            />
                        </div>

                        {/* Kefil Yasal Durum */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Select
                                label="Kefil İkametgah?"
                                value={data.kefil_ikametgah_varmi || ''}
                                onChange={(e) => handleChange('kefil_ikametgah_varmi', e.target.value)}
                                options={YES_NO_OPTIONS}
                            />
                            <Select
                                label="Kefil Hizmet Dökümü?"
                                value={data.kefil_hizmet_dokumu_varmi || ''}
                                onChange={(e) => handleChange('kefil_hizmet_dokumu_varmi', e.target.value)}
                                options={YES_NO_OPTIONS}
                            />
                            <Select
                                label="Kefil İcra Var mı?"
                                value={data.kefil_acik_icra_varmi || ''}
                                onChange={(e) => handleChange('kefil_acik_icra_varmi', e.target.value)}
                                options={YES_NO_OPTIONS}
                            />
                            <Select
                                label="Kefil Tapu/Araç?"
                                value={data.kefil_tapu_varmi || ''}
                                onChange={(e) => handleChange('kefil_tapu_varmi', e.target.value)}
                                options={YES_NO_OPTIONS}
                            />
                        </div>
                    </section>

                    {/* Delivery Tracking Section - Show only if approved or invited */}
                    {(data.onay_durumu === 'Onaylandı' || data.durum === 'Mağazaya davet edildi' || data.durum === 'Başvuru alındı' || data.durum === 'Teslim edildi') && (
                        <div className="border-t pt-4 mt-4">
                            <h3 className="text-sm font-semibold mb-3 text-gray-700 flex items-center gap-2">
                                📦 Ürün Teslimat Bilgileri
                                {data.onay_durumu === 'Onaylandı' && data.kredi_limiti && (
                                    <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                                        Onaylı Limit: {data.kredi_limiti}
                                    </span>
                                )}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Ürün Seri No"
                                    value={data.urun_seri_no || ''}
                                    onChange={(e) => handleChange('urun_seri_no', e.target.value)}
                                    placeholder="Örn: ABC123456789"
                                />
                                <Input
                                    label="IMEI Numarası"
                                    value={data.urun_imei || ''}
                                    onChange={(e) => handleChange('urun_imei', e.target.value)}
                                    placeholder="Örn: 123456789012345"
                                    maxLength={15}
                                />
                            </div>
                            <div className="mt-3 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
                                💡 <strong>Bilgi:</strong> Ürün seri numarası ve IMEI'yi girdikten sonra durumu "Teslim edildi" yaparak teslimatı tamamlayabilirsiniz.
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-4 flex justify-end sticky bottom-0 bg-white p-4 border-t shadow-lg md:shadow-none md:relative">
                        <Button onClick={handleSave} isLoading={loading} className="w-full md:w-auto">
                            {isNew ? 'Müşteriyi Kaydet' : 'Değişiklikleri Kaydet'}
                        </Button>
                    </div>
                </div>
            </div >
        </div >
    );
}
