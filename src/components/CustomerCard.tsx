'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Customer, LeadStatus, InventoryItem, LogEntry } from '@/lib/types';
import { WHATSAPP_TEMPLATES } from '@/lib/whatsapp-templates';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Loader2, AlertCircle, CheckCircle, Info, Phone, Package, Smartphone, Search, RefreshCw, MessageSquare, Scale, UploadCloud, FileText, Image as ImageIcon, Briefcase, Home, ShieldCheck, X } from 'lucide-react';
import { cityList, getDistrictsByCityCode } from 'turkey-neighbourhoods';


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

const CANCELLATION_REASONS = [
    { value: 'Fiyat Yüksek', label: 'Fiyat Yüksek' },
    { value: 'İhtiyacı Kalmamış', label: 'İhtiyacı Kalmamış' },
    { value: 'Yanlışlıkla Başvurmuş', label: 'Yanlışlıkla Başvurmuş' },
    { value: 'Bilgilerini Paylaşmak İstemedi', label: 'Bilgilerini Paylaşmak İstemedi' },
    { value: 'Başka Yerden Almış', label: 'Başka Yerden Almış' },
    { value: 'Mağazamız Uzak Kaldı', label: 'Mağazamız Uzak Kaldı' },
    { value: 'Ödeme Yöntemlerini Beğenmedi', label: 'Ödeme Yöntemlerini Beğenmedi' },
    { value: 'Diğer', label: 'Diğer' }
];

export function CustomerCard({ initialData, onSave, isNew = false }: CustomerCardProps) {
    const { data: session } = useSession();
    const [data, setData] = useState<Customer>(initialData);

    // Sync state when initialData changes (e.g. Navigation in Admin Panel)
    useEffect(() => {
        setData(initialData);
        // Also refresh districts if city changed
        if (initialData.sehir) {
            const city = cityList.find(c => c.name === initialData.sehir);
            if (city) {
                setDistricts(getDistrictsByCityCode(city.code));
            }
        }
    }, [initialData]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // City/District Logic
    const [districts, setDistricts] = useState<string[]>([]);

    useEffect(() => {
        if (initialData.sehir) {
            const city = cityList.find(c => c.name === initialData.sehir);
            if (city) {
                const districtList = getDistrictsByCityCode(city.code);
                setDistricts(districtList);
            }
        }
    }, []); // Run once on mount

    const handleCityChange = (cityName: string) => {
        const city = cityList.find(c => c.name === cityName);
        if (city) {
            const districtList = getDistrictsByCityCode(city.code);
            setDistricts(districtList);
        } else {
            setDistricts([]);
        }
        setData(prev => ({ ...prev, sehir: cityName, ilce: '' }));
    };

    // Inventory State
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [stockItems, setStockItems] = useState<InventoryItem[]>([]);
    const [stockLoading, setStockLoading] = useState(false);

    const [stockSearch, setStockSearch] = useState('');

    // Logs State
    const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);

    // SMS Modal State
    const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
    const [smsMessage, setSmsMessage] = useState('');
    const [smsLoading, setSmsLoading] = useState(false);

    // WhatsApp Modal State
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [whatsAppMessage, setWhatsAppMessage] = useState('');
    const [whatsAppLoading, setWhatsAppLoading] = useState(false);



    const fetchLogs = async () => {
        setLogsLoading(true);
        try {
            const res = await fetch(`/api/logs?customerId=${data.id}`);
            if (res.ok) {
                const json = await res.json();
                setLogs(json.logs);
            }
        } catch (err) {
            console.error('Failed to fetch logs', err);
        } finally {
            setLogsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'history' && !isNew) {
            fetchLogs();
        }
    }, [activeTab]);

    const fetchStock = async () => {
        setStockLoading(true);
        try {
            const res = await fetch('/api/inventory?status=STOKTA');
            const json = await res.json();
            if (res.ok) {
                setStockItems(json.items);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setStockLoading(false);
        }
    };

    const handleStockAssign = async (item: InventoryItem) => {
        if (!confirm(`${item.marka} ${item.model} (${item.imei}) cihazını bu müşteriye atamak istediğinize emin misiniz?`)) return;

        setLoading(true); // Main loading
        try {
            const res = await fetch('/api/inventory/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inventoryId: item.id,
                    customerId: data.id
                })
            });

            const json = await res.json();
            if (res.ok) {
                // Update local state with new values
                const currentItems = data.satilan_urunler ? JSON.parse(data.satilan_urunler) : [];
                const newItem = {
                    imei: item.imei,
                    seri_no: item.seri_no,
                    marka: item.marka,
                    model: item.model,
                    satis_tarihi: new Date().toISOString()
                };
                const updatedItems = [...currentItems, newItem];

                setData(prev => ({
                    ...prev,
                    urun_imei: item.imei,
                    urun_seri_no: item.seri_no,
                    satilan_urunler: JSON.stringify(updatedItems),
                    durum: 'Teslim edildi', // Optional: Auto update status
                    teslim_tarihi: new Date().toISOString()
                }));
                setIsStockModalOpen(false);
                alert('Cihaz başarıyla atandı ve stoktan düşüldü.');
            } else {
                alert('Atama başarısız: ' + json.message);
            }
        } catch (err) {
            alert('Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: keyof Customer, value: any) => {
        setData((prev) => ({ ...prev, [field]: value }));
    };



    const handleSendSMS = async () => {
        if (!smsMessage) return;
        setSmsLoading(true);
        try {
            const res = await fetch('/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: data.id,
                    phone: data.telefon,
                    message: smsMessage
                })
            });

            const json = await res.json();
            if (res.ok && json.success) {
                alert(`SMS başarıyla gönderildi! (Kod: ${json.result})`);
                setIsSmsModalOpen(false);
                setSmsMessage('');
                fetchLogs();
            } else {
                alert(`SMS gönderilemedi: ${json.message}`);
            }
        } catch (error) {
            console.error('SMS Error:', error);
            alert('SMS gönderilirken hata oluştu.');
        } finally {
            setSmsLoading(false);
        }
    };

    const handleSendWhatsApp = async () => {
        if (!whatsAppMessage) return;
        setWhatsAppLoading(true);

        try {
            // 1. Format phone number (remove headers, ensure 90 prefix)
            let phone = data.telefon.replace(/\D/g, '');
            if (phone.startsWith('0')) phone = phone.substring(1);
            if (!phone.startsWith('90')) phone = '90' + phone;

            // 2. Open WhatsApp App directly
            const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(whatsAppMessage)}`;
            window.open(url, '_blank');

            // 3. Log Action in Background
            await fetch(`/api/logs/${data.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'SEND_WHATSAPP',
                    note: `WhatsApp message sent: ${whatsAppMessage.substring(0, 50)}...`
                })
            });

            setIsWhatsAppModalOpen(false);
            setWhatsAppMessage('');
            fetchLogs(); // Updates the log list to show the new badge

        } catch (error) {
            console.error('WhatsApp Error:', error);
            alert('WhatsApp başlatılırken hata oluştu.');
        } finally {
            setWhatsAppLoading(false);
        }
    };

    const handleLegalRequest = () => {
        if (!data.tc_kimlik) {
            alert('Müşterinin TC Kimlik Numarası eksik!');
            return;
        }

        const message = `Müşteri: ${data.ad_soyad}\nTC: ${data.tc_kimlik}`;
        const url = `https://wa.me/905541665347?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
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
            const now = new Date();

            if ((data.durum === 'Teslim edildi' || data.durum === 'Satış yapıldı/Tamamlandı') && !data.teslim_tarihi) {
                updateData.teslim_tarihi = now.toISOString();
                updateData.teslim_eden = data.sahip || 'Unknown';
            }

            // AUTO-UPDATE Call Time for "Call Activity" statuses
            // If the user marks as Unreachable/Busy/Wrong Number, it implies a call was made NOW.
            // We force update 'son_arama_zamani' to ensure it counts in stats.
            const callActivityStatuses = ['Ulaşılamadı', 'Meşgul/Hattı kapalı', 'Cevap Yok', 'Yanlış numara', 'Uygun değil', 'Kefil bekleniyor'];
            if (callActivityStatuses.includes(data.durum)) {
                // Only update if it wasn't updated in the last minute (avoid double update if phone button was used)
                const lastCall = data.son_arama_zamani ? new Date(data.son_arama_zamani).getTime() : 0;
                if (now.getTime() - lastCall > 60000) {
                    updateData.son_arama_zamani = now.toISOString();
                }
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
                    <div className="flex items-center gap-3">
                        {isNew ? 'Yeni Müşteri Kaydı' : 'Müşteri Kartı'}
                        {!isNew && session?.user?.role === 'ADMIN' && (
                            <button
                                onClick={() => setIsApprovalModalOpen(true)}
                                className="bg-indigo-100 text-indigo-700 text-xs px-3 py-1 rounded-full hover:bg-indigo-200 transition-colors flex items-center gap-1"
                            >
                                📋 Onaya Sun
                            </button>
                        )}
                        {!isNew && (
                            <>
                                <button
                                    onClick={handleLegalRequest}
                                    className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full hover:bg-amber-200 transition-colors flex items-center gap-1 shadow-sm border border-amber-200"
                                    title="İcra Servisine Whatsapp'tan Sor"
                                >
                                    <Scale className="w-3 h-3" /> İcra Servisi
                                </button>
                                <button
                                    onClick={() => setIsWhatsAppModalOpen(true)}
                                    className="bg-green-600 text-white text-xs px-3 py-1 rounded-full hover:bg-green-700 transition-colors flex items-center gap-1 shadow-sm"
                                >
                                    <MessageSquare className="w-3 h-3" /> WhatsApp
                                </button>
                                <button
                                    onClick={() => setIsSmsModalOpen(true)}
                                    className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full hover:bg-green-200 transition-colors flex items-center gap-1"
                                >
                                    <MessageSquare className="w-3 h-3" /> SMS Gönder
                                </button>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {data.basvuru_kanali && (
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                {data.basvuru_kanali}
                            </span>
                        )}
                        {!isNew && <span className="text-sm font-normal text-gray-500">ID: {data.id.slice(0, 8)}...</span>}
                    </div>
                </h2>

                {/* Tabs */}
                {!isNew && (
                    <div className="flex border-b border-gray-200 mb-6">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Müşteri Bilgileri
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            İşlem & SMS Geçmişi
                        </button>
                    </div>
                )}

                {activeTab === 'history' ? (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <button
                                onClick={fetchLogs}
                                className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-800"
                            >
                                <RefreshCw className={`w-3 h-3 ${logsLoading ? 'animate-spin' : ''}`} /> Yenile
                            </button>
                        </div>

                        {logsLoading ? (
                            <div className="text-center py-8 text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Yükleniyor...</div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">Henüz kayıt yok.</div>
                        ) : (
                            <div className="border rounded-lg divide-y bg-gray-50/50">
                                {logs.map((log) => (
                                    <div key={log.log_id} className="p-4 text-sm hover:bg-white transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`font-semibold px-2 py-0.5 rounded text-xs ${log.action === 'SEND_SMS' ? 'bg-green-100 text-green-700' :
                                                log.action === 'SEND_WHATSAPP' ? 'bg-teal-100 text-teal-700' :
                                                    log.action === 'UPDATE_STATUS' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-200 text-gray-700'
                                                }`}>
                                                {log.action === 'SEND_SMS' ? '📩 SMS Gönderildi' :
                                                    log.action === 'SEND_WHATSAPP' ? '💬 WhatsApp' :
                                                        log.action === 'UPDATE_STATUS' ? '🔄 Durum Değişimi' :
                                                            log.action === 'PULL_LEAD' ? '📥 Havuzdan Alma' : log.action}
                                            </span>
                                            <span className="text-gray-400 text-xs">{new Date(log.timestamp).toLocaleString('tr-TR')}</span>
                                        </div>
                                        <p className="text-gray-600 mb-1">
                                            <span className="font-medium text-gray-900">{log.user_email}</span> tarafından
                                        </p>

                                        {/* Content based on action */}
                                        {log.action === 'UPDATE_STATUS' && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="line-through text-gray-400">{log.old_value}</span>
                                                <span>➡️</span>
                                                <span className="font-medium text-gray-800">{log.new_value}</span>
                                            </div>
                                        )}

                                        {log.action === 'SEND_SMS' && (
                                            <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded text-green-800 text-xs italic">
                                                "{log.new_value}"
                                            </div>
                                        )}

                                        {log.note && (
                                            <p className="mt-1 text-gray-500 italic block border-l-2 border-gray-300 pl-2">
                                                Not: {log.note}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
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
                                        <button
                                            onClick={async () => {
                                                // 1. Open phone app (Auto-prefix 0 if missing)
                                                let phone = data.telefon || '';
                                                // Strip non-numeric chars to be safe (optional, but good practice)
                                                // phone = phone.replace(/\D/g, ''); 
                                                // The user specifically asked for prefixing 0
                                                if (!phone.startsWith('0')) {
                                                    phone = '0' + phone;
                                                }
                                                window.location.href = `tel:${phone}`;

                                                // 2. Update last call time in background
                                                try {
                                                    const now = new Date();
                                                    // FIX: Send ISO String (UTC) to DB. Do not send "Local String" as it causes double-shift.
                                                    const isoDate = now.toISOString();

                                                    const newData = { ...data, son_arama_zamani: isoDate };

                                                    // Optimistic UI Update
                                                    setData(newData);

                                                    await fetch(`/api/leads/${data.id}`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify(newData)
                                                    });
                                                } catch (error) {
                                                    console.error('Call time update failed', error);
                                                }
                                            }}
                                            className="mb-[2px] h-[42px] px-4 flex items-center justify-center bg-green-100 text-green-700 rounded-lg border border-green-200 hover:bg-green-200 transition-colors"
                                            title="Ara ve Kaydet"
                                        >
                                            <Phone className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>

                                <Input
                                    label="E-Posta Adresi"
                                    type="email"
                                    value={data.email || ''}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    placeholder="ornek@email.com"
                                />
                                <Input
                                    label="TC Kimlik *"
                                    value={data.tc_kimlik || ''}
                                    onChange={(e) => handleChange('tc_kimlik', e.target.value)}
                                    maxLength={11}
                                />
                                <Input
                                    label="Doğum Tarihi"
                                    value={data.dogum_tarihi || ''}
                                    onChange={(e) => handleChange('dogum_tarihi', e.target.value)}
                                    placeholder="GG.AA.YYYY"
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
                                <Select
                                    label="Şehir"
                                    value={data.sehir || ''}
                                    onChange={(e) => handleCityChange(e.target.value)}
                                    options={[
                                        { value: '', label: 'Seçiniz...' },
                                        ...cityList.map(city => ({ value: city.name, label: city.name }))
                                    ]}
                                />
                                <Select
                                    label="İlçe"
                                    value={data.ilce || ''}
                                    onChange={(e) => handleChange('ilce', e.target.value)}
                                    options={[
                                        { value: '', label: 'Seçiniz...' },
                                        ...districts.map(d => ({ value: d, label: d }))
                                    ]}
                                    disabled={!data.sehir}
                                />
                                <Input
                                    label="E-Devlet Şifre"
                                    value={data.e_devlet_sifre || ''}
                                    onChange={(e) => handleChange('e_devlet_sifre', e.target.value)}
                                    placeholder="Müşteriden alınan şifre"
                                />
                            </div>
                        </section>

                        {/* ADMIN ONLY: Onay ve Limit Yönetimi */}
                        {session?.user?.role === 'ADMIN' && (
                            <section className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 mb-4">
                                <h3 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                                    🛡️ Yönetici Onay Paneli
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Select
                                        label="Onay Durumu"
                                        value={data.onay_durumu || 'Beklemede'}
                                        onChange={(e) => handleChange('onay_durumu', e.target.value)}
                                        options={[
                                            { value: 'Beklemede', label: 'Beklemede' },
                                            { value: 'Kefil İstendi', label: 'Kefil İstendi' },
                                            { value: 'Onaylandı', label: 'Onaylandı' },
                                            { value: 'Reddedildi', label: 'Reddedildi' }
                                        ]}
                                        className="bg-white"
                                    />

                                    {data.onay_durumu === 'Onaylandı' && (
                                        <Input
                                            label="Onaylanan Limit (TL)"
                                            value={data.kredi_limiti || ''}
                                            onChange={(e) => handleChange('kredi_limiti', e.target.value)}
                                            placeholder="Örn: 50.000"
                                            className="bg-white font-semibold text-green-700"
                                        />
                                    )}

                                    <div className="md:col-span-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Yönetici Notu</label>
                                        <textarea
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-h-[60px]"
                                            value={data.admin_notu || ''}
                                            onChange={(e) => handleChange('admin_notu', e.target.value)}
                                            placeholder="Onay/Red sebebi veya özel notlar..."
                                        />
                                    </div>

                                    {/* Quick Actions based on status */}
                                    {data.onay_durumu === 'Onaylandı' && (
                                        <div className="md:col-span-3 flex justify-end">
                                            <p className="text-xs text-green-600 flex items-center gap-1">
                                                <Info className="w-3 h-3" />
                                                Onaylandığında müşteriye otomatik SMS gitmez, panelden gönderebilirsiniz.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

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
                                {data.durum === 'İptal/Vazgeçti' && (
                                    <Select
                                        label="İptal Nedeni *"
                                        value={data.iptal_nedeni || ''}
                                        onChange={(e) => handleChange('iptal_nedeni', e.target.value)}
                                        options={[
                                            { value: '', label: 'Nedeni Seçiniz...' },
                                            ...CANCELLATION_REASONS
                                        ]}
                                    />
                                )}
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

                        {/* Dosya Yükleme Alanı */}
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 bg-gray-50 p-2 rounded mb-3 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-purple-600" />
                                📂 Dosya / Görsel Yükleme
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Görsel 1 */}
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                    <span className="text-sm font-medium text-gray-700 mb-2">Görsel / Belge 1</span>
                                    {data.gorsel_1_url ? (
                                        <div className="flex flex-col items-center">
                                            <a href={data.gorsel_1_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs flex items-center gap-1 mb-2">
                                                <FileText className="w-4 h-4" /> Görüntüle
                                            </a>
                                            <button
                                                onClick={() => handleChange('gorsel_1_url', '')}
                                                className="text-red-500 text-xs hover:text-red-700"
                                            >
                                                Kaldır
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer flex flex-col items-center">
                                            <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                                            <span className="text-xs text-gray-500">Dosya Seç</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    // Upload Logic Inline to keep it simple or extract method
                                                    setLoading(true);
                                                    try {
                                                        const formData = new FormData();
                                                        formData.append('file', file);
                                                        formData.append('customerId', data.id);
                                                        formData.append('label', 'gorsel_1');

                                                        const res = await fetch('/api/upload', {
                                                            method: 'POST',
                                                            body: formData
                                                        });

                                                        const json = await res.json();
                                                        if (res.ok && json.url) {
                                                            handleChange('gorsel_1_url', json.url);
                                                            alert('Görsel 1 yüklendi!');
                                                        } else {
                                                            alert('Yükleme başarısız: ' + json.error);
                                                        }
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert('Yükleme hatası.');
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>

                                {/* Görsel 2 */}
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                    <span className="text-sm font-medium text-gray-700 mb-2">Görsel / Belge 2</span>
                                    {data.gorsel_2_url ? (
                                        <div className="flex flex-col items-center">
                                            <a href={data.gorsel_2_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs flex items-center gap-1 mb-2">
                                                <FileText className="w-4 h-4" /> Görüntüle
                                            </a>
                                            <button
                                                onClick={() => handleChange('gorsel_2_url', '')}
                                                className="text-red-500 text-xs hover:text-red-700"
                                            >
                                                Kaldır
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer flex flex-col items-center">
                                            <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                                            <span className="text-xs text-gray-500">Dosya Seç</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    setLoading(true);
                                                    try {
                                                        const formData = new FormData();
                                                        formData.append('file', file);
                                                        formData.append('customerId', data.id);
                                                        formData.append('label', 'gorsel_2');

                                                        const res = await fetch('/api/upload', {
                                                            method: 'POST',
                                                            body: formData
                                                        });

                                                        const json = await res.json();
                                                        if (res.ok && json.url) {
                                                            handleChange('gorsel_2_url', json.url);
                                                            alert('Görsel 2 yüklendi!');
                                                        } else {
                                                            alert('Yükleme başarısız: ' + json.error);
                                                        }
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert('Yükleme hatası.');
                                                    } finally {
                                                        setLoading(false);
                                                    }
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>
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
                                <Select
                                    label="UYAP/Avukat Sorgu Durumu"
                                    value={data.avukat_sorgu_durumu || 'Yapılmadı'}
                                    onChange={(e) => handleChange('avukat_sorgu_durumu', e.target.value)}
                                    options={[
                                        { value: 'Yapılmadı', label: 'Yapılmadı' },
                                        { value: 'Sorgu Bekleniyor', label: 'Sorgu Bekleniyor' },
                                        { value: 'Temiz', label: 'Temiz (Olumlu)' },
                                        { value: 'Riskli', label: 'Riskli' },
                                        { value: 'Olumsuz', label: 'Olumsuz' }
                                    ]}
                                />
                                <Input
                                    label="Sorgu Sonucu / Notlar"
                                    value={data.avukat_sorgu_sonuc || ''}
                                    onChange={(e) => handleChange('avukat_sorgu_sonuc', e.target.value)}
                                    placeholder="Örn: Riskli bir durum görünmüyor / Detay..."
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
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        📦 Ürün Teslimat Bilgileri
                                        {data.onay_durumu === 'Onaylandı' && data.kredi_limiti && (
                                            <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">
                                                Onaylı Limit: {data.kredi_limiti}
                                            </span>
                                        )}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setIsStockModalOpen(true)}
                                        className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 hover:bg-indigo-100 flex items-center gap-1 font-medium transition-colors"
                                    >
                                        <Package className="w-3 h-3" />
                                        Stoktan Ekle
                                    </button>
                                </div>

                                {/* Sold Items List */}
                                {data.satilan_urunler && (
                                    <div className="mb-4 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                                                <tr>
                                                    <th className="px-3 py-2">Marka / Model</th>
                                                    <th className="px-3 py-2">IMEI</th>
                                                    <th className="px-3 py-2">Seri No</th>
                                                    <th className="px-3 py-2">Tarih</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {(() => {
                                                    try {
                                                        const items = JSON.parse(data.satilan_urunler) as any[];
                                                        return items.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-white">
                                                                <td className="px-3 py-2 font-medium text-gray-800">{item.marka} {item.model}</td>
                                                                <td className="px-3 py-2 text-gray-600 font-mono">{item.imei}</td>
                                                                <td className="px-3 py-2 text-gray-500">{item.seri_no}</td>
                                                                <td className="px-3 py-2 text-gray-500">{new Date(item.satis_tarihi).toLocaleDateString('tr-TR')}</td>
                                                            </tr>
                                                        ));
                                                    } catch (e) {
                                                        return <tr><td colSpan={4} className="p-2 text-red-500">Ürün listesi hatalı.</td></tr>;
                                                    }
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Admin Note Display */}
                                {data.admin_notu && (
                                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                                        <p className="text-xs font-bold text-yellow-800 uppercase mb-1">📝 Yönetici Notu</p>
                                        <p className="text-sm text-yellow-900">{data.admin_notu}</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Ürün Seri No (Manuel / Son Eklenen)"
                                        value={data.urun_seri_no || ''}
                                        onChange={(e) => handleChange('urun_seri_no', e.target.value)}
                                        placeholder="Örn: ABC123456789"
                                    />
                                    <Input
                                        label="IMEI Numarası (Manuel / Son Eklenen)"
                                        value={data.urun_imei || ''}
                                        onChange={(e) => handleChange('urun_imei', e.target.value)}
                                        placeholder="Örn: 123456789012345"
                                        maxLength={15}
                                    />
                                </div>
                                <div className="mt-3 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg flex gap-2">
                                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Birden fazla ürün ekleyebilirsiniz.</strong> "Stoktan Ekle" butonu ile eklenen her ürün listeye dahil edilir.
                                        Manuel giriş yaparsanız sadece son ürün bilgisini güncellersiniz (Eski yöntem).
                                    </span>
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


                )}

                {/* Stock Selection Modal */}
                {isStockModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
                            {/* Modal Header */}
                            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-indigo-600" />
                                    Stoktan Cihaz Seç
                                </h3>
                                <button onClick={() => setIsStockModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                            </div>

                            {/* Search & Actions */}
                            <div className="p-4 border-b flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Marka, Model veya IMEI ara..."
                                        value={stockSearch}
                                        onChange={(e) => setStockSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <button
                                    onClick={fetchStock}
                                    className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600"
                                    title="Yenile"
                                >
                                    <RefreshCw className={`w-5 h-5 ${stockLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {stockItems
                                    .filter(item =>
                                        (item.marka || '').toLowerCase().includes(stockSearch.toLowerCase()) ||
                                        (item.model || '').toLowerCase().includes(stockSearch.toLowerCase()) ||
                                        (item.imei || '').includes(stockSearch)
                                    )
                                    .map(item => (
                                        <div key={item.id} className="border rounded-lg p-3 hover:bg-gray-50 flex justify-between items-center transition-colors">
                                            <div>
                                                <div className="font-semibold text-gray-800">{item.marka} {item.model}</div>
                                                <div className="text-xs text-gray-500 font-mono">IMEI: {item.imei}</div>
                                                <div className="text-xs text-gray-400">Seri: {item.seri_no}</div>
                                            </div>
                                            <button
                                                onClick={() => handleStockAssign(item)}
                                                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700 shadow-sm"
                                            >
                                                Seç
                                            </button>
                                        </div>
                                    ))}
                                {stockItems.length === 0 && !stockLoading && (
                                    <p className="text-center text-gray-500 py-4">Stokta uygun cihaz bulunamadı.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* SMS Modal */}
                {isSmsModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col p-6 animate-in fade-in zoom-in duration-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-green-600" />
                                SMS Gönder ({data.telefon})
                            </h3>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj İçeriği</label>
                                <textarea
                                    className="w-full h-32 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                    placeholder="Mesajınızı buraya yazın..."
                                    value={smsMessage}
                                    onChange={(e) => setSmsMessage(e.target.value)}
                                />
                                <div className="text-right text-xs text-gray-500 mt-1">
                                    {smsMessage.length} karakter - {Math.ceil(smsMessage.length / 160)} SMS
                                </div>
                            </div>

                            {/* Template Shortcuts */}
                            <div className="mb-4 flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
                                <div className="text-xs font-semibold text-gray-500 border-b pb-1">Tanışma & Süreç</div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setSmsMessage(`Sayın ${data.ad_soyad}, paylaştığınız bilgiler için teşekkür ederiz. Başvurunuz değerlendirme aşamasında olup, en kısa sürede size dönüş yapılacaktır. İlginiz için teşekkürler. CEPTE KOLAY`)}
                                        className="text-xs bg-cyan-50 border border-cyan-200 hover:bg-cyan-100 px-2 py-1 rounded text-cyan-700 transition"
                                    >
                                        Başvuru Alındı
                                    </button>
                                    <button
                                        onClick={() => setSmsMessage(`Müjde! ${data.ad_soyad}, başvurunuz ${data.kredi_limiti || 'belirlenen'} TL limit ile ONAYLANMISTIR! Urununuzu teslim almak icin sizi en kisa surede magazamiza bekliyoruz. Simdiden iyi gunlerde kullanin. CEPTE KOLAY`)}
                                        className="text-xs bg-green-50 border border-green-200 hover:bg-green-100 px-2 py-1 rounded text-green-700 transition"
                                    >
                                        Onaylandı
                                    </button>
                                    <button
                                        onClick={() => setSmsMessage(`Değerli Müşterimiz ${data.ad_soyad}, başvurunuzun olumlu sonuçlanabilmesi için kefil desteğine ihtiyaç duyulmuştur. Detaylı bilgi için 0551 349 6735 numaralı hattımızdan bize ulaşabilir veya mağazamızı ziyaret edebilirsiniz. CEPTE KOLAY`)}
                                        className="text-xs bg-orange-50 border border-orange-200 hover:bg-orange-100 px-2 py-1 rounded text-orange-700 transition"
                                    >
                                        Kefil İstendi
                                    </button>
                                    <button
                                        onClick={() => setSmsMessage(`Sayın ${data.ad_soyad}, başvurunuzla ilgili size ulaşmaya çalıştık ancak ulaşamadık. Müsait olduğunuzda 0551 349 6735 numaramızdan veya WhatsApp hattımızdan bize dönüş yapmanızı rica ederiz. CEPTE KOLAY`)}
                                        className="text-xs bg-gray-50 border border-gray-200 hover:bg-gray-100 px-2 py-1 rounded text-gray-700 transition"
                                    >
                                        Ulaşılamadı
                                    </button>
                                    <button
                                        onClick={() => setSmsMessage(`Sayın ${data.ad_soyad}, başvurunuzu tamamlayabilmemiz için bazı eksik evraklarınız bulunmaktadır. 0551 349 6735 WhatsApp hattımızdan bilgi alarak işlemlerinizi hızlandırabilirsiniz. CEPTE KOLAY`)}
                                        className="text-xs bg-blue-50 border border-blue-200 hover:bg-blue-100 px-2 py-1 rounded text-blue-700 transition"
                                    >
                                        Eksik Evrak
                                    </button>
                                    <button
                                        onClick={() => setSmsMessage(`Sayın ${data.ad_soyad}, başvurunuzla ilgili işlemler durdurulmuş ve kaydınız iptal edilmiştir. İhtiyaçlarınız için kapımız size her zaman açık. CEPTE KOLAY`)}
                                        className="text-xs bg-red-50 border border-red-200 hover:bg-red-100 px-2 py-1 rounded text-red-700 transition"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        onClick={() => setSmsMessage(`Sayın ${data.ad_soyad}, ${data.talep_edilen_urun || 'Cihaz'} urununuz teslim edilmistir. IMEI: ${data.urun_imei || '...'}, Seri No: ${data.urun_seri_no || '...'}. Iyi gunlerde kullanmanizi dileriz. CEPTE KOLAY`)}
                                        className="text-xs bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-2 py-1 rounded text-indigo-700 transition"
                                    >
                                        Teslim Edildi
                                    </button>
                                    <button
                                        onClick={() => setSmsMessage(`Magaza Konumumuz: https://maps.app.goo.gl/VTBYugiDdTCAbnwB6 CEPTE KOLAY`)}
                                        className="text-xs bg-purple-50 border border-purple-200 hover:bg-purple-100 px-2 py-1 rounded text-purple-700 transition"
                                    >
                                        Konum
                                    </button>
                                    <button
                                        onClick={() => setSmsMessage(`Odeme yapabileceginiz IBAN bilgimiz: TR58 0001 0008 0498 1915 2750 01 - Alici: Cepte Kolay. CEPTE KOLAY`)}
                                        className="text-xs bg-teal-50 border border-teal-200 hover:bg-teal-100 px-2 py-1 rounded text-teal-700 transition"
                                    >
                                        IBAN
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsSmsModalOpen(false)}>İptal</Button>
                                <Button onClick={handleSendSMS} isLoading={smsLoading} className="bg-green-600 hover:bg-green-700 text-white">
                                    Gönder
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* WhatsApp Modal */}
                {isWhatsAppModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col p-6 animate-in fade-in zoom-in duration-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-green-600" />
                                WhatsApp Gönder ({data.telefon})
                            </h3>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj İçeriği</label>
                                <textarea
                                    className="w-full h-32 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                    placeholder="Mesajınızı buraya yazın..."
                                    value={whatsAppMessage}
                                    onChange={(e) => setWhatsAppMessage(e.target.value)}
                                />
                                <div className="text-right text-xs text-gray-500 mt-1">
                                    {whatsAppMessage.length} karakter
                                </div>
                            </div>

                            {/* Template Shortcuts */}
                            <div className="mb-4 flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
                                <div className="text-xs font-semibold text-gray-500 border-b pb-1">Tanışma & Süreç</div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setWhatsAppMessage(WHATSAPP_TEMPLATES.WELCOME(data.ad_soyad))}
                                        className="text-xs bg-cyan-50 border border-cyan-200 hover:bg-cyan-100 px-2 py-1 rounded text-cyan-700 transition"
                                    >
                                        1. Karşılama
                                    </button>
                                    <button
                                        onClick={() => setWhatsAppMessage(WHATSAPP_TEMPLATES.PROCESS_INFO())}
                                        className="text-xs bg-cyan-50 border border-cyan-200 hover:bg-cyan-100 px-2 py-1 rounded text-cyan-700 transition"
                                    >
                                        2. Süreç Anlatımı
                                    </button>
                                    <button
                                        onClick={() => setWhatsAppMessage(WHATSAPP_TEMPLATES.CRITICAL_WARNING())}
                                        className="text-xs bg-orange-50 border border-orange-200 hover:bg-orange-100 px-2 py-1 rounded text-orange-700 transition"
                                    >
                                        3. Uyarı (TC/Şifre)
                                    </button>
                                    <button
                                        onClick={() => setWhatsAppMessage(WHATSAPP_TEMPLATES.CONFIRMATION())}
                                        className="text-xs bg-cyan-50 border border-cyan-200 hover:bg-cyan-100 px-2 py-1 rounded text-cyan-700 transition"
                                    >
                                        4. Onay Alma
                                    </button>
                                </div>

                                <div className="text-xs font-semibold text-gray-500 border-b pb-1">Kontrol & Sonuç</div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setWhatsAppMessage(WHATSAPP_TEMPLATES.REQUEST_ID_PASS())}
                                        className="text-xs bg-blue-50 border border-blue-200 hover:bg-blue-100 px-2 py-1 rounded text-blue-700 transition"
                                    >
                                        5. Bilgi İsteme
                                    </button>
                                    <button
                                        onClick={() => setWhatsAppMessage(WHATSAPP_TEMPLATES.CHECK_STARTED())}
                                        className="text-xs bg-blue-50 border border-blue-200 hover:bg-blue-100 px-2 py-1 rounded text-blue-700 transition"
                                    >
                                        6. Kontrol Başladı
                                    </button>
                                    <button
                                        onClick={() => setWhatsAppMessage(WHATSAPP_TEMPLATES.POSITIVE_RESULT(data.ad_soyad, data.kredi_limiti || '...'))}
                                        className="text-xs bg-green-50 border border-green-200 hover:bg-green-100 px-2 py-1 rounded text-green-700 transition"
                                    >
                                        7. Olumlu Sonuç
                                    </button>
                                    <button
                                        onClick={() => setWhatsAppMessage(WHATSAPP_TEMPLATES.NEGATIVE_RESULT())}
                                        className="text-xs bg-red-50 border border-red-200 hover:bg-red-100 px-2 py-1 rounded text-red-700 transition"
                                    >
                                        12. Olumsuz Sonuç
                                    </button>
                                </div>

                                <div className="text-xs font-semibold text-gray-500 border-b pb-1">Kapanış & Diğer</div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setWhatsAppMessage(WHATSAPP_TEMPLATES.CALL_PERMISSION())}
                                        className="text-xs bg-purple-50 border border-purple-200 hover:bg-purple-100 px-2 py-1 rounded text-purple-700 transition"
                                    >
                                        8. Arama İzni
                                    </button>
                                    <button
                                        onClick={() => setWhatsAppMessage(WHATSAPP_TEMPLATES.REFUSED_TO_GIVE_INFO())}
                                        className="text-xs bg-gray-50 border border-gray-200 hover:bg-gray-100 px-2 py-1 rounded text-gray-700 transition"
                                    >
                                        9. Bilgi Vermeyen
                                    </button>
                                    <button
                                        onClick={() => setWhatsAppMessage(WHATSAPP_TEMPLATES.NO_RESPONSE_24H(data.ad_soyad))}
                                        className="text-xs bg-gray-50 border border-gray-200 hover:bg-gray-100 px-2 py-1 rounded text-gray-700 transition"
                                    >
                                        10. Cevap Yok (24s)
                                    </button>
                                    <button
                                        onClick={() => setWhatsAppMessage(WHATSAPP_TEMPLATES.UNREACHABLE_AFTER_CALL())}
                                        className="text-xs bg-gray-50 border border-gray-200 hover:bg-gray-100 px-2 py-1 rounded text-gray-700 transition"
                                    >
                                        11. Ulaşılamadı
                                    </button>
                                </div>

                                <div className="text-xs font-semibold text-gray-500 border-b pb-1">Bilgi & Teslimat</div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setWhatsAppMessage(WHATSAPP_TEMPLATES.LOCATION())}
                                        className="text-xs bg-teal-50 border border-teal-200 hover:bg-teal-100 px-2 py-1 rounded text-teal-700 transition"
                                    >
                                        13. Konum
                                    </button>
                                    <button
                                        onClick={() => setWhatsAppMessage(WHATSAPP_TEMPLATES.IBAN())}
                                        className="text-xs bg-teal-50 border border-teal-200 hover:bg-teal-100 px-2 py-1 rounded text-teal-700 transition"
                                    >
                                        14. IBAN
                                    </button>
                                    <button
                                        onClick={() => setWhatsAppMessage(WHATSAPP_TEMPLATES.DELIVERED(data.ad_soyad, data.talep_edilen_urun || 'Cihaz', data.urun_imei || '...', data.urun_seri_no || '...'))}
                                        className="text-xs bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-2 py-1 rounded text-indigo-700 transition"
                                    >
                                        15. Teslimat
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsWhatsAppModalOpen(false)}>İptal</Button>
                                <Button onClick={handleSendWhatsApp} isLoading={whatsAppLoading} className="bg-green-600 hover:bg-green-700 text-white">
                                    Gönder
                                </Button>
                            </div>
                        </div>
                    </div>
                )}


                <ApprovalSummaryModal
                    isOpen={isApprovalModalOpen}
                    onClose={() => setIsApprovalModalOpen(false)}
                    customer={data}
                />
            </div >
        </div >
    );
}

function ApprovalSummaryModal({ isOpen, onClose, customer }: { isOpen: boolean; onClose: () => void; customer: Customer }) {
    if (!isOpen) return null;

    const generateSummary = () => {
        let summary = `*Adı :* ${customer.ad_soyad || '-'}
*Telefon :* ${customer.telefon || '-'}
*Doğum Tarihi :* ${customer.dogum_tarihi || '-'}
*Talep Edilen Ürün :* ${customer.talep_edilen_urun || '-'}
*Şehri :* ${customer.sehir || '-'} / ${customer.ilce || '-'}
*Meslek / Son iş yeri çalışma süresi :* ${customer.meslek_is || '-'} / ${customer.ayni_isyerinde_sure_ay || '?'} aydır aynı iş yerinde
*Son yatan maaş:* ${customer.son_yatan_maas || '-'}
*Mülkiyet :* ${customer.mulkiyet_durumu || '-'}
*Dava Dosyası :* ${customer.dava_dosyasi_varmi || '-'} ${customer.dava_detay || ''}
*Gizli Dosyası :* ${customer.gizli_dosya_varmi || '-'} ${customer.gizli_dosya_detay || ''}
*Açık icrası :* ${customer.acik_icra_varmi || '-'} ${customer.acik_icra_detay || ''}
*Kapalı icra :* ${customer.kapali_icra_varmi || '-'} Açıklama: ${customer.kapali_icra_kapanis_sekli || ''}
*Tapu Var mı :* ${customer.tapu_varmi || '-'}
*Araç Var mı :* ${customer.arac_varmi || '-'}
*Avukat Sorgusu :* ${customer.avukat_sorgu_durumu || '-'} Açıklaması ${customer.avukat_sorgu_sonuc || ''}`;

        // Satıcı Notu Ekleme
        if (customer.arama_not_kisa) {
            summary += `\n\n📝 *Satıcı Notu:* ${customer.arama_not_kisa}`;
        }

        // Varlık Detayları
        if (customer.tapu_varmi === 'Evet' && customer.tapu_detay) {
            summary += `\n\n🏠 *Tapu Detayı:* ${customer.tapu_detay}`;
        }
        if (customer.arac_varmi === 'Evet' && customer.arac_detay) {
            summary += `\n🚗 *Araç Detayı:* ${customer.arac_detay}`;
        }

        // Kefil Bilgileri Ekleme
        if (customer.kefil_ad_soyad) {
            summary += `\n\n--- 🤝 *KEFİL BİLGİLERİ* ---\n`;
            summary += `*Adı Soyadı:* ${customer.kefil_ad_soyad}\n`;
            summary += `*Telefon:* ${customer.kefil_telefon || '-'}\n`;
            summary += `*Meslek:* ${customer.kefil_meslek_is || '-'}\n`;
            summary += `*Maaş:* ${customer.kefil_son_yatan_maas || '-'}\n`;
            summary += `*Çalışma Süresi:* ${customer.kefil_ayni_isyerinde_sure_ay || '-'} Ay\n`;
            summary += `*İkametgah:* ${customer.kefil_ikametgah_varmi || '-'}\n`;
            summary += `*Hizmet Dökümü:* ${customer.kefil_hizmet_dokumu_varmi || '-'}\n`;
            summary += `*İcra Durumu:* ${customer.kefil_acik_icra_varmi || '-'}\n`;
            summary += `*Tapu/Araç:* ${customer.kefil_tapu_varmi || '-'}`;
        }

        return summary;
    };

    const summaryText = generateSummary();

    const handleCopy = () => {
        navigator.clipboard.writeText(summaryText);
        alert('Metin kopyalandı! ✅');
    };

    const handleWhatsApp = () => {
        const url = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
        window.open(url, '_blank');
    };

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=800,height=800');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Onay Özeti - ${customer.ad_soyad}</title>
                        <style>
                            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; line-height: 1.5; color: #333; max-width: 800px; margin: 0 auto; }
                            h2 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                            .summary-box { white-space: pre-wrap; background: #fff; padding: 0; font-size: 14px; border: none; }
                            .manual-section { margin-top: 30px; border: 1px solid #ccc; padding: 15px; border-radius: 5px; min-height: 150px; }
                            .manual-label { font-weight: bold; margin-bottom: 10px; display: block; border-bottom: 1px dashed #ccc; padding-bottom: 5px; }
                            .grid { display: flex; gap: 20px; margin-top: 30px; }
                            .col { flex: 1; border: 1px solid #ccc; padding: 15px; border-radius: 5px; height: 100px; }
                            .date-area { margin-top: 10px; text-align: right; font-size: 12px; }
                            
                            @media print {
                                body { padding: 0; }
                                .manual-section { break-inside: avoid; }
                            }
                        </style>
                    </head>
                    <body>
                        <h2>Müşteri Onay Özeti</h2>
                        <div class="date-area">Çıktı Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}</div>
                        
                        <div class="summary-box">${summaryText}</div>

                        <div class="manual-section">
                            <span class="manual-label">✍️ Değerlendirme / Notlar (Elle Doldurulacak Alan)</span>
                            <!-- Empty space for writing -->
                        </div>

                        <div class="grid">
                            <div class="col">
                                <span class="manual-label">Satış Temsilcisi</span>
                                <div style="text-align: center; font-weight: bold; margin-top: 10px; margin-bottom: 30px; font-size: 12px;">${customer.sahip || ''}</div>
                                <div style="border-top: 1px dotted #999; width: 80%; margin-left: auto; margin-right: auto;"></div>
                                <div style="text-align: center; font-size: 10px;">İmza</div>
                            </div>
                            <div class="col">
                                <span class="manual-label">Yönetici / Onay</span>
                                <div style="margin-top: 40px; border-top: 1px dotted #999; width: 80%; margin-left: auto; margin-right: auto;"></div>
                                <div style="text-align: center; font-size: 10px;">İmza</div>
                            </div>
                        </div>

                        <script>window.print();</script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b flex justify-between items-center bg-indigo-50 rounded-t-xl">
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                        📋 Yönetici Onay Özeti
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="p-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm text-gray-800 whitespace-pre-wrap leading-relaxed shadow-inner">
                        {summaryText}
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Button variant="secondary" onClick={handleCopy} className="w-full justify-center">
                            📋 Kopyala
                        </Button>
                        <Button variant="ghost" onClick={handleWhatsApp} className="w-full justify-center bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200 border">
                            💬 WhatsApp
                        </Button>
                        <Button variant="ghost" onClick={handlePrint} className="w-full justify-center bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200 border">
                            🖨️ Yazdır
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
