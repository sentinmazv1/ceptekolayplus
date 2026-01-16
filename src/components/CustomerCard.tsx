'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Customer, LeadStatus, InventoryItem, LogEntry } from '@/lib/types';
import { WHATSAPP_TEMPLATES } from '@/lib/whatsapp-templates';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Loader2, AlertCircle, CheckCircle, Info, Phone, Package, Smartphone, Search, RefreshCw, MessageSquare, Scale, UploadCloud, FileText, Image as ImageIcon, Briefcase, Home, ShieldCheck, X, Shield, Printer, User, Calendar } from 'lucide-react';
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
    const isChanged = JSON.stringify(data) !== JSON.stringify(initialData);

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
    const [activeTab, setActiveTab] = useState<'details' | 'is' | 'yasal' | 'urun' | 'dosya' | 'history' | 'kefil'>('details');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);

    // Dynamic Statuses & Notes
    const [statusOptions, setStatusOptions] = useState<{ value: string, label: string }[]>([]);
    const [quickNotes, setQuickNotes] = useState<{ label: string }[]>([]);

    useEffect(() => {
        // Fetch statuses from API
        fetch('/api/admin/statuses')
            .then(res => res.json())
            .then(data => {
                if (data.statuses) {
                    setStatusOptions(data.statuses.map((s: any) => ({ value: s.label, label: s.label })));
                }
            })
            .catch(err => console.error('Status fetch error:', err));

        // Fetch quick notes
        fetch('/api/admin/quick-notes')
            .then(res => res.json())
            .then(data => {
                if (data.notes) {
                    setQuickNotes(data.notes.filter((n: any) => n.is_active));
                }
            })
            .catch(err => console.error('Quick Notes fetch error:', err));
    }, []);

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
        if (!data.ad_soyad || !data.telefon) {
            setError('Ad Soyad ve Telefon zorunludur.');
            setLoading(false);
            return;
        }

        // Phone Validation (Basic)
        if (data.telefon.length < 10) {
            setError('Telefon numarası eksik veya hatalı.');
            setLoading(false);
            return;
        }

        // TC Validation (If provided)
        if (data.tc_kimlik && (data.tc_kimlik.length !== 11 || !/^\d+$/.test(data.tc_kimlik))) {
            setError('TC Kimlik Numarası 11 haneli ve sayısal olmalıdır.');
            setLoading(false);
            return;
        }

        // IMEI Validation (If provided, strictly 15 digits)
        if (data.urun_imei && (data.urun_imei.length !== 15 || !/^\d+$/.test(data.urun_imei))) {
            setError('Ürün IMEI numarası tam 15 hane ve sayısal olmalıdır.');
            setLoading(false);
            return;
        }

        // Status Logic
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
            // Kefil TC Check
            if (data.kefil_tc_kimlik && (data.kefil_tc_kimlik.length !== 11 || !/^\d+$/.test(data.kefil_tc_kimlik))) {
                setError('Kefil TC Kimlik Numarası 11 haneli olmalıdır.');
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
                // Determine source for analytics
                // If created manually, it's 'Panel'
                alert('✨ Müşteri Kartı Oluşturuldu!\n\nYeni müşteri başarıyla sisteme eklendi.');
                if (onSave) onSave(json.lead);
            } else {
                setData(json.lead);
                if (onSave) onSave(json.lead);

                // Show a more "Premium" feedback if possible, otherwise standard alert
                alert('✅ Değişiklikler Kaydedildi.\n\nMüşteri kartı başarıyla güncellendi.');
            }

            setIsApprovalModalOpen(false); // Close modal if open

        } catch (err: any) {
            console.error('Save Error:', err);
            // Detailed Error Feedback
            let msg = 'Kaydedilemedi.';
            if (err.message) msg += '\n\nHata: ' + err.message;
            if (err.message.includes('Payload')) msg += '\n(Dosya boyutu çok yüksek olabilir)';

            alert('❌ ' + msg);
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // --- UI HELPERS ---
    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === id
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
        >
            <Icon className="w-4 h-4" />
            <span className="">{label}</span>
        </button>
    );

    return (
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-full ring-1 ring-gray-900/5">
            {/* --- HEADER --- */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 shrink-0 shadow-md relative overflow-hidden">
                <div className="absolute inset-0 bg-white/5 opacity-50 pattern-grid-lg"></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-md border border-white/10 shadow-inner">
                                <span className="text-xl font-bold tracking-tight text-white">{data.ad_soyad || 'İsimsiz Müşteri'}</span>
                            </div>
                            {data.ozel_musteri_mi && (
                                <span className="px-2 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-950 text-xs font-bold rounded border border-yellow-300 shadow-sm flex items-center gap-1">
                                    ⭐ VIP
                                </span>
                            )}
                            {isChanged && <span className="text-xs bg-indigo-500/80 px-2 py-1 rounded-full animate-pulse border border-indigo-400/50">Değişiklikler var</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium ml-1 mt-2">
                            <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded border border-white/5">
                                <User className="w-3 h-3 text-indigo-200" />
                                <span className="text-indigo-200">Satıcı:</span>
                                <span className="text-white">{data.created_by?.split('@')[0] || 'Sistem'}</span>
                            </div>
                            {data.sahip && (
                                <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded border border-white/5">
                                    <Briefcase className="w-3 h-3 text-amber-200" />
                                    <span className="text-amber-200">Sahip:</span>
                                    <span className="text-white">{data.sahip === session?.user.email ? 'Siz' : data.sahip.split('@')[0]}</span>
                                </div>
                            )}
                            <span className='flex items-center gap-1 hover:text-white transition-colors cursor-pointer' onClick={() => window.open(`tel:${data.telefon?.startsWith('0') ? data.telefon : '0' + data.telefon}`)}><Phone className="w-3 h-3" /> {data.telefon}</span>
                            <span className='hidden md:flex items-center gap-1 text-slate-400'> <Calendar className="w-3 h-3" /> {new Date(data.created_at || new Date()).toLocaleDateString('tr-TR')}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Status Badge */}
                        <div className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm backdrop-blur-md border ${data.durum === 'Onaylandı' ? 'bg-emerald-500/20 text-emerald-100 border-emerald-500/30' :
                            data.durum === 'Reddetti' ? 'bg-rose-500/20 text-rose-100 border-rose-500/30' :
                                data.durum === 'Aranacak' ? 'bg-amber-500/20 text-amber-100 border-amber-500/30' :
                                    'bg-slate-700/50 text-slate-200 border-slate-600/50'
                            }`}>
                            {data.durum || 'Durum Yok'}
                        </div>
                    </div>
                </div>

                {/* GLOBAL ACTION BAR */}
                <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-3 sticky top-[73px] z-20 shadow-sm animate-in slide-in-from-top-1">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => window.print()}
                            className="bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 text-xs shadow-sm"
                            title="Yazdır"
                        >
                            <Printer className="w-4 h-4 mr-2" /> Yazdır
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => window.open('https://portal.uyap.gov.tr/vatandas/', '_blank')}
                            className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs shadow-sm"
                        >
                            <Scale className="w-4 h-4 mr-2" /> İcra Servisi
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setIsApprovalModalOpen(true)}
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs shadow-sm"
                        >
                            <Shield className="w-4 h-4 mr-2" /> Onay Sun
                        </Button>
                    </div>

                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSave}
                        disabled={loading}
                        className={`font-semibold shadow-lg border-0 transition-all active:scale-95 min-w-[120px] ring-offset-2 focus:ring-2 focus:ring-indigo-500 ${loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                        {loading ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                </div>
            </div>

            {/* --- TABS NAVIGATION --- */}
            <div className="flex overflow-x-auto border-b border-gray-200 bg-white sticky top-0 z-10 scrollbar-hide shadow-sm">
                <TabButton id="details" label="Genel Bilgiler" icon={Info} />
                <TabButton id="yasal" label="Yasal & Varlık" icon={Scale} />
                <TabButton id="is" label="İş & Finans" icon={Briefcase} />
                <TabButton id="urun" label="Ürün & Teslimat" icon={Package} />
                <TabButton id="dosya" label="Dosyalar" icon={ImageIcon} />
                <TabButton id="kefil" label="Kefil Bilgileri" icon={ShieldCheck} />
                <TabButton id="history" label="Geçmiş & Loglar" icon={RefreshCw} />
            </div>

            {/* --- SCROLLABLE CONTENT --- */}
            < div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 font-sans custom-scrollbar" >
                {/* TABS CONTENT WILL BE INJECTED HERE */}
                {
                    activeTab === 'details' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* İletişim & Durum Kartı */}
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-indigo-500" /> İletişim Bilgileri
                                    </h3>
                                    <div className="space-y-4">
                                        <Input
                                            label="Ad Soyad"
                                            value={data.ad_soyad}
                                            onChange={(e) => handleChange('ad_soyad', e.target.value)}
                                        />
                                        <div className="flex gap-2 items-end">
                                            <div className="flex-1">
                                                <Input
                                                    label="Telefon"
                                                    value={data.telefon}
                                                    onChange={(e) => handleChange('telefon', e.target.value)}
                                                />
                                            </div>
                                            <div className="flex gap-1 mb-1">
                                                <a href={`tel:${data.telefon}`} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 border border-green-200 transition-colors" title="Ara">
                                                    <Phone className="w-5 h-5" />
                                                </a>
                                                <button onClick={() => setIsWhatsAppModalOpen(true)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 border border-green-200 transition-colors" title="WhatsApp">
                                                    <MessageSquare className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => setIsSmsModalOpen(true)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors" title="SMS">
                                                    <Smartphone className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <Input
                                            label="TC Kimlik No (Opsiyonel)"
                                            value={data.tc_kimlik || ''}
                                            onChange={(e) => handleChange('tc_kimlik', e.target.value)}
                                            maxLength={11}
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                label="Doğum Tarihi"
                                                type="date"
                                                value={data.dogum_tarihi || ''}
                                                onChange={(e) => handleChange('dogum_tarihi', e.target.value)}
                                            />
                                            <Input
                                                label="Winner Müşteri No"
                                                value={data.winner_musteri_no || ''}
                                                onChange={(e) => handleChange('winner_musteri_no', e.target.value)}
                                                placeholder="Müşteri No"
                                            />
                                        </div>
                                        <Input
                                            label="E-Devlet Şifresi"
                                            value={data.e_devlet_sifre || ''}
                                            onChange={(e) => handleChange('e_devlet_sifre', e.target.value)}
                                            placeholder="Şifre"
                                        />
                                        <Input
                                            label="E-Posta"
                                            type="email"
                                            value={data.email || ''}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                            <Select
                                                label="Şehir"
                                                value={data.sehir || ''}
                                                onChange={(e) => {
                                                    handleChange('sehir', e.target.value);
                                                    handleChange('ilce', '');
                                                }}
                                                options={cityList.map(c => ({ value: c.name, label: c.name }))}
                                            />
                                            <Select
                                                label="İlçe"
                                                value={data.ilce || ''}
                                                onChange={(e) => handleChange('ilce', e.target.value)}
                                                options={data.sehir ? getDistrictsByCityCode(String(cityList.find(c => c.name === data.sehir)?.code || '')).map(d => ({ value: d, label: d })) : []}
                                                disabled={!data.sehir}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Süreç & Planlama Kartı */}
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4 text-orange-500" /> Süreç Yönetimi
                                    </h3>
                                    <div className="space-y-4">
                                        <Select
                                            label="Arama Durumu (Statü)"
                                            value={data.durum}
                                            onChange={(e) => handleChange('durum', e.target.value as any)}
                                            options={statusOptions.length > 0 ? statusOptions : [
                                                { value: 'Yeni', label: 'Yeni' },
                                                { value: 'Aranacak', label: 'Aranacak' },
                                                // ... fallback defaults if needed
                                            ]}
                                        />

                                        {data.durum === 'Daha sonra aranmak istiyor' && (
                                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                                <label className="block text-xs font-semibold text-purple-800 mb-1">Randevu Zamanı</label>
                                                <input
                                                    type="datetime-local"
                                                    value={data.sonraki_arama_zamani ? new Date(data.sonraki_arama_zamani).toISOString().slice(0, 16) : ''}
                                                    onChange={(e) => handleChange('sonraki_arama_zamani', new Date(e.target.value).toISOString())}
                                                    className="w-full p-2 text-sm border border-purple-200 rounded focus:ring-2 focus:ring-purple-500 outline-none"
                                                />
                                            </div>
                                        )}

                                        {data.durum === 'İptal/Vazgeçti' && (
                                            <div className="bg-red-50 p-3 rounded-lg border border-red-100 animate-in fade-in zoom-in duration-200">
                                                <Select
                                                    label="İptal / Vazgeçme Nedeni"
                                                    value={data.iptal_nedeni || ''}
                                                    onChange={(e) => handleChange('iptal_nedeni', e.target.value)}
                                                    options={CANCELLATION_REASONS}
                                                    className="border-red-200 text-red-900 focus:ring-red-500"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Hızlı Notlar</label>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {(quickNotes.length > 0 ? quickNotes : [{ label: 'Fiyat sordu' }, { label: 'Düşünüyor' }, { label: 'Eşine soracak' }, { label: 'Müsait değil' }, { label: 'Yanlış no' }]).map((note, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleChange('arama_not_kisa', (data.arama_not_kisa || '') + ' ' + note.label)}
                                                        className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition"
                                                    >
                                                        {note.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <textarea
                                                rows={3}
                                                value={data.arama_not_kisa || ''}
                                                onChange={(e) => handleChange('arama_not_kisa', e.target.value)}
                                                placeholder="Görüşme notları..."
                                                className="w-full p-2 text-sm border rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                                            />
                                        </div>
                                        <div className="pt-2 border-t mt-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={data.basvuru_kanali === 'Whatsapp'}
                                                    onChange={(e) => handleChange('basvuru_kanali', e.target.checked ? 'Whatsapp' : 'Panel')}
                                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                                />
                                                <span className="text-sm text-gray-700">WhatsApp'tan geldi</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'is' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-blue-500" /> İş Bilgileri
                                </h3>
                                <div className="space-y-4">
                                    <Input
                                        label="Meslek / Pozisyon"
                                        value={data.meslek_is || ''}
                                        onChange={(e) => handleChange('meslek_is', e.target.value)}
                                    />
                                    <Input
                                        label="Son Maaş (TL)"
                                        type="number"
                                        value={data.son_yatan_maas || ''}
                                        onChange={(e) => handleChange('son_yatan_maas', e.target.value)}
                                    />
                                    <Input
                                        label="Aynı İşyerinde Çalışma Süresi"
                                        value={data.ayni_isyerinde_sure_ay || ''}
                                        onChange={(e) => handleChange('ayni_isyerinde_sure_ay', e.target.value)}
                                        placeholder="Örn: 1 Yıl 3 Ay"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Select
                                            label="İkametgah Belgesi"
                                            value={data.ikametgah_varmi || 'Hayır'}
                                            onChange={(e) => handleChange('ikametgah_varmi', e.target.value)}
                                            options={[{ value: 'Evet', label: 'Var' }, { value: 'Hayır', label: 'Yok' }]}
                                        />
                                        <Select
                                            label="Psikoteknik Belgesi"
                                            value={data.psikoteknik_varmi || 'Hayır'}
                                            onChange={(e) => handleChange('psikoteknik_varmi', e.target.value)}
                                            options={[{ value: 'Evet', label: 'Var' }, { value: 'Hayır', label: 'Yok' }]}
                                        />
                                    </div>
                                    <Select
                                        label="Çalışma Şekli"
                                        value={data.calisma_sekli || ''}
                                        onChange={(e) => handleChange('calisma_sekli', e.target.value)}
                                        options={[
                                            { value: 'Özel Sektör (Sigortalı)', label: 'Özel Sektör (Sigortalı)' },
                                            { value: 'Kamu (Memur/Sözleşmeli)', label: 'Kamu (Memur/Sözleşmeli)' },
                                            { value: 'Emekli', label: 'Emekli' },
                                            { value: 'Kendi İşi (Esnaf/Şirket)', label: 'Kendi İşi (Esnaf/Şirket)' },
                                            { value: 'Öğrenci', label: 'Öğrenci' },
                                            { value: 'Çalışmıyor', label: 'Çalışmıyor' },
                                        ]}
                                    />
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                                    <Home className="w-4 h-4 text-green-500" /> Ek Gelir & Finans
                                </h3>
                                <div className="space-y-4">
                                    <Input
                                        label="Ek Gelir (Varsa)"
                                        value={data.ek_gelir || ''}
                                        onChange={(e) => handleChange('ek_gelir', e.target.value)}
                                    />
                                    <Select
                                        label="Kredi Notu Riski"
                                        value={data.findeks_risk_durumu || ''}
                                        onChange={(e) => handleChange('findeks_risk_durumu', e.target.value)}
                                        options={[
                                            { value: 'Çok İyi (1500-1900)', label: 'Çok İyi' },
                                            { value: 'İyi (1100-1499)', label: 'İyi' },
                                            { value: 'Az Riskli (700-1099)', label: 'Az Riskli' },
                                            { value: 'Orta Riskli (500-699)', label: 'Orta Riskli' },
                                            { value: 'Çok Riskli (1-499)', label: 'Çok Riskli' },
                                            { value: 'Bilinmiyor', label: 'Bilinmiyor' },
                                        ]}
                                    />
                                    <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                                        <p className="font-semibold mb-1">ℹ️ Finansal Notlar</p>
                                        <textarea
                                            className="w-full bg-white border border-blue-200 rounded p-2 text-sm outline-none focus:ring-1 focus:ring-blue-400"
                                            rows={2}
                                            value={data.finansal_notlar || ''}
                                            onChange={(e) => handleChange('finansal_notlar', e.target.value)}
                                            placeholder="Ek finansal bilgiler..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'yasal' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Legal Status */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                                    <Scale className="w-4 h-4 text-red-500" /> Yasal Durum
                                </h3>
                                <div className="space-y-4">
                                    <Select
                                        label="Açık İcra Dosyası Var mı?"
                                        value={data.acik_icra_varmi || 'Hayır'}
                                        onChange={(e) => handleChange('acik_icra_varmi', e.target.value)}
                                        options={[{ value: 'Evet', label: 'Evet (Var)' }, { value: 'Hayır', label: 'Hayır (Yok)' }]}
                                    />
                                    {data.acik_icra_varmi === 'Evet' && (
                                        <Input
                                            label="İcra Detayı / Tutarı"
                                            value={data.acik_icra_detay || ''}
                                            onChange={(e) => handleChange('acik_icra_detay', e.target.value)}
                                            className="border-red-200 bg-red-50"
                                        />
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Select
                                                label="Dava Dosyası"
                                                value={data.dava_dosyasi_varmi || 'Hayır'}
                                                onChange={(e) => handleChange('dava_dosyasi_varmi', e.target.value)}
                                                options={[{ value: 'Evet', label: 'Evet' }, { value: 'Hayır', label: 'Hayır' }]}
                                            />
                                            {data.dava_dosyasi_varmi === 'Evet' && (
                                                <Input
                                                    placeholder="Dava Detayı"
                                                    value={data.dava_detay || ''}
                                                    onChange={(e) => handleChange('dava_detay', e.target.value)}
                                                    className="mt-1 border-orange-200 bg-orange-50"
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <Select
                                                label="Kapalı İcra"
                                                value={data.kapali_icra_varmi || 'Hayır'}
                                                onChange={(e) => handleChange('kapali_icra_varmi', e.target.value)}
                                                options={[{ value: 'Evet', label: 'Evet' }, { value: 'Hayır', label: 'Hayır' }]}
                                            />
                                            {data.kapali_icra_varmi === 'Evet' && (
                                                <Input
                                                    placeholder="Kapanış Şekli"
                                                    value={data.kapali_icra_kapanis_sekli || ''}
                                                    onChange={(e) => handleChange('kapali_icra_kapanis_sekli', e.target.value)}
                                                    className="mt-1 border-green-200 bg-green-50"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase">Avukat Sorgusu</h4>
                                        <div className="grid grid-cols-2 gap-3 mb-2">
                                            <Select
                                                value={data.avukat_sorgu_durumu || 'Yapılmadı'}
                                                onChange={(e) => handleChange('avukat_sorgu_durumu', e.target.value)}
                                                options={[
                                                    { value: 'Yapılmadı', label: 'Yapılmadı' },
                                                    { value: 'Sorgu Bekleniyor', label: '⏳ Bekliyor' },
                                                    { value: 'Temiz', label: '✅ Temiz' },
                                                    { value: 'Riskli', label: '⚠️ Riskli/Sorunlu' },
                                                    { value: 'Onaylandı', label: 'Olumlu' },
                                                    { value: 'Reddedildi', label: 'Olumsuz' },
                                                ]}
                                                className={data.avukat_sorgu_durumu === 'Temiz' ? 'bg-green-50 border-green-200' : ''}
                                            />
                                        </div>
                                        <textarea
                                            className="w-full border p-2 rounded text-sm bg-gray-50 focus:bg-white transition-colors"
                                            rows={2}
                                            placeholder="Avukatın notu..."
                                            value={data.avukat_sorgu_sonuc || ''}
                                            onChange={(e) => handleChange('avukat_sorgu_sonuc', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Assets */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-indigo-500" /> Varlık Bilgileri
                                </h3>
                                <div className="space-y-4">
                                    <Select
                                        label="Mülkiyet Durumu"
                                        value={data.mulkiyet_durumu || ''}
                                        onChange={(e) => handleChange('mulkiyet_durumu', e.target.value)}
                                        options={[
                                            { value: 'Aile evi', label: 'Aile Evi' },
                                            { value: 'Kira', label: 'Kira' },
                                            { value: 'Kendi evi', label: 'Kendi Evi' },
                                            { value: 'Lojman', label: 'Lojman' },
                                        ]}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Select
                                                label="Tapu Var mı?"
                                                value={data.tapu_varmi || 'Hayır'}
                                                onChange={(e) => handleChange('tapu_varmi', e.target.value)}
                                                options={[{ value: 'Evet', label: 'Evet' }, { value: 'Hayır', label: 'Hayır' }]}
                                            />
                                            {data.tapu_varmi === 'Evet' && (
                                                <Input
                                                    placeholder="İl/İlçe/Değer"
                                                    value={data.tapu_detay || ''}
                                                    onChange={(e) => handleChange('tapu_detay', e.target.value)}
                                                    className="mt-1"
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <Select
                                                label="Araç Var mı?"
                                                value={data.arac_varmi || 'Hayır'}
                                                onChange={(e) => handleChange('arac_varmi', e.target.value)}
                                                options={[{ value: 'Evet', label: 'Evet' }, { value: 'Hayır', label: 'Hayır' }]}
                                            />
                                            {data.arac_varmi === 'Evet' && (
                                                <Input
                                                    placeholder="Marka/Model"
                                                    value={data.arac_detay || ''}
                                                    onChange={(e) => handleChange('arac_detay', e.target.value)}
                                                    className="mt-1"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Guarantor Section Removed - Moved to own tab */}
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'kefil' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Kefil Personal Info */}
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-indigo-500" /> Kefil Kimlik & İş
                                </h3>
                                <div className="space-y-4">
                                    <Input
                                        label="Ad Soyad"
                                        value={data.kefil_ad_soyad || ''}
                                        onChange={(e) => handleChange('kefil_ad_soyad', e.target.value)}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="TC Kimlik"
                                            value={data.kefil_tc_kimlik || ''}
                                            onChange={(e) => handleChange('kefil_tc_kimlik', e.target.value)}
                                            maxLength={11}
                                        />
                                        <Input
                                            label="Telefon"
                                            value={data.kefil_telefon || ''}
                                            onChange={(e) => handleChange('kefil_telefon', e.target.value)}
                                        />
                                    </div>
                                    <Input
                                        label="Meslek / İş"
                                        value={data.kefil_meslek_is || ''}
                                        onChange={(e) => handleChange('kefil_meslek_is', e.target.value)}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Maaş Bilgisi"
                                            value={data.kefil_son_yatan_maas || ''}
                                            onChange={(e) => handleChange('kefil_son_yatan_maas', e.target.value)}
                                        />
                                        <Input
                                            label="Çalışma Süresi (Ay)"
                                            type="number"
                                            value={data.kefil_ayni_isyerinde_sure_ay || ''}
                                            onChange={(e) => handleChange('kefil_ayni_isyerinde_sure_ay', e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Select
                                            label="İkametgah"
                                            value={data.kefil_ikametgah_varmi || 'Yok'}
                                            onChange={(e) => handleChange('kefil_ikametgah_varmi', e.target.value)}
                                            options={[{ value: 'Var', label: 'Var' }, { value: 'Yok', label: 'Yok' }]}
                                        />
                                        <Select
                                            label="Hizmet Dökümü"
                                            value={data.kefil_hizmet_dokumu_varmi || 'Yok'}
                                            onChange={(e) => handleChange('kefil_hizmet_dokumu_varmi', e.target.value)}
                                            options={[{ value: 'Var', label: 'Var' }, { value: 'Yok', label: 'Yok' }]}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Kefil Legal & Assets (Combined for layout balance) */}
                            <div className="space-y-6">
                                {/* Legal */}
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                                        <Scale className="w-4 h-4 text-red-500" /> Kefil Yasal Durum
                                    </h3>
                                    <div className="space-y-4">
                                        <Select
                                            label="Açık İcra Dosyası"
                                            value={data.kefil_acik_icra_varmi || 'Hayır'}
                                            onChange={(e) => handleChange('kefil_acik_icra_varmi', e.target.value)}
                                            options={[{ value: 'Evet', label: 'Evet (Var)' }, { value: 'Hayır', label: 'Hayır (Yok)' }]}
                                        />
                                        {data.kefil_acik_icra_varmi === 'Evet' && (
                                            <Input
                                                label="İcra Detayı"
                                                value={data.kefil_acik_icra_detay || ''}
                                                onChange={(e) => handleChange('kefil_acik_icra_detay', e.target.value)}
                                                className="border-red-200 bg-red-50"
                                            />
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Select
                                                    label="Dava Dosyası"
                                                    value={data.kefil_dava_dosyasi_varmi || 'Hayır'}
                                                    onChange={(e) => handleChange('kefil_dava_dosyasi_varmi', e.target.value)}
                                                    options={[{ value: 'Evet', label: 'Evet' }, { value: 'Hayır', label: 'Hayır' }]}
                                                />
                                                {data.kefil_dava_dosyasi_varmi === 'Evet' && (
                                                    <Input
                                                        placeholder="Dava Detayı"
                                                        value={data.kefil_dava_detay || ''}
                                                        onChange={(e) => handleChange('kefil_dava_detay', e.target.value)}
                                                        className="mt-1 border-orange-200 bg-orange-50"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <Select
                                                    label="Kapalı İcra"
                                                    value={data.kefil_kapali_icra_varmi || 'Hayır'}
                                                    onChange={(e) => handleChange('kefil_kapali_icra_varmi', e.target.value)}
                                                    options={[{ value: 'Evet', label: 'Evet' }, { value: 'Hayır', label: 'Hayır' }]}
                                                />
                                                {data.kefil_kapali_icra_varmi === 'Evet' && (
                                                    <Input
                                                        placeholder="Kapanış Şekli"
                                                        value={data.kefil_kapali_icra_kapanis_sekli || ''}
                                                        onChange={(e) => handleChange('kefil_kapali_icra_kapanis_sekli', e.target.value)}
                                                        className="mt-1 border-green-200 bg-green-50"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t">
                                            <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase">Kefil Avukat Sorgusu</h4>
                                            <div className="grid grid-cols-2 gap-3 mb-2">
                                                <Select
                                                    value={data.kefil_avukat_sorgu_durumu || 'Yapılmadı'}
                                                    onChange={(e) => handleChange('kefil_avukat_sorgu_durumu', e.target.value)}
                                                    options={[
                                                        { value: 'Yapılmadı', label: 'Yapılmadı' },
                                                        { value: 'Sorgu Bekleniyor', label: '⏳ Bekliyor' },
                                                        { value: 'Temiz', label: '✅ Temiz' },
                                                        { value: 'Riskli', label: '⚠️ Riskli/Sorunlu' },
                                                        { value: 'Onaylandı', label: 'Olumlu' },
                                                        { value: 'Reddedildi', label: 'Olumsuz' },
                                                    ]}
                                                />
                                            </div>
                                            <textarea
                                                className="w-full border p-2 rounded text-sm bg-gray-50 focus:bg-white transition-colors"
                                                rows={2}
                                                placeholder="Avukatın kefil notu..."
                                                value={data.kefil_avukat_sorgu_sonuc || ''}
                                                onChange={(e) => handleChange('kefil_avukat_sorgu_sonuc', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Assets */}
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                                        <Home className="w-4 h-4 text-emerald-500" /> Kefil Varlık Bilgileri
                                    </h3>
                                    <div className="space-y-4">
                                        <Select
                                            label="Mülkiyet Durumu"
                                            value={data.kefil_mulkiyet_durumu || ''}
                                            onChange={(e) => handleChange('kefil_mulkiyet_durumu', e.target.value)}
                                            options={[
                                                { value: 'Aile evi', label: 'Aile Evi' },
                                                { value: 'Kira', label: 'Kira' },
                                                { value: 'Kendi evi', label: 'Kendi Evi' },
                                                { value: 'Lojman', label: 'Lojman' },
                                            ]}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Select
                                                    label="Tapu Var mı?"
                                                    value={data.kefil_tapu_varmi || 'Hayır'}
                                                    onChange={(e) => handleChange('kefil_tapu_varmi', e.target.value)}
                                                    options={[{ value: 'Evet', label: 'Evet' }, { value: 'Hayır', label: 'Hayır' }]}
                                                />
                                                {data.kefil_tapu_varmi === 'Evet' && (
                                                    <Input
                                                        placeholder="İl/İlçe/Değer"
                                                        value={data.kefil_tapu_detay || ''}
                                                        onChange={(e) => handleChange('kefil_tapu_detay', e.target.value)}
                                                        className="mt-1"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <Select
                                                    label="Araç Var mı?"
                                                    value={data.kefil_arac_varmi || 'Hayır'}
                                                    onChange={(e) => handleChange('kefil_arac_varmi', e.target.value)}
                                                    options={[{ value: 'Evet', label: 'Evet' }, { value: 'Hayır', label: 'Hayır' }]}
                                                />
                                                {data.kefil_arac_varmi === 'Evet' && (
                                                    <Input
                                                        placeholder="Marka/Model"
                                                        value={data.kefil_arac_detay || ''}
                                                        onChange={(e) => handleChange('kefil_arac_detay', e.target.value)}
                                                        className="mt-1"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'urun' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-orange-500" /> Ürün & Talep
                                </h3>
                                <div className="space-y-4">
                                    <Input
                                        label="Talep Edilen Ürün"
                                        value={data.talep_edilen_urun || ''}
                                        onChange={(e) => handleChange('talep_edilen_urun', e.target.value)}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Ürün Rengi"
                                            value={data.renk || ''}
                                            onChange={(e) => handleChange('renk', e.target.value)}
                                        />
                                        <Input
                                            label="Kredi Limiti"
                                            type="number"
                                            value={data.kredi_limiti || ''}
                                            onChange={(e) => handleChange('kredi_limiti', e.target.value)}
                                            className="border-green-200 bg-green-50"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-indigo-100 to-transparent rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2 relative z-10">
                                    <Smartphone className="w-4 h-4 text-indigo-600" /> Satılan Cihaz & Teslimat
                                </h3>

                                <div className="space-y-4 relative z-10">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <Input
                                            label="Marka"
                                            value={data.marka || ''}
                                            onChange={(e) => handleChange('marka', e.target.value)}
                                            placeholder="Örn: Apple"
                                        />
                                        <Input
                                            label="Model"
                                            value={data.model || ''}
                                            onChange={(e) => handleChange('model', e.target.value)}
                                            placeholder="Örn: iPhone 15"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <Input
                                            label="IMEI Numarası"
                                            value={data.urun_imei || ''}
                                            onChange={(e) => handleChange('urun_imei', e.target.value)}
                                            placeholder="15 haneli IMEI"
                                        />
                                        <Input
                                            label="Seri Numarası"
                                            value={data.urun_seri_no || ''}
                                            onChange={(e) => handleChange('urun_seri_no', e.target.value)}
                                            placeholder="Cihaz seri no"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <Input
                                            label="Satış Tarihi"
                                            type="date"
                                            value={data.satis_tarihi ? new Date(data.satis_tarihi).toISOString().split('T')[0] : ''}
                                            onChange={(e) => handleChange('satis_tarihi', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                        />
                                    </div>

                                    {!data.urun_imei && (
                                        <div className="text-center py-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50 mb-4">
                                            <p className="text-xs text-gray-500 mb-2">veya stoktan seçin</p>
                                            <button
                                                onClick={() => setIsStockModalOpen(true)}
                                                className="px-4 py-2 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-sm font-medium rounded-lg shadow-sm transition"
                                            >
                                                📦 Stoktan Cihaz Ata
                                            </button>
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-dashed">
                                        <Input
                                            label="Kargo Takip No"
                                            value={data.kargo_takip_no || ''}
                                            onChange={(e) => handleChange('kargo_takip_no', e.target.value)}
                                            placeholder="Kargo takip kodunu giriniz..."
                                        />
                                        {data.kargo_takip_no && (
                                            <a
                                                href={`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${data.kargo_takip_no}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block mt-2 text-xs text-center text-blue-600 hover:underline bg-blue-50 py-1 rounded"
                                            >
                                                🚚 Kargo Takibi İçin Tıkla
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'dosya' && (
                        <div className="p-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <ImageIcon className="w-5 h-5 text-indigo-600" /> Dosyalar & Belgeler
                                    </h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Upload Area 1 */}
                                    <div className="group">
                                        <label className="block text-sm font-medium text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">Kimlik / Belge 1</label>
                                        <div className="relative">
                                            {data.gorsel_1 ? (
                                                <div className="relative rounded-lg overflow-hidden border border-gray-200 group-hover:border-indigo-200 transition-all shadow-sm">
                                                    <img src={data.gorsel_1} alt="Belge 1" className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => window.open(data.gorsel_1, '_blank')}
                                                            className="p-2 bg-white rounded-full text-gray-900 hover:bg-gray-100"
                                                            title="Görüntüle"
                                                        >
                                                            <Search className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleChange('gorsel_1', '')}
                                                            className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50"
                                                            title="Sil"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-indigo-50/50 hover:border-indigo-300 transition-all cursor-pointer relative">
                                                    <input
                                                        type="file"
                                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                if (file.size > 5 * 1024 * 1024) {
                                                                    alert('⚠️ Dosya boyutu 5MB\'dan büyük olamaz!');
                                                                    return;
                                                                }
                                                                loadingToast('Dosya yükleniyor...');
                                                                setLoading(true);
                                                                const formData = new FormData();
                                                                formData.append('file', file);
                                                                fetch('/api/upload', { method: 'POST', body: formData })
                                                                    .then(res => res.json())
                                                                    .then(res => {
                                                                        if (res.url) handleChange('gorsel_1', res.url);
                                                                    })
                                                                    .finally(() => setLoading(false));
                                                            }
                                                        }}
                                                    />
                                                    <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-2 group-hover:text-indigo-400 transition-colors" />
                                                    <p className="text-sm text-gray-500 font-medium">Yüklemek için tıklayın veya sürükleyin</p>
                                                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF (Max 5MB)</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Upload Area 2 */}
                                    <div className="group">
                                        <label className="block text-sm font-medium text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">Ek Belge / Maaş Bordrosu</label>
                                        <div className="relative">
                                            {data.gorsel_2 ? (
                                                <div className="relative rounded-lg overflow-hidden border border-gray-200 group-hover:border-indigo-200 transition-all shadow-sm">
                                                    <img src={data.gorsel_2} alt="Belge 2" className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => window.open(data.gorsel_2, '_blank')}
                                                            className="p-2 bg-white rounded-full text-gray-900 hover:bg-gray-100"
                                                            title="Görüntüle"
                                                        >
                                                            <Search className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleChange('gorsel_2', '')}
                                                            className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50"
                                                            title="Sil"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-indigo-50/50 hover:border-indigo-300 transition-all cursor-pointer relative">
                                                    <input
                                                        type="file"
                                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                if (file.size > 5 * 1024 * 1024) {
                                                                    alert('⚠️ Dosya boyutu 5MB\'dan büyük olamaz!');
                                                                    return;
                                                                }
                                                                loadingToast('Dosya yükleniyor...');
                                                                setLoading(true);
                                                                const formData = new FormData();
                                                                formData.append('file', file);
                                                                fetch('/api/upload', { method: 'POST', body: formData })
                                                                    .then(res => res.json())
                                                                    .then(res => {
                                                                        if (res.url) handleChange('gorsel_2', res.url);
                                                                    })
                                                                    .finally(() => setLoading(false));
                                                            }
                                                        }}
                                                    />
                                                    <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2 group-hover:text-indigo-400 transition-colors" />
                                                    <p className="text-sm text-gray-500 font-medium">Yüklemek için tıklayın veya sürükleyin</p>
                                                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF (Max 5MB)</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'history' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4 text-gray-500" /> İşlem Geçmişi
                                </h3>
                                <button
                                    onClick={fetchLogs}
                                    className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 px-2 py-1 bg-indigo-50 rounded transition-colors"
                                >
                                    <RefreshCw className={`w-3 h-3 ${logsLoading ? 'animate-spin' : ''}`} /> Yenile
                                </button>
                            </div>

                            <div className="max-h-[500px] overflow-y-auto p-0">
                                {logsLoading ? (
                                    <div className="text-center py-12 text-gray-500 flex flex-col items-center justify-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
                                        <span className="text-sm font-medium">Loglar yükleniyor...</span>
                                    </div>
                                ) : logs.length === 0 ? (
                                    <div className="text-center py-12 text-gray-400 bg-gray-50/30">
                                        <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p>Henüz işlem kaydı bulunmuyor.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {logs.map((log) => (
                                            <div key={log.log_id} className="p-4 text-sm hover:bg-gray-50 transition-colors group">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide shadow-sm ${log.action === 'SEND_SMS' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                            log.action === 'SEND_WHATSAPP' ? 'bg-teal-100 text-teal-700 border border-teal-200' :
                                                                log.action === 'UPDATE_STATUS' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                                                    log.action === 'PULL_LEAD' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                                                        'bg-gray-100 text-gray-700 border border-gray-200'
                                                            }`}>
                                                            {log.action === 'SEND_SMS' ? 'SMS' :
                                                                log.action === 'SEND_WHATSAPP' ? 'WHATSAPP' :
                                                                    log.action === 'UPDATE_STATUS' ? 'DURUM' :
                                                                        log.action === 'PULL_LEAD' ? 'HAVUZ' : log.action}
                                                        </span>
                                                        <span className="text-gray-500 font-medium text-xs">
                                                            {log.user_email?.split('@')[0]}
                                                        </span>
                                                    </div>
                                                    <span className="text-gray-400 text-[10px] font-mono group-hover:text-gray-600 transition-colors">
                                                        {new Date(log.timestamp).toLocaleString('tr-TR')}
                                                    </span>
                                                </div>

                                                {/* Content based on action */}
                                                <div className="pl-2 border-l-2 border-gray-100 ml-1 mt-2">
                                                    {log.action === 'UPDATE_STATUS' && (
                                                        <div className="flex items-center gap-2 text-gray-700 bg-white p-2 rounded border border-gray-100 shadow-sm w-fit">
                                                            <span className="line-through text-gray-400 text-xs">{log.old_value}</span>
                                                            <span className="text-gray-300">➜</span>
                                                            <span className="font-bold text-indigo-600">{log.new_value}</span>
                                                        </div>
                                                    )}

                                                    {log.action === 'SEND_SMS' && (
                                                        <div className="p-2 bg-green-50/50 border border-green-100 rounded text-green-800 text-xs italic font-medium">
                                                            "{log.new_value}"
                                                        </div>
                                                    )}

                                                    {log.action === 'SEND_WHATSAPP' && (
                                                        <div className="p-2 bg-teal-50/50 border border-teal-100 rounded text-teal-800 text-xs italic font-medium">
                                                            Whatsapp mesajı gönderildi.
                                                        </div>
                                                    )}

                                                    {log.note && (
                                                        <p className="mt-1 text-gray-600 italic">
                                                            📝 {log.note}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
            </div >

            {/* --- ACTION FOOTER (Sticky) --- */}
            {
                activeTab === 'details' && (
                    <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="primary"
                                className="bg-green-600 hover:bg-green-700 text-white w-full md:w-auto shadow-md"
                                onClick={() => setIsWhatsAppModalOpen(true)}
                            >
                                <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
                            </Button>
                        </div>
                    </div>
                )
            }

            {/* MODALS */}
            {/* SMS Modal */}
            {
                isSmsModalOpen && (
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
                )
            }

            {/* WhatsApp Modal */}
            {
                isWhatsAppModalOpen && (
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
                )
            }
            {
                isStockModalOpen && (
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
                )
            }

            <ApprovalSummaryModal
                isOpen={isApprovalModalOpen}
                onClose={() => setIsApprovalModalOpen(false)}
                customer={data}
            />

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
*Meslek / Son iş yeri çalışma süresi :* ${customer.meslek_is || '-'} / ${customer.ayni_isyerinde_sure_ay || '?'}
*Son yatan maaş:* ${customer.son_yatan_maas || '-'}
*Winner No:* ${customer.winner_musteri_no || '-'}
*E-Devlet Şifre:* ${customer.e_devlet_sifre || '-'}
*İkametgah:* ${customer.ikametgah_varmi || '-'}
*Psikoteknik:* ${customer.psikoteknik_varmi || '-'}
*Mülkiyet :* ${customer.mulkiyet_durumu || '-'}
*Dava Dosyası :* ${customer.dava_dosyasi_varmi || '-'} ${customer.dava_detay || ''}
*Gizli Dosyası :* ${customer.gizli_dosya_varmi || '-'} ${customer.gizli_dosya_detay || ''}
*Açık icrası :* ${customer.acik_icra_varmi || '-'} ${customer.acik_icra_detay || ''}
*Kapalı icra :* ${customer.kapali_icra_varmi || '-'} Açıklama: ${customer.kapali_icra_kapanis_sekli || ''}
*Tapu Var mı :* ${customer.tapu_varmi || '-'}
*Araç Var mı :* ${customer.arac_varmi || '-'}
*Avukat Sorgusu :* ${customer.avukat_sorgu_durumu || '-'} Açıklaması ${customer.avukat_sorgu_sonuc || ''}`;

        if (customer.arama_not_kisa) summary += `\n\n📝 *Satıcı Notu:* ${customer.arama_not_kisa}`;
        if (customer.tapu_varmi === 'Evet' && customer.tapu_detay) summary += `\n\n🏠 *Tapu Detayı:* ${customer.tapu_detay}`;
        if (customer.arac_varmi === 'Evet' && customer.arac_detay) summary += `\n🚗 *Araç Detayı:* ${customer.arac_detay}`;

        if (customer.kefil_ad_soyad) {
            summary += `\n\n--- 🤝 *KEFİL BİLGİLERİ* ---\n`;
            summary += `*Adı Soyadı:* ${customer.kefil_ad_soyad}\n`;
            summary += `*Telefon:* ${customer.kefil_telefon || '-'}\n`;
            summary += `*TC:* ${customer.kefil_tc_kimlik || '-'}\n`;
            summary += `*Meslek:* ${customer.kefil_meslek_is || '-'}\n`;
            summary += `*Maaş:* ${customer.kefil_son_yatan_maas || '-'}\n`;
            summary += `*Çalışma Süresi:* ${customer.kefil_ayni_isyerinde_sure_ay || '-'} Ay\n`;
            summary += `*İkametgah:* ${customer.kefil_ikametgah_varmi || '-'}\n`;
            summary += `*İcra Durumu:* ${customer.kefil_acik_icra_varmi || '-'}`;
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
        const printWindow = window.open('', '', 'width=900,height=900');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Teslimat & Onay Raporu - ${customer.ad_soyad}</title>
                        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                        <style>
                            @page { size: A4; margin: 15mm; }
                            body { font-family: 'Inter', sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.4; }
                            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; items-items: center; }
                            .brand { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; text-transform: uppercase; }
                            .meta { text-align: right; font-size: 11px; color: #64748b; }
                            
                            h2 { font-size: 16px; font-weight: 700; background: #f1f5f9; padding: 8px 12px; border-left: 4px solid #3b82f6; margin-top: 25px; margin-bottom: 15px; border-radius: 0 4px 4px 0; }
                            
                            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                            .field { margin-bottom: 8px; font-size: 13px; }
                            .label { font-weight: 600; color: #475569; width: 140px; display: inline-block; }
                            .value { font-weight: 500; color: #0f172a; }
                            
                            .note-box { border: 1px dashed #cbd5e1; background: #f8fafc; padding: 15px; border-radius: 6px; font-size: 12px; margin-top: 10px; min-height: 60px; }
                            
                            .signatures { margin-top: 50px; display: flex; gap: 30px; page-break-inside: avoid; }
                            .sig-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; height: 120px; position: relative; }
                            .sig-header { background: #f1f5f9; padding: 8px; text-align: center; font-size: 12px; font-weight: 700; border-bottom: 1px solid #e2e8f0; }
                            .sig-line { position: absolute; bottom: 30px; left: 20px; right: 20px; border-top: 1px solid #000; }
                            .sig-label { position: absolute; bottom: 10px; left: 0; right: 0; text-align: center; font-size: 10px; color: #64748b; }

                            .device-info { background: #eff6ff; border: 1px solid #dbeafe; padding: 15px; border-radius: 6px; }

                            @media print {
                                body { -webkit-print-color-adjust: exact; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div>
                                <div class="brand">CEPTE KOLAY</div>
                                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Elektronik Cihaz Satış & Finansman Hizmetleri</div>
                            </div>
                            <div class="meta">
                                Tarih: ${new Date().toLocaleDateString('tr-TR')}<br>
                                Ref No: ${customer.id.substring(0, 8).toUpperCase()}
                            </div>
                        </div>

                        <h2>Müşteri Bilgileri</h2>
                        <div class="grid-2">
                             <div>
                                <div class="field"><span class="label">Ad Soyad:</span> <span class="value">${customer.ad_soyad}</span></div>
                                <div class="field"><span class="label">TC Kimlik:</span> <span class="value">${customer.tc_kimlik || '-'}</span></div>
                                <div class="field"><span class="label">Telefon:</span> <span class="value">${customer.telefon}</span></div>
                                <div class="field"><span class="label">Doğum Tarihi:</span> <span class="value">${customer.dogum_tarihi || '-'}</span></div>
                             </div>
                             <div>
                                <div class="field"><span class="label">Şehir / İlçe:</span> <span class="value">${customer.sehir} / ${customer.ilce}</span></div>
                                <div class="field"><span class="label">Meslek:</span> <span class="value">${customer.meslek_is}</span></div>
                                <div class="field"><span class="label">Winner No:</span> <span class="value">${customer.winner_musteri_no || '-'}</span></div>
                             </div>
                        </div>

                        <h2>Cihaz & Teslimat Bilgileri</h2>
                        <div class="device-info">
                            <div class="grid-2">
                                <div>
                                    <div class="field"><span class="label">Satılan Ürün:</span> <span class="value" style="font-size:14px; color:#1d4ed8;">${customer.talep_edilen_urun}</span></div>
                                    <div class="field"><span class="label">Teslim Tarihi:</span> <span class="value">${customer.teslim_tarihi ? new Date(customer.teslim_tarihi).toLocaleDateString() : '-'}</span></div>
                                </div>
                                <div>
                                    <div class="field"><span class="label">IMEI No:</span> <span class="value font-mono">${customer.urun_imei || '-'}</span></div>
                                    <div class="field"><span class="label">Seri No:</span> <span class="value font-mono">${customer.urun_seri_no || '-'}</span></div>
                                </div>
                            </div>
                        </div>

                        ${customer.kefil_ad_soyad ? `
                        <h2>Kefil Bilgileri</h2>
                        <div class="grid-2">
                             <div>
                                <div class="field"><span class="label">Ad Soyad:</span> <span class="value">${customer.kefil_ad_soyad}</span></div>
                                <div class="field"><span class="label">TC Kimlik:</span> <span class="value">${customer.kefil_tc_kimlik || '-'}</span></div>
                             </div>
                             <div>
                                <div class="field"><span class="label">Telefon:</span> <span class="value">${customer.kefil_telefon}</span></div>
                                <div class="field"><span class="label">Meslek:</span> <span class="value">${customer.kefil_meslek_is}</span></div>
                             </div>
                        </div>
                        ` : ''}

                        <h2>Satıcı & Onay Notları</h2>
                        <div class="note-box">
                            ${customer.arama_not_kisa || 'Not girilmemiş.'}
                        </div>
                        
                        <div style="margin-top:20px; font-size: 11px; text-align: justify; color: #64748b;">
                            * Yukarıdaki bilgilerin doğruluğunu beyan ederim. Cihazı eksiksiz ve çalışır durumda teslim aldım.
                            * Ödeme koşullarına uyacağımı taahhüt ederim.
                        </div>

                        <div class="signatures">
                            <div class="sig-box">
                                <div class="sig-header">MÜŞTERİ</div>
                                <div class="sig-label">${customer.ad_soyad}<br>İmza</div>
                            </div>
                            <div class="sig-box">
                                <div class="sig-header">KEFİL (Varsa)</div>
                                <div class="sig-label">${customer.kefil_ad_soyad || ''}<br>İmza</div>
                            </div>
                            <div class="sig-box">
                                <div class="sig-header">ONAYLAYAN / SATICI</div>
                                <div class="sig-label">${customer.sahip ? customer.sahip.split('@')[0] : 'Yetkili'}<br>Kaşe & İmza</div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden ring-1 ring-gray-900/5">
                <div className="p-5 border-b flex justify-between items-center bg-gradient-to-r from-indigo-600 to-indigo-800 text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        📋 Yönetici Onay & Teslimat Özeti
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 relative group">
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" className="h-8 text-xs bg-white shadow-sm border" onClick={handleCopy}>Kopyala</Button>
                        </div>
                        <pre className="font-mono text-xs md:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {summaryText}
                        </pre>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                            onClick={handleWhatsApp}
                            className="bg-[#25D366] hover:bg-[#128C7E] text-white border-none h-12 text-md shadow-md hover:shadow-lg transition-all"
                        >
                            <MessageSquare className="w-5 h-5 mr-2" /> WhatsApp Gönder
                        </Button>
                        <Button
                            onClick={handlePrint}
                            className="bg-slate-800 hover:bg-slate-900 text-white border-none h-12 text-md shadow-md hover:shadow-lg transition-all"
                        >
                            <Printer className="w-5 h-5 mr-2" /> Resmi Rapor Yazdır
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
