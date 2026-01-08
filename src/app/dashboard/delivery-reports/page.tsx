'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    Printer, ArrowLeft, Calendar, User, Briefcase, FileText,
    CheckCircle, Shield, AlertCircle, Car, Home, Gavel
} from 'lucide-react';
import { Customer } from '@/lib/types'; // Assuming types exist or I'll infer in component

export default function DeliveryReportsPage() {
    const router = useRouter();
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default today
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData(date);
    }, []); // Initial load

    const fetchData = async (filterDate?: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterDate) params.append('date', filterDate);

            const res = await fetch(`/api/reports/delivery?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setCustomers(data.customers);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setDate(newDate);
        fetchData(newDate);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8 print:bg-white print:p-0">
            {/* Header (No Print) */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 print:hidden">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Geri
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900">Teslimat Detay Raporu</h1>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            type="date"
                            className="pl-10 w-full md:w-48"
                            value={date}
                            onChange={handleDateChange}
                        />
                    </div>
                    <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Printer className="w-4 h-4 mr-2" />
                        Yazdır / PDF
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-8">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
                ) : customers.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm print:hidden">
                        <p className="text-gray-500">Seçilen tarihte ({date}) teslimat kaydı bulunamadı.</p>
                    </div>
                ) : (
                    customers.map((customer, idx) => (
                        <div key={customer.id || idx} className="print:break-after-page print:block">
                            <DeliveryCustomerCard customer={customer} />
                        </div>
                    ))
                )}
            </div>

            <div className="hidden print:hidden text-center text-xs text-gray-400 mt-8">
                Top {customers.length} records found.
            </div>
        </div>
    );
}

function DeliveryCustomerCard({ customer }: { customer: any }) {
    // Helper for boolean/string checks
    const has = (val: any) => {
        if (val === true) return true;
        if (!val) return false;
        const s = String(val).trim().toLowerCase();
        return s === 'true' || s === 'var' || s === 'evet' || s === 'mevcut';
    };
    const cleanNum = (val: any) => val ? Number(val).toLocaleString('tr-TR') : '-';

    return (
        <div className="w-full max-w-5xl mx-auto bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm print:shadow-none print:border-2 print:border-gray-800 print:rounded-none print:w-full print:max-w-none">
            {/* 1. Header Band */}
            <div className="bg-indigo-900 text-white px-8 py-6 flex justify-between items-start print:bg-gray-100 print:text-black print:border-b-2 print:border-gray-800 print:px-4 print:py-3">
                <div>
                    <h2 className="text-2xl font-bold uppercase tracking-wide print:text-xl">{customer.ad_soyad}</h2>
                    <div className="mt-2 flex items-center gap-4 text-indigo-200 print:text-gray-600 font-medium print:mt-1 print:text-sm">
                        <span className="flex items-center gap-1"><User className="w-4 h-4" /> {customer.sehir || 'Şehir Belirtilmemiş'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4" /> {customer.basvuru_kanali || 'Kanal Yok'}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs opacity-70 uppercase tracking-widest">Teslim Tarihi</div>
                    <div className="text-xl font-bold">{customer.teslim_tarihi || customer.updated_at?.split('T')[0] || '-'}</div>
                </div>
            </div>

            {/* 2. Main Grid */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 print:p-4 print:grid-cols-2 print:gap-x-6 print:gap-y-4">

                {/* Left Column */}
                <div className="space-y-8">
                    {/* Kişisel & İletişim */}
                    <Section title="Kişisel Bilgiler" icon={User}>
                        <Field label="TC Kimlik NO" value={customer.tc_kimlik} />
                        <Field label="Telefon" value={customer.telefon} />
                        <Field label="Doğum Tarihi" value={customer.dogum_tarihi} />
                        <Field label="Mülkiyet Durumu" value={customer.mulkiyet_durumu} />
                    </Section>

                    {/* Çalışma & Finans */}
                    <Section title="Çalışma & Gelir Bİlgisi" icon={Briefcase}>
                        <Field label="Meslek" value={customer.meslek_is} />
                        <Field label="Son Yatan Maaş" value={customer.son_yatan_maas ? `${cleanNum(customer.son_yatan_maas)} TL` : '-'} highlight />
                        <Field label="Çalışma Süresi" value={customer.ayni_isyerinde_sure_ay ? `${customer.ayni_isyerinde_sure_ay} Ay` : '-'} />
                        <Field label="Hizmet Dökümü" value={has(customer.hizmet_dokumu_varmi) ? 'Mevcut' : 'Yok'} />
                    </Section>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    {/* Talep */}
                    <Section title="Talep Detayları" icon={FileText}>
                        <Field label="İstenen Ürün" value={customer.talep_edilen_urun} />
                        <Field label="Talep Tutarı" value={customer.talep_edilen_tutar ? `${cleanNum(customer.talep_edilen_tutar)} TL` : '-'} />
                        <Field label="Seçilen Ürün IMEI" value={customer.urun_imei || '-'} />
                        <Field label="Seçilen Ürün Seri No" value={customer.urun_seri_no || '-'} />
                    </Section>

                    {/* E-Devlet & Avukat İstihbarat - Grid Box */}
                    <div className="border rounded-lg p-4 bg-gray-50 print:bg-white print:border-gray-400">
                        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase">
                            <Shield className="w-4 h-4 text-indigo-600 print:text-black" />
                            Yasal & Varlık Sorgusu
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            {/* Split Execution Badges */}
                            <BadgeField label="Açık İcra" value={has(customer.acik_icra_varmi) ? 'Var' : 'Yok'} danger={has(customer.acik_icra_varmi)} success={!has(customer.acik_icra_varmi)} />
                            <BadgeField label="Kapalı İcra" value={has(customer.kapali_icra_varmi) ? 'Var' : 'Yok'} warning={has(customer.kapali_icra_varmi)} success={!has(customer.kapali_icra_varmi)} />

                            <BadgeField label="Dava Dosyası" value={has(customer.dava_dosyasi_varmi) ? 'Var' : 'Temiz'} danger={has(customer.dava_dosyasi_varmi)} />
                            <BadgeField label="Araç Kaydı" value={has(customer.arac_varmi) ? 'Var' : 'Yok'} success={has(customer.arac_varmi)} icon={Car} />
                            <BadgeField label="Tapu Kaydı" value={has(customer.tapu_varmi) ? 'Var' : 'Yok'} success={has(customer.tapu_varmi)} icon={Home} />

                            {/* Lawyer Inquiry Status */}
                            <BadgeField
                                label="Avukat Sorgusu"
                                value={customer.avukat_sorgu_durumu || 'Sorgu Bekleniyor'}
                                success={customer.avukat_sorgu_durumu === 'Temiz'}
                                danger={customer.avukat_sorgu_durumu === 'Riskli' || customer.avukat_sorgu_durumu === 'Olumsuz'}
                                warning={!customer.avukat_sorgu_durumu || customer.avukat_sorgu_durumu === 'Sorgu Bekleniyor'}
                            />
                        </div>

                        {/* Open Execution Detail - NEW */}
                        {has(customer.acik_icra_varmi) && (
                            <div className="mt-4 pt-3 border-t border-gray-200">
                                <span className="text-[10px] uppercase font-bold text-red-700 block mb-1">Açık İcra Detayı</span>
                                <p className="text-xs text-gray-700 bg-white p-2 rounded border border-red-100">{customer.acik_icra_detay || 'Detay girilmemiş'}</p>
                            </div>
                        )}

                        {/* Closed Execution Detail */}
                        {has(customer.kapali_icra_varmi) && (
                            <div className="mt-2 pt-2 border-t border-gray-200 border-dashed">
                                <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Kapalı İcra Detayı</span>
                                <p className="text-xs text-gray-700 bg-white p-2 rounded border">{customer.kapali_icra_kapanis_sekli || 'Detay girilmemiş'}</p>
                            </div>
                        )}

                        {/* Lawyer Inquiry Note */}
                        <div className="mt-4 pt-3 border-t border-gray-200">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Avukat Sorgu Notu</span>
                            {customer.avukat_sorgu_sonuc ? (
                                <p className="text-sm text-gray-800">{customer.avukat_sorgu_sonuc}</p>
                            ) : (
                                <p className="text-xs text-yellow-600 italic bg-yellow-50 p-2 rounded border border-yellow-100 flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3" />
                                    Sorgu cevabı bekleniyor...
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Footer: Admin Decision */}
            <div className="border-t border-gray-200 mt-4 p-8 bg-gray-50 print:bg-white print:border-t-2 print:border-gray-800 print:p-4 print:mt-2">
                <Section title="Yönetici Kararı & Notlar" icon={Gavel}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <Field label="Onay Durumu" value={customer.onay_durumu} className="font-bold text-green-700" />
                            <Field label="Onaylanan Limit" value={customer.kredi_limiti ? `${cleanNum(customer.kredi_limiti)} TL` : '-'} className="font-bold text-xl text-gray-900" />
                            <Field label="Onaylayan" value={customer.onaylayan_admin || customer.updated_by || 'Sistem'} />
                        </div>
                        <div className="bg-white p-4 border rounded-lg print:border-gray-400 min-h-[80px]">
                            <span className="text-xs text-gray-400 uppercase font-bold block mb-1">Yönetici Notu</span>
                            <p className="text-sm text-gray-800 italic">
                                {customer.admin_notu || 'Yönetici notu girilmemiş.'}
                            </p>
                        </div>
                        <div className="bg-white p-4 border rounded-lg print:border-gray-400 min-h-[80px]">
                            <span className="text-xs text-blue-400 uppercase font-bold block mb-1">Kısa Not (Özet)</span>
                            <p className="text-sm text-gray-800 italic">
                                {customer.arama_not_kisa || '-'}
                            </p>
                        </div>
                    </div>
                </Section>
            </div>

            {/* Watermark for Print */}
            <div className="hidden print:block text-center pb-4 text-[10px] text-gray-400 font-mono uppercase">
                CepteKolay+ Güvenlik Raporu • {new Date().toLocaleString('tr-TR')} • {customer.id}
                {/* Print Layout Optimized - v2 */}
            </div>
        </div>
    );
}

// Sub-components for cleaner code
function Section({ title, icon: Icon, children }: any) {
    return (
        <div>
            <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2 uppercase tracking-wide border-b border-gray-200 pb-2 print:text-black print:border-gray-800 print:mb-2 print:pb-1">
                <Icon className="w-4 h-4 text-indigo-600 print:text-black" />
                {title}
            </h3>
            <div className="space-y-3">
                {children}
            </div>
        </div>
    );
}

function Field({ label, value, highlight, className }: any) {
    return (
        <div className="flex justify-between items-center border-b border-gray-100 last:border-0 pb-1 print:border-gray-200">
            <span className="text-sm text-gray-500 font-medium">{label}</span>
            <span className={`text-sm font-semibold text-gray-900 ${highlight ? 'text-indigo-600 print:text-black' : ''} ${className}`}>
                {value || '-'}
            </span>
        </div>
    );
}

function BadgeField({ label, value, danger, success, warning, icon: Icon }: any) {
    let colorClass = "bg-gray-100 text-gray-600 border-gray-200";
    if (danger) colorClass = "bg-red-50 text-red-700 border-red-200";
    if (success) colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (warning) colorClass = "bg-yellow-50 text-yellow-700 border-yellow-200";

    return (
        <div className={`flex flex-col p-2 rounded border ${colorClass} text-center print:border-gray-400 print:bg-white print:text-black`}>
            <span className="text-[10px] uppercase font-bold opacity-70 mb-1">{label}</span>
            <div className="flex items-center justify-center gap-1 font-bold">
                {Icon && <Icon className="w-3 h-3" />}
                {value}
            </div>
        </div>
    );
}
