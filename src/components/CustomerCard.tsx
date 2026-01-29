'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Customer, LeadStatus, InventoryItem, LogEntry, SoldItem } from '@/lib/types';

import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Loader2, AlertCircle, CheckCircle, Info, Phone, Package, Smartphone, Search, RefreshCw, MessageSquare, Scale, Briefcase, Home, ShieldCheck, X, Shield, Printer, User, Calendar, ShieldAlert, FileText, Image as ImageIcon } from 'lucide-react';
import { cityList, getDistrictsByCityCode } from 'turkey-neighbourhoods';
import { replaceTemplateVariables as replaceVariables } from '@/lib/template-utils';
import { CollectionNotes } from './CollectionNotes';
import { CustomerLogViewer } from './CustomerLogViewer';




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

    // Collection Configs
    const [customerClasses, setCustomerClasses] = useState<any[]>([]);
    const [collectionStatuses, setCollectionStatuses] = useState<any[]>([]);

    useEffect(() => {
        if (initialData.sehir) {
            const city = cityList.find(c => c.name === initialData.sehir);
            if (city) {
                const districtList = getDistrictsByCityCode(city.code);
                setDistricts(districtList);
            }
        }

        // Fetch Collection Configs
        fetch('/api/admin/collection/classes').then(res => res.json()).then(res => { if (res.success) setCustomerClasses(res.data); });
        fetch('/api/admin/collection/statuses').then(res => res.json()).then(res => { if (res.success) setCollectionStatuses(res.data); });

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

    const logUserAction = async (action: string, note?: string) => {
        try {
            await fetch('/api/logs/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_id: data.id,
                    action,
                    note: note || ''
                })
            });
        } catch (err) {
            console.error('Failed to log action:', action, err);
        }
    };

    // Inventory State
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
    const [stockItems, setStockItems] = useState<InventoryItem[]>([]);
    const [stockLoading, setStockLoading] = useState(false);
    const [selectedStockItem, setSelectedStockItem] = useState<InventoryItem | null>(null);
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);

    const [stockSearch, setStockSearch] = useState('');

    // Logs State
    const [activeTab, setActiveTab] = useState<'details' | 'is' | 'yasal' | 'urun' | 'history' | 'kefil'>('details');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);

    // Dynamic Statuses & Notes
    const [statusOptions, setStatusOptions] = useState<{ value: string, label: string }[]>([]);
    const [quickNotes, setQuickNotes] = useState<{ label: string }[]>([]);

    // Dynamic Templates
    const [smsTemplates, setSmsTemplates] = useState<any[]>([]);
    const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]); // New Users State

    // Cancellation Reasons
    const [cancellationReasons, setCancellationReasons] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        const fetchReasons = async () => {
            try {
                const res = await fetch('/api/settings/reasons');
                const json = await res.json();
                if (json.success && json.reasons) {
                    setCancellationReasons(json.reasons.map((r: any) => ({ value: r.reason, label: r.reason })));
                } else {
                    setCancellationReasons([
                        { value: 'Fiyat Yüksek', label: 'Fiyat Yüksek' },
                        { value: 'İhtiyacı Kalmamış', label: 'İhtiyacı Kalmamış' },
                        { value: 'Diğer', label: 'Diğer' }
                    ]);
                }
            } catch (error) {
                console.error('Failed to fetch cancellation reasons', error);
                setCancellationReasons([
                    { value: 'Fiyat Yüksek', label: 'Fiyat Yüksek' },
                    { value: 'Diğer', label: 'Diğer' }
                ]);
            }
        };
        fetchReasons();
    }, []);

    const replaceTemplateVariables = (content: string) => {
        return replaceVariables(content, {
            name: data.ad_soyad || '',
            ad_soyad: data.ad_soyad || '',
            limit: data.kredi_limiti ? `${data.kredi_limiti} TL` : '...',
            product: data.talep_edilen_urun || 'Cihaz',
            urun: data.talep_edilen_urun || 'Cihaz',
            imei: data.urun_imei || '...',
            serial: data.urun_seri_no || '...',
            seri_no: data.urun_seri_no || '...'
        });
    };

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

        // Fetch Templates
        fetch('/api/admin/sms-templates?type=SMS')
            .then(res => res.json())
            .then(data => { if (data.templates) setSmsTemplates(data.templates); })
            .catch(err => console.error('SMS Template fetch error:', err));

        fetch('/api/admin/sms-templates?type=WHATSAPP')
            .then(res => res.json())
            .then(data => { if (data.templates) setWhatsappTemplates(data.templates); })
            .catch(err => console.error('WhatsApp Template fetch error:', err));

        // Fetch Users for Ownership Change
        fetch('/api/admin/users')
            .then(res => res.json())
            .then(data => { if (data.users) setUsers(data.users); })
            .catch(err => console.error('Users fetch error:', err));

    }, []);

    // Automated 6-Month Salary Average Calculation
    useEffect(() => {
        const salaries = [
            data.maas_1, data.maas_2, data.maas_3,
            data.maas_4, data.maas_5, data.maas_6
        ].map(s => parseFloat(s || '0') || 0);

        const count = salaries.filter(s => s > 0).length;
        if (count > 0) {
            const sum = salaries.reduce((a, b) => a + b, 0);
            const avg = Math.round(sum / count);
            if (data.maas_ortalama !== String(avg)) {
                setData(prev => ({ ...prev, maas_ortalama: String(avg) }));
            }
        } else {
            if (data.maas_ortalama !== '0' && data.maas_ortalama !== '') {
                setData(prev => ({ ...prev, maas_ortalama: '0' }));
            }
        }
    }, [data.maas_1, data.maas_2, data.maas_3, data.maas_4, data.maas_5, data.maas_6]);

    // SMS Modal State
    const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
    const [smsMessage, setSmsMessage] = useState('');
    const [smsLoading, setSmsLoading] = useState(false);

    // WhatsApp Modal State
    const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
    const [whatsAppMessage, setWhatsAppMessage] = useState('');
    const [whatsAppLoading, setWhatsAppLoading] = useState(false);

    // Verify Modal State
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

    // Multi-Product State
    const [multiProducts, setMultiProducts] = useState<any[]>([]);
    const [showManualAdd, setShowManualAdd] = useState(false);
    const [manualProduct, setManualProduct] = useState({
        marka: '',
        model: '',
        imei: '',
        fiyat: '',
        tarih: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (data.satilan_urunler) {
            try {
                const parsed = typeof data.satilan_urunler === 'string' ? JSON.parse(data.satilan_urunler) : data.satilan_urunler;
                if (Array.isArray(parsed)) {
                    setMultiProducts(parsed);
                }
            } catch (e) {
                console.error("Parse error", e);
            }
        } else if (data.urun_imei) {
            // Legacy Migration logic inside effect
            const legacyItem = {
                imei: data.urun_imei,
                seri_no: data.urun_seri_no,
                marka: data.marka,
                model: data.model,
                satis_tarihi: data.satis_tarihi || data.teslim_tarihi || new Date().toISOString(),
                fiyat: data.kredi_limiti || 0
            };
            setMultiProducts([legacyItem]);
        } else {
            setMultiProducts([]);
        }
    }, [data.satilan_urunler, data.urun_imei]);



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
        setSelectedStockItem(item);
        setIsPriceModalOpen(true);
    };

    const confirmStockAssign = async (price: number, term: number) => {
        if (!selectedStockItem) return;

        setStockLoading(true); // Re-use stock loading state
        try {
            // 1. Backend Assignment
            const res = await fetch('/api/inventory/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inventoryId: selectedStockItem.id,
                    customerId: data.id
                })
            });

            const json = await res.json();
            if (res.ok) {
                // 2. Update Local State
                const currentItems = data.satilan_urunler ? JSON.parse(data.satilan_urunler) : [];
                const newItem: SoldItem = {
                    marka: selectedStockItem.marka,
                    model: selectedStockItem.model,
                    imei: selectedStockItem.imei,
                    seri_no: selectedStockItem.seri_no,
                    satis_tarihi: new Date().toISOString(),
                    // Price Fields
                    satis_fiyati: price,
                    vade_ay: term,
                    fiyat: price, // Legacy
                    garanti_baslangic: new Date().toISOString()
                };
                const updatedItems = [...currentItems, newItem];

                setData(prev => ({
                    ...prev,
                    urun_imei: selectedStockItem.imei,
                    urun_seri_no: selectedStockItem.seri_no,
                    satilan_urunler: JSON.stringify(updatedItems),
                    durum: 'Teslim edildi',
                    teslim_tarihi: data.teslim_tarihi || new Date().toISOString() // Only set if not already set
                }));
                // Update MultiProducts UI Helper State too if it exists? 
                // Creating a simplified sync:
                setMultiProducts(updatedItems);

                setIsPriceModalOpen(false);
                setIsStockModalOpen(false);
                setSelectedStockItem(null);
                alert('Cihaz başarıyla atandı.');
            } else {
                alert('Atama başarısız: ' + json.message);
            }
        } catch (error) {
            console.error('Stock Assign Error:', error);
            alert('Bir hata oluştu.');
        } finally {
            setStockLoading(false);
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
                    phone: data.telefon?.startsWith('0') ? data.telefon : '0' + data.telefon,
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
            // 1. Format phone number (ensure 90 prefix, handling leading 0)
            let phone = (data.telefon || '').replace(/\D/g, '');
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

        // VALIDATION: Cancellation Reason
        if (data.durum === 'İptal/Vazgeçti' && !data.iptal_nedeni) {
            setError('Lütfen iptal durumuna aldığınız müşteri için bir iptal nedeni seçiniz.');
            alert('Lütfen iptal durumuna aldığınız müşteri için bir iptal nedeni seçiniz.');
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

        // Validate delivery fields when marking as delivered - STOCK SELECTION MANDATORY
        // Only enforce if status is CHANGING TO delivered (allows editing legacy records without stock info)
        const isBecomingDelivered = (data.durum === 'Teslim edildi' || data.durum === 'Satış yapıldı/Tamamlandı') &&
            (initialData.durum !== 'Teslim edildi' && initialData.durum !== 'Satış yapıldı/Tamamlandı');

        if (isBecomingDelivered && (!data.urun_seri_no || !data.urun_imei)) {
            setError('⚠️ Teslimat tamamlamak için STOKTAN ürün seçmelisiniz.\n\nÜrün & Teslimat sekmesinden "Stoktan Ürün Seç" butonunu kullanın.');
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

            // Only auto-set date if status is NEWLY changing to Delivered.
            // If already delivered and just updating (e.g. Class), do NOT touch date (leave it null or as is).
            const isStatusChangeToDelivered = (data.durum === 'Teslim edildi' || data.durum === 'Satış yapıldı/Tamamlandı') &&
                (initialData.durum !== 'Teslim edildi' && initialData.durum !== 'Satış yapıldı/Tamamlandı');

            if (isStatusChangeToDelivered && !data.teslim_tarihi) {
                updateData.teslim_tarihi = now.toISOString();
                updateData.teslim_eden = data.sahip || 'Unknown';
            }

            // Note: If it's a legacy record with NO date, we leave it NO date so it isn't counted in "Today" reports.

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

                            {/* CLASS SELECTOR */}
                            <select
                                value={data.sinif || 'Normal'}
                                onChange={(e) => {
                                    const newVal = e.target.value;
                                    const updates: any = { sinif: newVal };

                                    // Auto-Sync Collection Status with Class
                                    if (newVal === 'Gecikme') {
                                        updates.tahsilat_durumu = 'Tahsilat Servisinde';
                                    } else {
                                        updates.tahsilat_durumu = 'Normal';
                                    }
                                    setData(prev => ({ ...prev, ...updates }));
                                }}
                                className={`text-xs font-bold rounded px-2 py-1 border outline-none cursor-pointer duration-200 ${data.sinif === 'Gecikme' ? 'bg-red-500 text-white border-red-400 focus:ring-red-300' :
                                    data.sinif === 'VIP' ? 'bg-amber-500 text-white border-amber-400 focus:ring-amber-300' :
                                        'bg-slate-700 text-slate-300 border-slate-600 focus:ring-slate-500'
                                    }`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {customerClasses.length > 0 ? customerClasses.map(c => (
                                    <option key={c.id} value={c.label} className="bg-slate-800 text-white">{c.label}</option>
                                )) : (
                                    <>
                                        <option value="Normal" className="bg-slate-800 text-white">Normal</option>
                                        <option value="VIP" className="bg-slate-800 text-white">VIP</option>
                                        <option value="Gecikme" className="bg-slate-800 text-white">Gecikme</option>
                                    </>
                                )}
                            </select>
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
                                    {['Yönetici', 'admin', 'Admin', 'yonetici'].includes(session?.user?.role || '') || ['ibrahimsentinmaz@gmail.com'].includes(session?.user?.email || '') ? (
                                        <select
                                            value={data.sahip || ''}
                                            onChange={(e) => handleChange('sahip', e.target.value)}
                                            className="bg-slate-700 text-white border border-slate-600 text-xs rounded px-1 py-0.5 focus:ring-1 focus:ring-amber-500 outline-none"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="">Sahipsiz</option>
                                            {users.map(u => (
                                                <option key={u.email} value={u.email}>{u.name || u.email}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span className="text-white">{data.sahip === session?.user.email ? 'Siz' : (data.sahip || 'Belirsiz').split('@')[0]}</span>
                                    )}
                                </div>
                            )}
                            <span className='flex items-center gap-1 hover:text-white transition-colors cursor-pointer' onClick={() => {
                                const clean = (data.telefon || '').replace(/\D/g, '');
                                const tel = clean.startsWith('0') ? clean : '0' + clean;
                                logUserAction('CLICK_CALL', 'Header Call Click');
                                window.open(`tel:${tel}`);
                            }}><Phone className="w-3 h-3" /> {data.telefon}</span>

                            {/* Verification Badge/Button */}
                            {data.telefon_onayli ? (
                                <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded border border-emerald-500/30 text-[10px] uppercase font-bold tracking-wider">
                                    <ShieldCheck className="w-3 h-3" /> Doğurlandı
                                </span>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsVerifyModalOpen(true); }}
                                    className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-400 text-white px-2 py-0.5 rounded border border-indigo-400/50 text-[10px] uppercase font-bold tracking-wider transition-colors shadow-sm"
                                >
                                    <ShieldAlert className="w-3 h-3" /> Doğrula
                                </button>
                            )}
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
                <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex flex-col-reverse md:flex-row items-center justify-between gap-3 sticky top-[73px] z-20 shadow-sm animate-in slide-in-from-top-1">
                    <div className="flex items-center justify-between w-full md:w-auto gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                // Validation for Contract
                                const missingFields = [];
                                if (!data.winner_musteri_no) missingFields.push('Müşteri No');
                                if (!data.ev_adresi) missingFields.push('Ev Adresi');
                                if (!data.mulkiyet_durumu) missingFields.push('Mülkiyet Durumu (Yasal ve Varlık sekmesinde)');

                                if (missingFields.length > 0) {
                                    alert(`⚠️ Sözleşme oluşturulamadı!\n\nLütfen şu alanları doldurun:\n- ${missingFields.join('\n- ')}`);
                                    return;
                                }
                                window.open(`/dashboard/contract/${data.id}`, '_blank');
                            }}
                            className="bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 text-xs shadow-sm"
                            title="Yazdır"
                        >
                            <Printer className="w-4 h-4 mr-2" /> Sözleşme Yazdır
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleLegalRequest}
                            className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs shadow-sm"
                        >
                            <Scale className="w-4 h-4 mr-2" /> İcra Servisi
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setIsApprovalModalOpen(true)}
                            className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs shadow-sm"
                        >
                            <Shield className="w-4 h-4 mr-2" /> Onaya Sun
                        </Button>
                    </div>

                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSave}
                        disabled={loading}
                        className={`w-full md:w-auto font-semibold shadow-lg border-0 transition-all active:scale-95 min-w-[120px] ring-offset-2 focus:ring-2 focus:ring-indigo-500 ${loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
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
                <TabButton id="kefil" label="Kefil Bilgileri" icon={ShieldCheck} />
                <TabButton id="history" label="Geçmiş & Loglar" icon={RefreshCw} />
            </div>

            {/* --- SCROLLABLE CONTENT --- */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 font-sans custom-scrollbar" >

                {/* COLLECTION PANEL - Only if Gecikme */}
                {data.sinif === 'Gecikme' && (
                    <div className="bg-red-50 border-b border-red-100 p-4 mb-4 rounded-xl shadow-sm animate-in slide-in-from-top-2">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <h3 className="text-red-800 font-bold mb-2 flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5" />
                                    Gecikme Takibi
                                </h3>
                                <div className="bg-white p-3 rounded-xl border border-red-200 shadow-sm">
                                    <label className="block text-xs font-bold text-red-700 mb-1 uppercase">Tahsilat Durumu</label>
                                    <select
                                        value={data.tahsilat_durumu || ''}
                                        onChange={(e) => handleChange('tahsilat_durumu', e.target.value)}
                                        className="w-full text-red-900 border-red-300 rounded focus:ring-red-500 mb-3"
                                    >
                                        <option value="">Seçiniz...</option>
                                        {collectionStatuses.map(s => (
                                            <option key={s.id} value={s.label}>{s.label}</option>
                                        ))}
                                    </select>

                                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                        <p><strong>Uyarı:</strong> Bu müşteri gecikme listesindedir.</p>
                                    </div>

                                    {/* PAYMENT PROMISE DATE */}
                                    {data.tahsilat_durumu && data.tahsilat_durumu.includes('Ödeme Sözü') && (
                                        <div className="mt-3 animate-in fade-in">
                                            <label className="block text-xs font-bold text-red-700 mb-1 uppercase">Ödeme Sözü Tarihi</label>
                                            <input
                                                type="date"
                                                value={data.odeme_sozu_tarihi ? new Date(data.odeme_sozu_tarihi).toISOString().split('T')[0] : ''}
                                                onChange={(e) => handleChange('odeme_sozu_tarihi', e.target.value)}
                                                className="w-full border border-red-300 rounded p-2 text-sm focus:ring-red-500 focus:border-red-500 outline-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-[2]">
                                <CollectionNotes leadId={data.id} />
                            </div>
                        </div>
                    </div>
                )}

                {/* ADMIN ALERTS BOARD */}
                {(data.onay_durumu === 'Kefil İstendi' || data.onay_durumu === 'Reddedildi' || data.onay_durumu === 'Onaylandı' || (data.admin_notu && data.admin_notu.length > 2)) && (
                    <div className={`mb-6 p-4 rounded-xl border-l-4 shadow-sm animate-in slide-in-from-top-2 duration-500 ${data.onay_durumu === 'Reddedildi' ? 'bg-red-50 border-red-500 text-red-900' :
                        data.onay_durumu === 'Kefil İstendi' ? 'bg-orange-50 border-orange-500 text-orange-900' :
                            data.onay_durumu === 'Onaylandı' ? 'bg-green-50 border-green-500 text-green-900' :
                                'bg-blue-50 border-blue-500 text-blue-900'
                        }`}>
                        <div className="flex items-start gap-3">
                            {data.onay_durumu === 'Reddedildi' && <ShieldAlert className="w-6 h-6 shrink-0 text-red-600" />}
                            {data.onay_durumu === 'Kefil İstendi' && <ShieldAlert className="w-6 h-6 shrink-0 text-orange-600" />}
                            {data.onay_durumu === 'Onaylandı' && <ShieldCheck className="w-6 h-6 shrink-0 text-green-600" />}
                            {!['Reddedildi', 'Kefil İstendi', 'Onaylandı'].includes(data.onay_durumu || '') && <Info className="w-6 h-6 shrink-0 text-blue-600" />}

                            <div className="flex-1">
                                <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                                    {data.onay_durumu ? data.onay_durumu.toUpperCase() : 'YÖNETİCİ NOTU'}
                                </h4>
                                {data.admin_notu && (
                                    <div className="bg-white/50 p-3 rounded-lg border border-black/5 mt-2">
                                        <p className="font-medium flex items-start gap-2">
                                            <span className="font-bold text-sm uppercase opacity-70 shrink-0 mt-0.5">Not:</span>
                                            {data.admin_notu}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

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
                                                <a
                                                    href={`tel:${(function () {
                                                        const clean = (data.telefon || '').replace(/\D/g, '');
                                                        return clean.startsWith('0') ? clean : '0' + clean;
                                                    })()}`}
                                                    onClick={() => logUserAction('CLICK_CALL', 'Communication Tab Call Click')}
                                                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 border border-green-200 transition-colors"
                                                    title="Ara"
                                                >
                                                    <Phone className="w-5 h-5" />
                                                </a>
                                                <button
                                                    onClick={() => {
                                                        const tel = data.telefon?.startsWith('0') ? data.telefon : '0' + data.telefon;
                                                        logUserAction('CLICK_WHATSAPP', 'Communication Tab WA Modal Open');
                                                        setIsWhatsAppModalOpen(true);
                                                    }}
                                                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 border border-green-200 transition-colors"
                                                    title="WhatsApp"
                                                >
                                                    <MessageSquare className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const tel = data.telefon?.startsWith('0') ? data.telefon : '0' + data.telefon;
                                                        logUserAction('CLICK_SMS', 'Communication Tab SMS Modal Open');
                                                        setIsSmsModalOpen(true);
                                                    }}
                                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors"
                                                    title="SMS"
                                                >
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
                                        <div className="col-span-2">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Ev Adresi (Sözleşme İçin)</label>
                                            <textarea
                                                className="w-full p-2 text-sm border rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                                                rows={2}
                                                value={data.ev_adresi || ''}
                                                onChange={(e) => handleChange('ev_adresi', e.target.value)}
                                                placeholder="Tam ev adresi..."
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
                                                    options={cancellationReasons}
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
                                            <Select
                                                label="Başvuru Kanalı"
                                                value={data.basvuru_kanali || ''}
                                                onChange={(e) => handleChange('basvuru_kanali', e.target.value)}
                                                options={[
                                                    { value: '', label: 'Seçiniz...' },
                                                    { value: 'Sosyal Medya', label: 'Sosyal Medya (Facebook/Instagram)' },
                                                    { value: 'Whatsapp', label: 'WhatsApp' },
                                                    { value: 'Google / Web', label: 'Google / Web Site' },
                                                    { value: 'Mağaza / Fiziksel', label: 'Mağaza Ziyareti' },
                                                    { value: 'Tavsiye / Referans', label: 'Tavsiye / Referans' },
                                                    { value: 'Sabit Hat / Telefon', label: 'Telefon Araması' },
                                                ]}
                                            />
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
                                        label="Genel Meslek"
                                        value={data.meslek || ''}
                                        onChange={(e) => handleChange('meslek', e.target.value)}
                                        placeholder="Ana meslek dalı"
                                    />
                                    <Input
                                        label="İş Yeri Ünvanı"
                                        value={data.is_yeri_unvani || ''}
                                        onChange={(e) => handleChange('is_yeri_unvani', e.target.value)}
                                        placeholder="Sözleşme için"
                                    />
                                    <Input
                                        label="İş Yeri Bilgisi"
                                        value={data.is_yeri_bilgisi || ''}
                                        onChange={(e) => handleChange('is_yeri_bilgisi', e.target.value)}
                                        placeholder="Ek iş yeri bilgileri"
                                    />
                                    <Input
                                        label="İş Adresi"
                                        value={data.is_adresi || ''}
                                        onChange={(e) => handleChange('is_adresi', e.target.value)}
                                        placeholder="Tam iş adresi"
                                    />
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Son 6 Aylık Maaş Bilgisi</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[1, 2, 3, 4, 5, 6].map(num => (
                                                <div key={num} className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-slate-500">{num}. Ay</label>
                                                    <input
                                                        type="number"
                                                        value={(data as any)[`maas_${num}`] || ''}
                                                        onChange={(e) => handleChange(`maas_${num}` as any, e.target.value)}
                                                        placeholder="0"
                                                        className="w-full p-2 text-sm border rounded bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-2 border-t border-slate-200 mt-2 flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-600">6 AYLIK ORTALAMA:</span>
                                            <span className="text-lg font-black text-indigo-700">{data.maas_ortalama || '0'} TL</span>
                                        </div>
                                    </div>
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
                                    {data.psikoteknik_varmi === 'Evet' && (
                                        <Input
                                            label="Psikoteknik Detay / Tarih"
                                            value={data.psikoteknik_notu || ''}
                                            onChange={(e) => handleChange('psikoteknik_notu', e.target.value)}
                                            placeholder="Geçerlilik tarihi veya not..."
                                            className="bg-yellow-50 border-yellow-200"
                                        />
                                    )}
                                    <Select
                                        label="Hizmet Dökümü (SGK)"
                                        value={data.hizmet_dokumu_varmi || 'Hayır'}
                                        onChange={(e) => handleChange('hizmet_dokumu_varmi', e.target.value)}
                                        options={[{ value: 'Evet', label: 'Var' }, { value: 'Hayır', label: 'Yok' }]}
                                    />
                                    <Select
                                        label="Çalışma Şekli"
                                        value={data.calisma_sekli || ''}
                                        onChange={(e) => handleChange('calisma_sekli', e.target.value)}
                                        options={[
                                            { value: '', label: 'Seçiniz...' },
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

                                    <Select
                                        label="Gizli Dosya / Diğer Riskler"
                                        value={data.gizli_dosya_varmi || 'Hayır'}
                                        onChange={(e) => handleChange('gizli_dosya_varmi', e.target.value)}
                                        options={[{ value: 'Evet', label: 'Evet (Var)' }, { value: 'Hayır', label: 'Hayır (Yok)' }]}
                                    />
                                    {data.gizli_dosya_varmi === 'Evet' && (
                                        <Input
                                            label="Gizli Dosya Detayı"
                                            value={data.gizli_dosya_detay || ''}
                                            onChange={(e) => handleChange('gizli_dosya_detay', e.target.value)}
                                            className="border-purple-200 bg-purple-50 font-bold text-purple-900"
                                            placeholder="Risk açıklaması..."
                                        />
                                    )}

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

                                        <div className="pt-4 border-t border-gray-200">
                                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Kefil Notları</label>
                                            <textarea
                                                className="w-full border border-gray-300 p-3 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                                rows={3}
                                                placeholder="Kefil ile ilgili özel notlar, önemli detaylar..."
                                                value={data.kefil_notlar || ''}
                                                onChange={(e) => handleChange('kefil_notlar', e.target.value)}
                                            />
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

                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden md:col-span-2">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-indigo-100 to-transparent rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
                                <div className="flex items-center justify-between mb-4 border-b pb-2 relative z-10">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                        <Smartphone className="w-4 h-4 text-indigo-600" /> Satış Geçmişi & Çoklu Cihaz
                                    </h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowManualAdd(!showManualAdd)}
                                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1"
                                        >
                                            <Package className="w-3 h-3" />
                                            {showManualAdd ? 'Vazgeç' : 'Manuel Cihaz Ekle'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                fetchStock();
                                                setIsStockModalOpen(true);
                                            }}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1"
                                        >
                                            <Search className="w-3 h-3" />
                                            Stoktan Seç
                                        </button>
                                    </div>
                                </div>

                                {/* Manual Addition Form */}
                                {showManualAdd && (
                                    <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in slide-in-from-top-2 duration-200">
                                        <h4 className="text-xs font-bold text-gray-700 mb-3 uppercase">Manuel Satış Girişi</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                            <Input
                                                placeholder="Marka"
                                                value={manualProduct.marka}
                                                onChange={(e) => setManualProduct({ ...manualProduct, marka: e.target.value })}
                                            />
                                            <Input
                                                placeholder="Model"
                                                value={manualProduct.model}
                                                onChange={(e) => setManualProduct({ ...manualProduct, model: e.target.value })}
                                            />
                                            <Input
                                                placeholder="IMEI"
                                                value={manualProduct.imei}
                                                onChange={(e) => setManualProduct({ ...manualProduct, imei: e.target.value })}
                                            />
                                            <Input
                                                placeholder="Fiyat"
                                                type="number"
                                                value={manualProduct.fiyat}
                                                onChange={(e) => setManualProduct({ ...manualProduct, fiyat: e.target.value })}
                                            />
                                            <div className="flex gap-2">
                                                <Input
                                                    type="date"
                                                    value={manualProduct.tarih}
                                                    onChange={(e) => setManualProduct({ ...manualProduct, tarih: e.target.value })}
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (!manualProduct.marka || !manualProduct.model || !manualProduct.imei) {
                                                            alert('Marka, Model ve IMEI zorunludur.');
                                                            return;
                                                        }
                                                        const newItem = {
                                                            ...manualProduct,
                                                            satis_tarihi: new Date(manualProduct.tarih).toISOString(),
                                                        };
                                                        const newList = [...multiProducts, newItem];
                                                        setMultiProducts(newList);
                                                        handleChange('satilan_urunler', JSON.stringify(newList));
                                                        setManualProduct({ marka: '', model: '', imei: '', fiyat: '', tarih: new Date().toISOString().split('T')[0] });
                                                        setShowManualAdd(false);
                                                    }}
                                                    className="bg-green-600 text-white px-3 rounded-lg hover:bg-green-700 shrink-0"
                                                >
                                                    Ekle
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Sales Table */}
                                <div className="overflow-x-auto relative z-10">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold tracking-wider">
                                                <th className="px-4 py-2 border-b">Tarih</th>
                                                <th className="px-4 py-2 border-b">Ürün Detayı</th>
                                                <th className="px-4 py-2 border-b">IMEI</th>
                                                <th className="px-4 py-2 border-b text-right">Fiyat</th>
                                                <th className="px-4 py-2 border-b text-center">İşlem</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {multiProducts.length > 0 ? (
                                                multiProducts.map((p, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                                                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                            {p.satis_tarihi ? new Date(p.satis_tarihi).toLocaleDateString('tr-TR') : '-'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-bold text-gray-900">{p.marka} {p.model}</div>
                                                            {p.seri_no && <div className="text-[10px] text-gray-400">Seri: {p.seri_no}</div>}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-medium">
                                                            {p.imei}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {/* Editable Price Field */}
                                                            <div className="flex flex-col items-end gap-1">
                                                                <input
                                                                    type="number"
                                                                    className="text-right font-bold text-emerald-700 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none w-24 py-0.5 text-sm transition-colors"
                                                                    value={p.satis_fiyati || 0}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value);
                                                                        const newList = [...multiProducts];
                                                                        newList[idx] = { ...newList[idx], satis_fiyati: val };
                                                                        setMultiProducts(newList);
                                                                        handleChange('satilan_urunler', JSON.stringify(newList));
                                                                    }}
                                                                />
                                                                <select
                                                                    className="text-[10px] text-gray-500 font-normal bg-transparent border-none p-0 cursor-pointer focus:ring-0 text-right w-full"
                                                                    value={p.vade_ay || 1}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value);
                                                                        const newList = [...multiProducts];
                                                                        newList[idx] = { ...newList[idx], vade_ay: val };
                                                                        setMultiProducts(newList);
                                                                        handleChange('satilan_urunler', JSON.stringify(newList));
                                                                    }}
                                                                >
                                                                    <option value={1}>Nakit/Tek Çekim</option>
                                                                    <option value={3}>3 Taksit</option>
                                                                    <option value={6}>6 Taksit</option>
                                                                    <option value={12}>12 Taksit</option>
                                                                    <option value={15}>15 Taksit</option>
                                                                </select>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                onClick={() => {
                                                                    if (!confirm('Bu satışı silmek istediğinize emin misiniz?')) return;
                                                                    const newList = [...multiProducts];
                                                                    newList.splice(idx, 1);
                                                                    setMultiProducts(newList);
                                                                    handleChange('satilan_urunler', JSON.stringify(newList));
                                                                }}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                                title="Siparişi Sil"
                                                            >
                                                                ❌
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400 italic">
                                                        Henüz bir satış kaydı bulunmuyor.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-6 pt-4 border-t border-dashed grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Input
                                        label="Kargo Takip No"
                                        value={data.kargo_takip_no || ''}
                                        onChange={(e) => handleChange('kargo_takip_no', e.target.value)}
                                        placeholder="Kargo takip kodu..."
                                    />
                                    {data.kargo_takip_no && (
                                        <a
                                            href={`https://gonderitakip.ptt.gov.tr/Track/Verify?q=${data.kargo_takip_no}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-center p-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-all self-end mb-1"
                                        >
                                            🚚 KARGO TAKİBİ YAP
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    activeTab === 'history' && (
                        <div className="bg-slate-50 rounded-xl p-4 min-h-[400px] animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <CustomerLogViewer customerId={data.id} />
                        </div>
                    )
                }

            </div>

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
                                <div className="mt-2 p-2 bg-gray-50 border border-dashed rounded text-[10px] text-gray-500 grid grid-cols-2 gap-x-4 gap-y-1">
                                    <div><span className="font-bold text-indigo-600">{'{name}'}</span> : Ad Soyad</div>
                                    <div><span className="font-bold text-indigo-600">{'{limit}'}</span> : Kredi Limiti</div>
                                    <div><span className="font-bold text-indigo-600">{'{product}'}</span> : Ürün</div>
                                    <div><span className="font-bold text-indigo-600">{'{imei}'}</span> : IMEI</div>
                                    <div><span className="font-bold text-indigo-600">{'{serial}'}</span> : Seri No</div>
                                </div>
                                <div className="text-right text-xs text-gray-500 mt-1">
                                    {smsMessage.length} karakter - {Math.ceil(smsMessage.length / 160)} SMS
                                </div>
                            </div>

                            {/* Dynamic SMS Templates */}
                            <div className="mb-4 flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
                                {smsTemplates.length === 0 && (
                                    <div className="text-gray-400 text-xs italic p-2 text-center">Şablon bulunamadı. Toplu Mesaj panelinden ekleyebilirsiniz.</div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {smsTemplates.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setSmsMessage(replaceTemplateVariables(t.content))}
                                            className="text-xs bg-gray-50 border border-gray-200 hover:bg-gray-100 px-2 py-1 rounded text-gray-700 transition truncate max-w-full"
                                            title={t.content}
                                        >
                                            {t.title}
                                        </button>
                                    ))}
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
                                <div className="mt-2 p-2 bg-gray-50 border border-dashed rounded text-[10px] text-gray-500 grid grid-cols-2 gap-x-4 gap-y-1">
                                    <div><span className="font-bold text-indigo-600">{'{name}'}</span> : Ad Soyad</div>
                                    <div><span className="font-bold text-indigo-600">{'{limit}'}</span> : Kredi Limiti</div>
                                    <div><span className="font-bold text-indigo-600">{'{product}'}</span> : Ürün</div>
                                    <div><span className="font-bold text-indigo-600">{'{imei}'}</span> : IMEI</div>
                                    <div><span className="font-bold text-indigo-600">{'{serial}'}</span> : Seri No</div>
                                </div>
                                <div className="text-right text-xs text-gray-500 mt-1">
                                    {whatsAppMessage.length} karakter
                                </div>
                            </div>

                            {/* Dynamic WhatsApp Templates */}
                            <div className="mb-4 flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
                                {whatsappTemplates.length === 0 && (
                                    <div className="text-gray-400 text-xs italic p-2 text-center">Şablon bulunamadı. Toplu Mesaj panelinden ekleyebilirsiniz.</div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {whatsappTemplates.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setWhatsAppMessage(replaceTemplateVariables(t.content))}
                                            className="text-xs bg-green-50 border border-green-200 hover:bg-green-100 px-2 py-1 rounded text-green-700 transition truncate max-w-full"
                                            title={t.content}
                                        >
                                            {t.title}
                                        </button>
                                    ))}
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
            {
                isPriceModalOpen && selectedStockItem && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in duration-200">
                            <div className="p-4 border-b bg-gray-50 rounded-t-xl flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-gray-800">Satış Fiyatı Seçin</h3>
                                    <p className="text-xs text-gray-500">{selectedStockItem.marka} {selectedStockItem.model}</p>
                                </div>
                                <button onClick={() => setIsPriceModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                            </div>
                            <div className="p-4 space-y-2">
                                {[
                                    { label: 'Nakit / Tek Çekim', price: selectedStockItem.alis_fiyati, term: 1 },
                                    { label: '3 Taksit', price: selectedStockItem.fiyat_3_taksit, term: 3 },
                                    { label: '6 Taksit', price: selectedStockItem.fiyat_6_taksit, term: 6 },
                                    { label: '12 Taksit', price: selectedStockItem.fiyat_12_taksit, term: 12 },
                                    { label: '15 Taksit', price: selectedStockItem.fiyat_15_taksit, term: 15 },
                                ].map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => confirmStockAssign(opt.price || 0, opt.term)}
                                        disabled={!opt.price}
                                        className="w-full flex justify-between items-center p-3 border rounded-lg hover:bg-indigo-50 hover:border-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                                    >
                                        <span className="font-medium text-gray-700 group-hover:text-indigo-700">{opt.label}</span>
                                        <span className="font-bold text-gray-900 group-hover:text-indigo-900">
                                            {opt.price ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(opt.price) : '-'}
                                        </span>
                                    </button>
                                ))}
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

            {/* Verify Modal */}
            {isVerifyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsVerifyModalOpen(false)} />
                    <div className="relative bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                                Telefon Doğrulama
                            </h3>
                            <button onClick={() => setIsVerifyModalOpen(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <VerifyModalContent
                            customerId={data.id}
                            phone={data.telefon || ''}
                            onSuccess={() => {
                                setIsVerifyModalOpen(false);
                                setData(prev => ({ ...prev, telefon_onayli: true }));
                                alert('Telefon numarası başarıyla doğrulandı!');
                            }}
                        />
                    </div>
                </div>
            )}

        </div >
    );
}
function ApprovalSummaryModal({ isOpen, onClose, customer }: { isOpen: boolean; onClose: () => void; customer: Customer }) {
    if (!isOpen) return null;

    // Generate Text Summary for WhatsApp
    const generateSummary = () => {
        let summary = `*MÜŞTERİ KARTI & ONAY ÖZETİ*\n\n`;
        summary += `👤 *Kişisel Bilgiler*\n`;
        summary += `Ad Soyad: ${customer.ad_soyad}\n`;
        summary += `TC: ${customer.tc_kimlik || '-'}\n`;
        summary += `Tel: ${customer.telefon}\n\n`;

        summary += `💼 *İş & Finans*\n`;
        summary += `Unvan: ${customer.is_yeri_unvani || '-'}\n`;
        summary += `Meslek: ${customer.meslek_is || customer.meslek || '-'}\n`;
        summary += `İş Yeri: ${customer.is_yeri_bilgisi || '-'}\n`;
        summary += `Maaşlar (Son 6 Ay): ${customer.maas_1 || 0}, ${customer.maas_2 || 0}, ${customer.maas_3 || 0}, ${customer.maas_4 || 0}, ${customer.maas_5 || 0}, ${customer.maas_6 || 0} TL\n`;
        summary += `Ortalama Maaş: *${customer.maas_ortalama || '-'} TL*\n`;
        summary += `Çalışma Süresi: ${customer.ayni_isyerinde_sure_ay || '-'}\n\n`;

        summary += `⚖️ *Yasal & Varlık*\n`;
        summary += `İcra Durumu: ${customer.acik_icra_varmi === 'Evet' ? 'VAR' : 'Yok'}\n`;
        summary += `Dava Durumu: ${customer.dava_dosyasi_varmi === 'Evet' ? 'VAR' : 'Yok'}\n`;
        summary += `Tapu/Araç: ${customer.tapu_varmi === 'Evet' ? 'Tapu Var' : ''} ${customer.arac_varmi === 'Evet' ? 'Araç Var' : ''}\n\n`;

        summary += `📱 *Cihaz & Talep*\n`;
        summary += `Ürün: ${customer.talep_edilen_urun || '-'}\n`;
        summary += `IMEI: ${customer.urun_imei || '-'}\n`;

        if (customer.kefil_ad_soyad) {
            summary += `\n🤝 *Kefil*\n`;
            summary += `Adı: ${customer.kefil_ad_soyad}\n`;
            summary += `TC: ${customer.kefil_tc_kimlik || '-'}\n`;
        }

        return summary;
    };

    const summaryText = generateSummary();

    const handleCopy = () => {
        navigator.clipboard.writeText(summaryText);
        alert('Özet metni kopyalandı! ✅');
    };

    const handleWhatsApp = () => {
        const url = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
        window.open(url, '_blank');
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank', 'width=1000,height=1000');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Müşteri Raporu - ${customer.ad_soyad}</title>
                        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                        <style>
                            @page { size: A4; margin: 8mm; }
                            body { font-family: 'Inter', sans-serif; color: #1e293b; max-width: 210mm; margin: 0 auto; background: white; -webkit-print-color-adjust: exact; font-size: 10px; }
                            
                            /* Layout Utilities */
                            .row { display: flex; gap: 10px; margin-bottom: 8px; }
                            .col-6 { flex: 1; }
                            .col-4 { flex: 0 0 33.33%; }
                            .col-3 { flex: 0 0 25%; }
                            
                            /* Header */
                            .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end; }
                            .brand { font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1; }
                            .sub-brand { font-size: 10px; color: #64748b; margin-top: 3px; font-weight: 500; }
                            .meta-box { text-align: right; font-size: 9px; color: #475569; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 4px; background: #f8fafc; }

                            /* Section Headings */
                            h2 { 
                                font-size: 11px; 
                                font-weight: 700; 
                                text-transform: uppercase; 
                                color: #fff;
                                background: #334155;
                                padding: 4px 8px;
                                margin: 10px 0 6px 0;
                                border-radius: 4px;
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            }
                            h2.sub { background: #64748b; font-size: 10px; margin-top: 5px; }

                            /* Data Fields */
                            .field-group { background: #fff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px; height: 100%; box-sizing: border-box; }
                            .field { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 3px 0; font-size: 9px; }
                            .field:last-child { border-bottom: none; }
                            .label { font-weight: 600; color: #64748b; }
                            .value { font-weight: 500; color: #0f172a; text-align: right; max-width: 65%; }
                            
                            /* Specific Styles */
                            .badge { display: inline-block; padding: 1px 4px; border-radius: 3px; font-size: 8px; font-weight: bold; background: #e2e8f0; color: #475569; }
                            .risk-high { color: #dc2626; font-weight: bold; }
                            .risk-low { color: #16a34a; font-weight: bold; }

                            /* Signatures */
                            .signatures-container { 
                                margin-top: 20px; 
                                border-top: 1px dashed #cbd5e1; 
                                padding-top: 15px;
                                page-break-inside: avoid;
                            }
                            .legal-text { font-size: 8px; color: #64748b; text-align: justify; margin-bottom: 15px; line-height: 1.3; }
                            .sig-grid { display: flex; gap: 15px; }
                            .sig-box { flex: 1; border: 1px solid #cbd5e1; height: 70px; border-radius: 4px; position: relative; background: #fdfdfd; }
                            .sig-title { background: #f1f5f9; font-size: 8px; font-weight: 700; text-align: center; padding: 3px; border-bottom: 1px solid #cbd5e1; color: #334155; }
                            .sig-name { position: absolute; bottom: 4px; width: 100%; text-align: center; font-size: 9px; font-weight: 600; color: #0f172a; }

                            @media print {
                                body { margin: 0; padding: 0; }
                                .no-print { display: none; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div>
                                <div class="brand">CEPTE KOLAY</div>
                                <div class="sub-brand">PREMIUM ELEKTRONİK & FİNANS HİZMETLERİ</div>
                            </div>
                            <div class="meta-box">
                                <div><strong>No:</strong> ${customer.winner_musteri_no || customer.id.substring(0, 8).toUpperCase()}</div>
                                <div><strong>Tarih:</strong> ${new Date().toLocaleDateString('tr-TR')}</div>
                                <div><strong>Temsilci:</strong> ${customer.sahip ? customer.sahip.split('@')[0] : (customer.created_by?.split('@')[0] || '-')}</div>
                            </div>
                        </div>

                        <!-- CUSTOMER MAIN INFO -->
                        <div class="row">
                            <div class="col-6">
                                <h2>👤 Müşteri Kimlik & İletişim</h2>
                                <div class="field-group">
                                    <div class="field"><span class="label">Ad Soyad</span> <span class="value font-bold">${customer.ad_soyad}</span></div>
                                    <div class="field"><span class="label">TC Kimlik</span> <span class="value">${customer.tc_kimlik || '-'}</span></div>
                                    <div class="field"><span class="label">Telefon</span> <span class="value">${customer.telefon}</span></div>
                                    <div class="field"><span class="label">Doğum Tarihi</span> <span class="value">${customer.dogum_tarihi || '-'}</span></div>
                                    <div class="field"><span class="label">Ev Adresi</span> <span class="value" style="font-size:8px; line-height:1.1;">${customer.ev_adresi || customer.sehir ? (customer.ev_adresi || '') + ' ' + (customer.ilce || '') + '/' + (customer.sehir || '') : '-'}</span></div>
                                    <div class="field"><span class="label">Kanal</span> <span class="value">${customer.basvuru_kanali || '-'}</span></div>
                                </div>
                            </div>
                            <div class="col-6">
                                <h2>💼 İş & Gelir Durumu</h2>
                                <div class="field-group">
                                    <div class="field"><span class="label">Ünvan / Firma</span> <span class="value">${customer.is_yeri_unvani || '-'}</span></div>
                                    <div class="field"><span class="label">Meslek</span> <span class="value">${customer.meslek_is || customer.meslek || '-'}</span></div>
                                    <div class="field"><span class="label">Gelir (Ort.)</span> <span class="value font-bold">${customer.maas_ortalama || 0} TL</span></div>
                                    <div class="field"><span class="label">Çalışma Süresi</span> <span class="value">${customer.ayni_isyerinde_sure_ay || '-'} Ay</span></div>
                                    <div class="field"><span class="label">Hizmet Dökümü</span> <span class="value">${customer.hizmet_dokumu_varmi || '-'}</span></div>
                                    <div class="field"><span class="label">İş Adresi</span> <span class="value" style="font-size:8px;">${customer.is_adresi || customer.is_yeri_bilgisi || '-'}</span></div>
                                </div>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-6">
                                <h2>⚖️ Müşteri Yasal Durum</h2>
                                <div class="field-group">
                                    <div class="field"><span class="label">İcra (Açık)</span> <span class="value ${customer.acik_icra_varmi === 'Evet' ? 'risk-high' : 'risk-low'}">${customer.acik_icra_varmi || '-'}</span></div>
                                    ${customer.acik_icra_detay ? `<div class="field"><span class="label">İcra Detay</span> <span class="value">${customer.acik_icra_detay}</span></div>` : ''}
                                    <div class="field"><span class="label">Dava Dosyası</span> <span class="value ${customer.dava_dosyasi_varmi === 'Evet' ? 'risk-high' : 'risk-low'}">${customer.dava_dosyasi_varmi || '-'}</span></div>
                                    ${customer.dava_detay ? `<div class="field"><span class="label">Dava Detay</span> <span class="value">${customer.dava_detay}</span></div>` : ''}

                                    <div class="field"><span class="label">Kapalı İcra</span> <span class="value">${customer.kapali_icra_varmi || '-'}</span></div>
                                    ${customer.kapali_icra_kapanis_sekli ? `<div class="field"><span class="label">Kapanış Şekli</span> <span class="value">${customer.kapali_icra_kapanis_sekli}</span></div>` : ''}
                                    <div class="field"><span class="label">Gizli Dosya</span> <span class="value ${customer.gizli_dosya_varmi === 'Evet' ? 'risk-high' : ''}">${customer.gizli_dosya_varmi || '-'}</span></div>
                                    ${customer.gizli_dosya_detay ? `<div class="field"><span class="label">Gizli Dosya Detay</span> <span class="value text-red-700 font-bold">${customer.gizli_dosya_detay}</span></div>` : ''}
                                    <div class="field"><span class="label">Avukat Sorgu</span> <span class="value">${customer.avukat_sorgu_durumu || '-'}</span></div>
                                    ${customer.avukat_sorgu_sonuc ? `<div class="field"><span class="label text-red-700">Sorgu Sonucu</span> <span class="value text-red-700 font-bold">${customer.avukat_sorgu_sonuc}</span></div>` : ''}
                                </div>
                            </div>
                            <div class="col-6">
                                <h2>🏠 Müşteri Varlıklar</h2>
                                <div class="field-group">
                                    <div class="field"><span class="label">Tapu</span> <span class="value ${customer.tapu_varmi === 'Evet' ? 'risk-low' : ''}">${customer.tapu_varmi || '-'}</span></div>
                                    ${customer.tapu_detay ? `<div class="field"><span class="label">Tapu Detay</span> <span class="value">${customer.tapu_detay}</span></div>` : ''}
                                    <div class="field"><span class="label">Araç</span> <span class="value ${customer.arac_varmi === 'Evet' ? 'risk-low' : ''}">${customer.arac_varmi || '-'}</span></div>
                                    ${customer.arac_detay ? `<div class="field"><span class="label">Araç Detay</span> <span class="value">${customer.arac_detay}</span></div>` : ''}
                                    <div class="field"><span class="label">Kredi Notu</span> <span class="value">${customer.findeks_risk_durumu || '-'}</span></div>
                                    <div class="field"><span class="label">İkametgah</span> <span class="value">${customer.ikametgah_varmi || '-'}</span></div>
                                    <div class="field"><span class="label">Psikoteknik</span> <span class="value">${customer.psikoteknik_varmi || '-'}</span></div>
                                    ${customer.psikoteknik_notu ? `<div class="field"><span class="label">Psikoteknik Detay</span> <span class="value">${customer.psikoteknik_notu}</span></div>` : ''}
                                </div>
                            </div>
                        </div>

                        <!-- GUARANTOR SECTION (FULL DETAIL) -->
                        ${customer.kefil_ad_soyad ? `
                        <div style="margin-top:15px; border-top:2px solid #334155; padding-top:5px;"></div>
                        <div class="row">
                            <div class="col-4">
                                <h2>🤝 Kefil Kimlik</h2>
                                <div class="field-group" style="background:#f8fafc;">
                                    <div class="field"><span class="label">Ad Soyad</span> <span class="value font-bold">${customer.kefil_ad_soyad}</span></div>
                                    <div class="field"><span class="label">TC Kimlik</span> <span class="value">${customer.kefil_tc_kimlik || '-'}</span></div>
                                    <div class="field"><span class="label">Telefon</span> <span class="value">${customer.kefil_telefon || '-'}</span></div>
                                    <div class="field"><span class="label">İkametgah</span> <span class="value">${customer.kefil_ikametgah_varmi || '-'}</span></div>
                                </div>
                            </div>
                            <div class="col-4">
                                <h2>💼 Kefil İş & Finans</h2>
                                <div class="field-group" style="background:#f8fafc;">
                                    <div class="field"><span class="label">Meslek</span> <span class="value">${customer.kefil_meslek_is || '-'}</span></div>
                                    <div class="field"><span class="label">Maaş</span> <span class="value font-bold">${customer.kefil_son_yatan_maas || '-'} TL</span></div>
                                    <div class="field"><span class="label">Çalışma Süresi</span> <span class="value">${customer.kefil_ayni_isyerinde_sure_ay || '-'} Ay</span></div>
                                    <div class="field"><span class="label">Hizmet Dökümü</span> <span class="value">${customer.kefil_hizmet_dokumu_varmi || '-'}</span></div>
                                </div>
                            </div>
                            <div class="col-4">
                                <h2>⚖️ Kefil Yasal & Varlık</h2>
                                <div class="field-group" style="background:#f8fafc;">
                                    <div class="field"><span class="label">Açık İcra</span> <span class="value ${customer.kefil_acik_icra_varmi === 'Evet' ? 'risk-high' : ''}">${customer.kefil_acik_icra_varmi || '-'}</span></div>
                                    ${customer.kefil_acik_icra_detay ? `<div class="field"><span class="label">İcra Detay</span> <span class="value">${customer.kefil_acik_icra_detay}</span></div>` : ''}
                                    <div class="field"><span class="label">Dava</span> <span class="value ${customer.kefil_dava_dosyasi_varmi === 'Evet' ? 'risk-high' : ''}">${customer.kefil_dava_dosyasi_varmi || '-'}</span></div>
                                    ${customer.kefil_dava_detay ? `<div class="field"><span class="label">Dava Detay</span> <span class="value">${customer.kefil_dava_detay}</span></div>` : ''}

                                    <div class="field"><span class="label">Kapalı İcra</span> <span class="value">${customer.kefil_kapali_icra_varmi || '-'}</span></div>
                                    ${customer.kefil_kapali_icra_kapanis_sekli ? `<div class="field"><span class="label">Kapanış Şekli</span> <span class="value">${customer.kefil_kapali_icra_kapanis_sekli}</span></div>` : ''}
                                    <div class="field"><span class="label">Tapu</span> <span class="value ${customer.kefil_tapu_varmi === 'Evet' ? 'risk-low' : ''}">${customer.kefil_tapu_varmi || '-'}</span></div>
                                    ${customer.kefil_tapu_detay ? `<div class="field"><span class="label">Tapu Detay</span> <span class="value">${customer.kefil_tapu_detay}</span></div>` : ''}
                                    <div class="field"><span class="label">Araç</span> <span class="value ${customer.kefil_arac_varmi === 'Evet' ? 'risk-low' : ''}">${customer.kefil_arac_varmi || '-'}</span></div>
                                    ${customer.kefil_arac_detay ? `<div class="field"><span class="label">Araç Detay</span> <span class="value">${customer.kefil_arac_detay}</span></div>` : ''}
                                    ${customer.kefil_avukat_sorgu_sonuc ? `<div class="field"><span class="label text-red-700">Avukat Notu</span> <span class="value text-red-700">${customer.kefil_avukat_sorgu_sonuc}</span></div>` : ''}
                                </div>
                            </div>
                        </div>
                        ` : ''}

                        <!-- PRODUCT INFO -->
                        <div class="row" style="margin-top:10px;">
                             <div class="col-12" style="width:100%">
                                <h2>📦 Ürün ve Teslimat</h2>
                                <div class="field-group" style="background: #f0f9ff; border-color: #bae6fd; display:flex; gap:15px;">
                                    <div style="flex:1">
                                        <div class="field"><span class="label">Talep Edilen</span> <span class="value font-bold text-blue-800">${customer.talep_edilen_urun || '-'}</span></div>
                                        <div class="field"><span class="label">Tutar / Limit</span> <span class="value font-bold">${customer.kredi_limiti || customer.talep_edilen_tutar || '-'} TL</span></div>
                                    </div>
                                    <div style="flex:1">
                                        <div class="field"><span class="label">Teslim Edilen IMEI</span> <span class="value font-mono font-bold">${customer.urun_imei || '-'}</span></div>
                                        <div class="field"><span class="label">Seri No</span> <span class="value font-mono">${customer.urun_seri_no || '-'}</span></div>
                                    </div>
                                    <div style="flex:1">
                                        <div class="field"><span class="label">Teslim Tarihi</span> <span class="value">${customer.teslim_tarihi ? new Date(customer.teslim_tarihi).toLocaleDateString('tr-TR') : '-'}</span></div>
                                        <div class="field"><span class="label">Durum</span> <span class="value badge">${customer.durum}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- NOTES -->
                        <h2>📝 Yönetici ve Sistem Notları</h2>
                        <div style="border:1px solid #e2e8f0; padding:8px; font-size:9px; background:#f8fafc; border-radius:4px; min-height:40px;">
                            ${customer.arama_not_kisa ? `<div><strong>Satış Notu:</strong> ${customer.arama_not_kisa}</div>` : ''}
                            ${customer.admin_notu ? `<div style="margin-top:4px; color:#b45309;"><strong>Yönetici Notu:</strong> ${customer.admin_notu}</div>` : ''}
                            ${customer.finansal_notlar ? `<div style="margin-top:4px; color:#b45309;"><strong>Finansal Not:</strong> ${customer.finansal_notlar}</div>` : ''}
                            ${customer.kefil_notlar ? `<div style="margin-top:4px; color:#1e40af;"><strong>Kefil Notu:</strong> ${customer.kefil_notlar}</div>` : ''}
                        </div>

                        <!-- SIGNATURES -->
                        <div class="signatures-container">
                            <div class="legal-text">
                                <strong>BEYAN ve TAAHHÜT:</strong> Yukarıdaki kimlik, iletişim ve gelir bilgilerimin doğruluğunu beyan ederim. 
                                Talep ettiğim ürünü/hizmeti teslim aldım. Tarafıma bildirilen ödeme planına ve sözleşme şartlarına eksiksiz uyacağımı, 
                                aksi takdirde doğacak yasal yükümlülükleri kabul ettiğimi taahhüt ederim.
                            </div>
                            <div class="sig-grid">
                                <div class="sig-box">
                                    <div class="sig-title">TESLİM ALAN MÜŞTERİ</div>
                                    <div class="sig-name">${customer.ad_soyad}</div>
                                </div>
                                ${customer.kefil_ad_soyad ? `
                                <div class="sig-box">
                                    <div class="sig-title">MÜTESELSİL KEFİL</div>
                                    <div class="sig-name">${customer.kefil_ad_soyad}</div>
                                </div>
                                ` : ''}
                                <div class="sig-box">
                                    <div class="sig-title">MAĞAZA YETKİLİSİ</div>
                                    <div class="sig-name">${customer.sahip ? customer.sahip.split('@')[0] : 'Yetkili'}</div>
                                </div>
                            </div>
                        </div>

                        <div class="no-print" style="margin-top:20px; text-align:center; font-size:10px; color:#94a3b8;">
                            Sistem tarafından ${new Date().toLocaleString('tr-TR')} tarihinde oluşturulmuştur.
                        </div>

                        <script>
                            window.print();
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden ring-1 ring-gray-900/5">
                <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Printer className="w-5 h-5 text-indigo-300" /> Rapor & Çıktı Merkezi
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-900">
                        <p className="font-semibold mb-1">🖨️ Premium A4 Çıktı</p>
                        <p className="opacity-80">Müşterinin tüm bilgilerini (Kişisel, İş, Yasal, Ürün) ve gerekli imza alanlarını içeren resmi teslimat formunu yazdırır.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <Button
                            onClick={handlePrint}
                            className="bg-slate-900 hover:bg-slate-800 text-white h-14 text-lg shadow-xl transition-all flex items-center justify-center gap-3"
                        >
                            <Printer className="w-6 h-6" />
                            <span>RAporu Yazdır (A4)</span>
                        </Button>

                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <Button
                                variant="secondary"
                                onClick={handleWhatsApp}
                                className="h-10 text-sm border-gray-300"
                            >
                                <MessageSquare className="w-4 h-4 mr-2 text-green-600" /> WhatsApp Özet
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleCopy}
                                className="h-10 text-sm border-gray-300"
                            >
                                <FileText className="w-4 h-4 mr-2 text-blue-600" /> Özeti Kopyala
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

function VerifyModalContent({ customerId, phone, onSuccess }: { customerId: string, phone: string, onSuccess: () => void }) {
    const [step, setStep] = useState<'SEND' | 'VERIFY'>('SEND');
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState('');

    const handleSend = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sms/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'SEND', customerId, phone })
            });
            const json = await res.json();
            if (res.ok && json.success) {
                setStep('VERIFY');
            } else {
                alert('Hata: ' + json.message);
            }
        } catch (e) {
            alert('Bağlantı hatası');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!code) return;
        setLoading(true);
        try {
            const res = await fetch('/api/sms/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'VERIFY', customerId, code })
            });
            const json = await res.json();
            if (res.ok && json.success) {
                onSuccess();
            } else {
                alert('Hata: ' + json.message);
            }
        } catch (e) {
            alert('Bağlantı hatası');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            {step === 'SEND' ? (
                <div className="space-y-4 text-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
                        <Smartphone className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">Doğrulanacak Numara</p>
                        <p className="text-lg font-bold text-gray-900">{phone}</p>
                    </div>
                    <p className="text-xs text-gray-400">
                        Bu numaraya geçici bir doğrulama kodu (SMS) gönderilecektir.
                    </p>
                    <Button onClick={handleSend} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                        {loading ? 'Gönderiliyor...' : 'Kodu Gönder'}
                    </Button>
                </div>
            ) : (
                <div className="space-y-4 text-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
                        <ShieldCheck className="w-8 h-8 text-indigo-600" />
                    </div>
                    <p className="text-sm text-gray-600">
                        Lütfen telefonunuza gelen 6 haneli kodu giriniz.
                    </p>
                    <input
                        className="text-center text-2xl tracking-widest font-mono w-full border rounded-lg py-3 outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                        placeholder="CODE"
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        maxLength={6}
                    />
                    <Button onClick={handleVerify} disabled={loading || code.length < 4} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                        {loading ? 'Doğrulanıyor...' : 'Doğrula'}
                    </Button>
                    <button onClick={() => setStep('SEND')} className="text-xs text-gray-400 hover:text-gray-600 underline">
                        Tekrar Gönder
                    </button>
                </div>
            )}
        </div>
    );
}
