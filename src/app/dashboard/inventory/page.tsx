'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { InventoryItem, InventoryStatus } from '@/lib/types';
import { Package, Plus, Search, Smartphone, Printer, ClipboardCheck, ArrowRight, User, TrendingUp, Calculator, Tag, X, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StockReportModal } from '@/components/StockReportModal';

export default function InventoryPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);

    // Filters & Modes
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'STOKTA' | 'SATILDI'>('STOKTA');
    const [stockCountMode, setStockCountMode] = useState(false);

    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

    // Price View Modal State
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [priceSearchBrand, setPriceSearchBrand] = useState('');
    const [priceSearchModel, setPriceSearchModel] = useState('');
    const [selectedPriceItem, setSelectedPriceItem] = useState<InventoryItem | null>(null);



    // Report Modal State
    const [showReportModal, setShowReportModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        kategori: 'Cihaz',
        stok_adedi: 1,
        marka: '',
        model: '',
        seri_no: '',
        imei: '',
        fiyat_3_taksit: '',
        fiyat_6_taksit: '',
        fiyat_12_taksit: '',
        fiyat_15_taksit: '',
        satis_fiyati: '' // For accessories
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        console.log('Inventory Page Loaded v3 (Fix)');
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const res = await fetch('/api/inventory');
            const data = await res.json();
            if (res.ok) {
                setItems(data.items);
            }
        } catch (error) {
            console.error('Failed to fetch inventory', error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingItem(null);
        setFormData({
            kategori: 'Cihaz',
            stok_adedi: 1,
            marka: '',
            model: '',
            seri_no: '',
            imei: '',
            fiyat_3_taksit: '',
            fiyat_6_taksit: '',
            fiyat_12_taksit: '',
            fiyat_15_taksit: '',
            satis_fiyati: ''
        });
        setShowModal(true);
    };

    const openEditModal = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData({
            kategori: item.kategori || 'Cihaz',
            stok_adedi: item.stok_adedi || 1,
            marka: item.marka,
            model: item.model,
            seri_no: item.seri_no || '',
            imei: item.imei || '',
            fiyat_3_taksit: item.fiyat_3_taksit?.toString() || '',
            fiyat_6_taksit: item.fiyat_6_taksit?.toString() || '',
            fiyat_12_taksit: item.fiyat_12_taksit?.toString() || '',
            fiyat_15_taksit: item.fiyat_15_taksit?.toString() || '',
            satis_fiyati: item.satis_fiyati?.toString() || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const url = '/api/inventory';
            const method = editingItem ? 'PUT' : 'POST';
            const body = editingItem ? { ...formData, id: editingItem.id } : formData;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setShowModal(false);
                fetchInventory(); // Refresh
            } else {
                const err = await res.json();
                alert(err.message || 'İşlem başarısız');
            }
        } catch (error) {
            alert('Hata oluştu');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!editingItem) return;
        if (!confirm(`⚠️ ${editingItem.marka} ${editingItem.model} (${editingItem.imei}) ürününü silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`)) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/inventory', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingItem.id })
            });

            if (res.ok) {
                setShowModal(false);
                fetchInventory();
                alert('✅ Ürün silindi.');
            } else {
                const err = await res.json();
                alert('❌ Silme başarısız: ' + (err.message || 'Bilinmeyen hata'));
            }
        } catch (error) {
            alert('❌ Bir hata oluştu.');
        } finally {
            setSubmitting(false);
        }
    };

    // Filter items
    const filteredItems = items.filter(item => {
        const matchesSearch = (item.imei || '').includes(search) ||
            (item.seri_no || '').toLowerCase().includes(search.toLowerCase()) ||
            (item.model || '').toLowerCase().includes(search.toLowerCase());

        const matchesStatus = filterStatus === 'ALL' ? true : item.durum === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 animate-fade-in print:p-0 print:space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Package className="w-6 h-6 text-indigo-600" />
                        Stok Yönetimi
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">v3.0 Updated</span>
                    </h1>
                    <p className="text-sm text-gray-500">Cihaz envanter takibi ve sayımı</p>
                </div>

                <div className="flex items-center gap-2">
                    {session?.user.role === 'ADMIN' && (
                        <button
                            onClick={() => setStockCountMode(!stockCountMode)}
                            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium border ${stockCountMode ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                        >
                            <ClipboardCheck className="w-4 h-4" />
                            {stockCountMode ? 'Sayım Modunu Kapat' : 'Sayım Modu'}
                        </button>
                    )}



                    <button
                        onClick={() => setShowPriceModal(true)}
                        className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-2 font-medium"
                    >
                        <Tag className="w-4 h-4" />
                        Fiyat Gör
                    </button>

                    <button
                        onClick={() => setShowReportModal(true)}
                        className="bg-purple-50 text-purple-700 px-4 py-2 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors flex items-center gap-2 font-medium"
                    >
                        <FileText className="w-4 h-4" />
                        Stok Raporu
                    </button>

                    <button
                        onClick={handlePrint}
                        className="bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium"
                    >
                        <Printer className="w-4 h-4" />
                        Liste Yazdır
                    </button>

                    {session?.user.role === 'ADMIN' && (
                        <button
                            onClick={openAddModal}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Ekle
                        </button>
                    )}
                </div>
            </div>

            {/* Print Header only (Details) */}
            <div className="hidden print:block mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Stok Detay Listesi ({filterStatus === 'ALL' ? 'Tümü' : filterStatus})</h1>
                <p className="text-sm text-gray-500">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
            </div>

            {/* Filters & Search - FULL WIDTH */}
            <div className="space-y-4 print:hidden">
                <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                    {/* Filter Tabs */}
                    <div className="flex p-1 bg-gray-100 rounded-lg w-full md:w-auto">
                        <button
                            onClick={() => setFilterStatus('STOKTA')}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${filterStatus === 'STOKTA' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Eldekiler
                        </button>
                        <button
                            onClick={() => setFilterStatus('SATILDI')}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${filterStatus === 'SATILDI' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Teslim Edilenler
                        </button>
                        <button
                            onClick={() => setFilterStatus('ALL')}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${filterStatus === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Tümü
                        </button>
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 w-full md:w-96">
                        <Search className="text-gray-400 w-5 h-5 flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="IMEI, Seri No veya Model ara..."
                            className="bg-transparent w-full outline-none text-gray-700 placeholder-gray-400 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${stockCountMode ? 'ring-2 ring-amber-400' : ''}`}>
                {stockCountMode && (
                    <div className="bg-amber-50 px-6 py-3 border-b border-amber-100 text-amber-800 text-sm flex items-center gap-2 print:hidden">
                        <ClipboardCheck className="w-4 h-4" />
                        <strong>Sayım Modu Aktif:</strong> Listeyi kontrol edip fiziksel stokla karşılaştırabilirsiniz.
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                            <tr>
                                {stockCountMode && <th className="px-6 py-3 w-10 print:w-10">OK</th>}
                                <th className="px-6 py-3">Cihaz</th>
                                <th className="px-6 py-3">IMEI / Seri No</th>
                                <th className="px-6 py-3">Durum</th>
                                <th className="px-6 py-3">Ekleyen</th>
                                <th className="px-6 py-3">3 Taksit</th>
                                <th className="px-6 py-3">6 Taksit</th>
                                <th className="px-6 py-3">12 Taksit</th>
                                <th className="px-6 py-3">15 Taksit</th>
                                <th className="px-6 py-3">Tarih</th>
                                {session?.user.role === 'ADMIN' && <th className="px-6 py-3 print:hidden">İşlem</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={11} className="text-center py-8">Yükleniyor...</td></tr>
                            ) : filteredItems.length === 0 ? (
                                <tr><td colSpan={11} className="text-center py-8 text-gray-500">Kayıt bulunamadı.</td></tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                                        {stockCountMode && (
                                            <td className="px-6 py-4">
                                                <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                            </td>
                                        )}
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <div className="flex items-center gap-2">
                                                <Smartphone className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <div>{item.marka}</div>
                                                    <div className="text-xs text-gray-500">{item.model}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-xs bg-gray-100 inline-block px-2 py-1 rounded">
                                                {item.imei}
                                            </div>
                                            {item.seri_no && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    SN: {item.seri_no}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.durum === 'STOKTA'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {item.durum}
                                            </span>
                                            {item.kategori === 'Aksesuar' && item.stok_adedi && item.stok_adedi > 0 && (
                                                <span className="ml-1 px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                                    Stok: {item.stok_adedi}
                                                </span>
                                            )}
                                            {item.durum === 'SATILDI' && item.musteri_id && (
                                                <div
                                                    onClick={() => router.push(`/dashboard/customers/${item.musteri_id}`)}
                                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer mt-1 flex items-center gap-1 print:hidden"
                                                >
                                                    <User className="w-3 h-3" />
                                                    Müşteriyi Gör
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {item.ekleyen?.split('@')[0]}
                                        </td>

                                        {/* Pricing Columns */}
                                        <td className="px-6 py-4 text-right">
                                            {item.kategori === 'Aksesuar' ? '-' : (
                                                item.fiyat_3_taksit ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900">{Number(item.fiyat_3_taksit).toLocaleString('tr-TR')} ₺</span>
                                                        <span className="text-xs text-gray-500">{(Number(item.fiyat_3_taksit) / 3).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺/ay</span>
                                                    </div>
                                                ) : '-'
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {item.kategori === 'Aksesuar' ? '-' : (
                                                item.fiyat_6_taksit ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900">{Number(item.fiyat_6_taksit).toLocaleString('tr-TR')} ₺</span>
                                                        <span className="text-xs text-gray-500">{(Number(item.fiyat_6_taksit) / 6).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺/ay</span>
                                                    </div>
                                                ) : '-'
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {item.kategori === 'Aksesuar' ? '-' : (
                                                item.fiyat_12_taksit ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900">{Number(item.fiyat_12_taksit).toLocaleString('tr-TR')} ₺</span>
                                                        <span className="text-xs text-gray-500">{(Number(item.fiyat_12_taksit) / 12).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺/ay</span>
                                                    </div>
                                                ) : '-'
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {item.kategori === 'Aksesuar' ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-indigo-600">{Number(item.fiyat_15_taksit).toLocaleString('tr-TR')} ₺</span>
                                                    <span className="text-xs text-gray-500">{(Number(item.fiyat_15_taksit) / 15).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺/ay</span>
                                                </div>
                                            ) : (
                                                item.fiyat_15_taksit ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900">{Number(item.fiyat_15_taksit).toLocaleString('tr-TR')} ₺</span>
                                                        <span className="text-xs text-gray-500">{(Number(item.fiyat_15_taksit) / 15).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺/ay</span>
                                                    </div>
                                                ) : '-'
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(item.giris_tarihi).toLocaleDateString('tr-TR')}
                                        </td>

                                        {session?.user.role === 'ADMIN' && (
                                            <td className="px-6 py-4 print:hidden">
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="text-indigo-600 hover:text-indigo-800 p-2 rounded hover:bg-indigo-50 transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                                        <path d="m15 5 4 4" />
                                                    </svg>
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:hidden">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900">{editingItem ? 'Cihaz Düzenle' : 'Yeni Cihaz Ekle'}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Category Toggle */}
                                <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, kategori: 'Cihaz' })}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${formData.kategori !== 'Aksesuar' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        📱 Cihaz (Telefon/Tablet)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, kategori: 'Aksesuar' })}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${formData.kategori === 'Aksesuar' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        🎧 Aksesuar & Diğer
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
                                        <select
                                            className="w-full border rounded-lg p-2"
                                            value={formData.marka}
                                            onChange={(e) => setFormData({ ...formData, marka: e.target.value })}
                                            required
                                        >
                                            <option value="">Seçiniz...</option>
                                            <option value="Apple">Apple</option>
                                            <option value="Samsung">Samsung</option>
                                            <option value="Xiaomi">Xiaomi</option>
                                            <option value="Huawei">Huawei</option>
                                            <option value="Honor">Honor</option>
                                            <option value="Tecno">Tecno</option>
                                            <option value="Infinix">Infinix</option>
                                            <option value="Omix">Omix</option>
                                            <option value="Realme">Realme</option>
                                            <option value="Vivo">Vivo</option>
                                            <option value="General Mobile">General Mobile</option>
                                            <option value="Reeder">Reeder</option>
                                            <option value="TCL">TCL</option>
                                            <option value="Sony">Sony</option>
                                            <option value="JBL">JBL</option>
                                            <option value="Anker">Anker</option>
                                            <option value="Diğer">Diğer</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                                        <input
                                            className="w-full border rounded-lg p-2"
                                            placeholder={formData.kategori === 'Aksesuar' ? "Örn: Galaxy Buds 2 Pro" : "Örn: iPhone 15 Pro 128GB"}
                                            value={formData.model}
                                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                            required
                                        />
                                    </div>

                                    {formData.kategori === 'Aksesuar' ? (
                                        // Aksesuar Inputs
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Stok Adedi</label>
                                                <input
                                                    type="number"
                                                    className="w-full border rounded-lg p-2"
                                                    placeholder="1"
                                                    value={formData.stok_adedi}
                                                    onChange={(e) => setFormData({ ...formData, stok_adedi: parseInt(e.target.value) || 0 })}
                                                    required
                                                    min={1}
                                                />
                                            </div>
                                            <div className="hidden md:block"></div> {/* Spacer */}
                                        </>
                                    ) : (
                                        // Cihaz Inputs (IMEI / Seri No)
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">IMEI (15 Hane)</label>
                                                <input
                                                    className="w-full border rounded-lg p-2"
                                                    placeholder="123456789012345"
                                                    value={formData.imei}
                                                    onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
                                                    required
                                                    maxLength={15}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Seri No</label>
                                                <input
                                                    className="w-full border rounded-lg p-2"
                                                    placeholder="Seri Numarası"
                                                    value={formData.seri_no}
                                                    onChange={(e) => setFormData({ ...formData, seri_no: e.target.value })}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="border-t pt-4">
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-4 bg-indigo-600 rounded"></div>
                                            Fiyatlandırma
                                        </div>
                                        {formData.kategori !== 'Aksesuar' && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    const alis = parseFloat((formData as any).alis_fiyati);
                                                    if (!alis) return alert('Lütfen önce alış fiyatı giriniz');

                                                    // 15 Ay = Alış x 2.6
                                                    const f15 = Math.ceil(alis * 2.6);
                                                    // 12 Ay = 15 Ay / 1.05
                                                    const f12 = Math.ceil(f15 / 1.05);
                                                    // 6 Ay = 12 Ay / 1.10
                                                    const f6 = Math.ceil(f12 / 1.10);
                                                    // 3 Ay = 6 Ay / 1.10
                                                    const f3 = Math.ceil(f6 / 1.10);

                                                    setFormData(prev => ({
                                                        ...prev,
                                                        fiyat_15_taksit: f15.toString(),
                                                        fiyat_12_taksit: f12.toString(),
                                                        fiyat_6_taksit: f6.toString(),
                                                        fiyat_3_taksit: f3.toString()
                                                    }));
                                                }}
                                                className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 transition-colors font-medium border border-indigo-200"
                                            >
                                                ✨ Otomatik Hesapla
                                            </button>
                                        )}
                                    </h3>

                                    {formData.kategori !== 'Aksesuar' && (
                                        <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                            <label className="block text-xs font-bold text-blue-800 mb-1">Alış Fiyatı (Maliyet)</label>
                                            <input
                                                type="number"
                                                className="w-full border border-blue-200 rounded-lg p-2 text-right font-bold text-blue-900 bg-white"
                                                placeholder="0.00"
                                                value={(formData as any).alis_fiyati || ''}
                                                onChange={(e) => setFormData({ ...formData, alis_fiyati: e.target.value } as any)}
                                            />
                                            <p className="text-[10px] text-blue-600 mt-1">
                                                * Satış fiyatları bu tutar üzerinden hesaplanır (15 Ay = x2.6 çarpanı)
                                            </p>
                                        </div>
                                    )}

                                </div>

                                {formData.kategori === 'Aksesuar' ? (
                                    <div className="mt-4">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Satış Fiyatı (15 Ay Taksitli)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="w-full border rounded-lg p-2 text-right pr-8 font-bold text-lg"
                                                placeholder="0.00"
                                                value={(formData as any).fiyat_15_taksit || ''}
                                                onChange={(e) => setFormData({ ...formData, fiyat_15_taksit: e.target.value, satis_fiyati: e.target.value } as any)}
                                                required
                                            />
                                            <span className="absolute right-2 top-3 text-gray-400 text-sm">₺</span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-1">* Aksesuarlar için sadece 15 aylık satış fiyatı girilir.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">3 Taksit (Toplam)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full border rounded-lg p-2 text-right pr-8"
                                                    placeholder="0.00"
                                                    value={(formData as any).fiyat_3_taksit || ''}
                                                    onChange={(e) => setFormData({ ...formData, fiyat_3_taksit: e.target.value } as any)}
                                                />
                                                <span className="absolute right-2 top-2 text-gray-400 text-xs">₺</span>
                                            </div>
                                            {(formData as any).fiyat_3_taksit && (
                                                <div className="text-[10px] text-right text-gray-500 mt-0.5">
                                                    {Math.round(parseFloat((formData as any).fiyat_3_taksit) / 3).toLocaleString()} ₺/ay
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">6 Taksit (Toplam)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full border rounded-lg p-2 text-right pr-8"
                                                    placeholder="0.00"
                                                    value={(formData as any).fiyat_6_taksit || ''}
                                                    onChange={(e) => setFormData({ ...formData, fiyat_6_taksit: e.target.value } as any)}
                                                />
                                                <span className="absolute right-2 top-2 text-gray-400 text-xs">₺</span>
                                            </div>
                                            {(formData as any).fiyat_6_taksit && (
                                                <div className="text-[10px] text-right text-gray-500 mt-0.5">
                                                    {Math.round(parseFloat((formData as any).fiyat_6_taksit) / 6).toLocaleString()} ₺/ay
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">12 Taksit (Toplam)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full border rounded-lg p-2 text-right pr-8"
                                                    placeholder="0.00"
                                                    value={(formData as any).fiyat_12_taksit || ''}
                                                    onChange={(e) => setFormData({ ...formData, fiyat_12_taksit: e.target.value } as any)}
                                                />
                                                <span className="absolute right-2 top-2 text-gray-400 text-xs">₺</span>
                                            </div>
                                            {(formData as any).fiyat_12_taksit && (
                                                <div className="text-[10px] text-right text-gray-500 mt-0.5">
                                                    {Math.round(parseFloat((formData as any).fiyat_12_taksit) / 12).toLocaleString()} ₺/ay
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">15 Taksit (Toplam)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full border rounded-lg p-2 text-right pr-8"
                                                    placeholder="0.00"
                                                    value={(formData as any).fiyat_15_taksit || ''}
                                                    onChange={(e) => setFormData({ ...formData, fiyat_15_taksit: e.target.value } as any)}
                                                />
                                                <span className="absolute right-2 top-2 text-gray-400 text-xs">₺</span>
                                            </div>
                                            {(formData as any).fiyat_15_taksit && (
                                                <div className="text-[10px] text-right text-gray-500 mt-0.5">
                                                    {Math.round(parseFloat((formData as any).fiyat_15_taksit) / 15).toLocaleString()} ₺/ay
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {editingItem && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 mt-4">
                                        <input
                                            type="checkbox"
                                            id="applyAll"
                                            className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                            checked={(formData as any).applyToAll || false}
                                            onChange={(e) => setFormData({ ...formData, applyToAll: e.target.checked } as any)}
                                        />
                                        <label htmlFor="applyAll" className="text-sm text-amber-800 cursor-pointer select-none">
                                            <strong>Toplu Güncelleme:</strong> Bu fiyatları, aynı <u>Marka ve Model</u>'e sahip olan diğer tüm <strong>STOKTA</strong>'ki cihazlara da uygula.
                                        </label>
                                    </div>
                                )}

                                <div className="flex justify-between gap-3 pt-6">
                                    {/* Delete Button - Admin Only, Edit Mode Only */}
                                    {editingItem && session?.user.role === 'ADMIN' && (
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-md"
                                            disabled={submitting}
                                        >
                                            <X className="w-4 h-4" />
                                            Sil
                                        </button>
                                    )}

                                    <div className="flex gap-3 ml-auto">
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                            disabled={submitting}
                                        >
                                            İptal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className={`px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2 ${submitting ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:-translate-y-0.5'}`}
                                        >
                                            {submitting ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Kaydediliyor...
                                                </>
                                            ) : (
                                                <>
                                                    <ClipboardCheck className="w-5 h-5" />
                                                    Kaydet
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div >
                )
            }

            {/* Report Modal (Stock Summary A4) */}
            {
                showReportModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:block print:bg-white animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-white/10 print:w-full print:h-auto print:max-w-none print:max-h-none print:rounded-none print:shadow-none print:ring-0">
                            {/* Header */}
                            <div className="bg-purple-600 px-6 py-4 flex justify-between items-center print:hidden">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-purple-200" />
                                    Stok Özeti Raporu
                                </h2>
                                <div className="flex gap-2">
                                    <button onClick={() => window.print()} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                                        <Printer className="w-4 h-4" />
                                        Yazdır (A4)
                                    </button>
                                    <button onClick={() => setShowReportModal(false)} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Print Only Header */}
                            <div className="hidden print:block p-8 pb-4 border-b-2 border-black">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h1 className="text-3xl font-black text-black">STOK DURUM ÖZETİ</h1>
                                        <p className="text-gray-600 mt-1">Bu rapor, stoktaki tüm cihazların marka ve model bazında toplu dökümünü içerir.</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold">{new Date().toLocaleDateString('tr-TR')}</div>
                                        <div className="text-sm text-gray-500">Rapor Tarihi</div>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto flex-1 print:overflow-visible print:p-8">
                                <div className="print:columns-2 md:columns-2 lg:columns-3 gap-8 space-y-4">
                                    {Object.entries(
                                        items.filter(i => i.durum === 'STOKTA').reduce((acc, curr) => {
                                            const brand = curr.marka || 'Diğer';
                                            if (!acc[brand]) acc[brand] = [];

                                            const modelName = curr.model || 'Bilinmiyor';
                                            const existing = acc[brand].find(m => m.name === modelName);
                                            if (existing) {
                                                existing.count++;
                                            } else {
                                                acc[brand].push({ name: modelName, count: 1 });
                                            }
                                            return acc;
                                        }, {} as Record<string, { name: string, count: number }[]>)
                                    )
                                        .sort((a, b) => a[0].localeCompare(b[0])) // Sort by Brand A-Z
                                        .map(([brand, models]) => (
                                            <div key={brand} className="break-inside-avoid mb-6 border border-gray-200 rounded-lg overflow-hidden print:border-black print:mb-8">
                                                <div className="bg-gray-100 px-4 py-2 font-bold text-gray-900 border-b border-gray-200 flex justify-between items-center print:bg-gray-200 print:text-black print:border-black">
                                                    <span>{brand}</span>
                                                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full print:border print:border-black print:text-black">
                                                        {models.reduce((sum, m) => sum + m.count, 0)}
                                                    </span>
                                                </div>
                                                <div className="divide-y divide-gray-100 print:divide-gray-300">
                                                    {models.sort((a, b) => b.count - a.count).map((model) => (
                                                        <div key={model.name} className="px-4 py-2 flex justify-between items-center text-sm print:text-xs">
                                                            <span className="text-gray-700 font-medium print:text-black">{model.name}</span>
                                                            <span className="font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded print:bg-transparent print:text-black">{model.count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                </div>

                                {/* Total Summary Footer */}
                                <div className="mt-8 border-t-2 border-gray-200 pt-4 flex justify-between items-center print:border-black print:mt-12">
                                    <div className="text-gray-500 text-sm print:text-black">
                                        CepteKolay Plus Stok Yönetim Sistemi tarafından oluşturulmuştur.
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500 uppercase font-bold tracking-wider print:text-black">Toplam Stok Adedi</div>
                                        <div className="text-3xl font-black text-indigo-600 print:text-black">
                                            {items.filter(i => i.durum === 'STOKTA').length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Price View Modal */}
            {
                showPriceModal && (
                    <>
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:hidden animate-in fade-in duration-200">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-0 overflow-hidden ring-1 ring-white/10">
                                {/* Modal Header */}
                                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                            <Tag className="w-5 h-5 text-white" />
                                        </div>
                                        <h2 className="text-xl font-bold text-white">Fiyat Sorgula</h2>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => window.print()}
                                            className="text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full"
                                            title="Listeyi Yazdır"
                                        >
                                            <Printer className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => setShowPriceModal(false)} className="text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-2 rounded-full">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Marka Seçiniz</label>
                                            <select
                                                className="w-full border-gray-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 text-base bg-gray-50 hover:bg-white transition-colors"
                                                value={priceSearchBrand}
                                                onChange={(e) => {
                                                    setPriceSearchBrand(e.target.value);
                                                    setPriceSearchModel('');
                                                    setSelectedPriceItem(null);
                                                }}
                                            >
                                                <option value="">-- Marka --</option>
                                                {Array.from(new Set(items.filter(i => i.durum === 'STOKTA').map(i => i.marka))).sort().map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {priceSearchBrand && (
                                            <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Model Seçiniz</label>
                                                <select
                                                    className="w-full border-gray-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 text-base bg-gray-50 hover:bg-white transition-colors"
                                                    value={priceSearchModel}
                                                    onChange={(e) => {
                                                        setPriceSearchModel(e.target.value);
                                                        // Find the most recent item of this model to show pricing
                                                        const item = items.find(i => i.marka === priceSearchBrand && i.model === e.target.value && i.durum === 'STOKTA');
                                                        setSelectedPriceItem(item || null);
                                                    }}
                                                >
                                                    <option value="">-- Model --</option>
                                                    {Array.from(new Set(items.filter(i => i.durum === 'STOKTA' && i.marka === priceSearchBrand).map(i => i.model))).sort().map(m => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {selectedPriceItem ? (
                                        <div className="animate-in zoom-in-95 duration-300">
                                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4 text-center">
                                                <div className="text-sm text-indigo-800 mb-1">Seçilen Cihaz</div>
                                                <div className="text-lg font-black text-indigo-900">{selectedPriceItem.marka} {selectedPriceItem.model}</div>
                                                <div className="mt-2 inline-flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-indigo-100 shadow-sm text-xs font-medium text-indigo-700">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                    Stokta: {items.filter(i => i.marka === selectedPriceItem.marka && i.model === selectedPriceItem.model && i.durum === 'STOKTA').length} Adet
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">3 Taksit</div>
                                                    <div className="text-xl font-bold text-gray-900">{selectedPriceItem.fiyat_3_taksit ? `${Number(selectedPriceItem.fiyat_3_taksit).toLocaleString()} ₺` : '-'}</div>
                                                    {selectedPriceItem.fiyat_3_taksit && (
                                                        <div className="text-xs text-indigo-600 font-medium mt-1">
                                                            {(Number(selectedPriceItem.fiyat_3_taksit) / 3).toLocaleString(undefined, { maximumFractionDigits: 0 })} ₺ x 3
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">6 Taksit</div>
                                                    <div className="text-xl font-bold text-gray-900">{selectedPriceItem.fiyat_6_taksit ? `${Number(selectedPriceItem.fiyat_6_taksit).toLocaleString()} ₺` : '-'}</div>
                                                    {selectedPriceItem.fiyat_6_taksit && (
                                                        <div className="text-xs text-indigo-600 font-medium mt-1">
                                                            {(Number(selectedPriceItem.fiyat_6_taksit) / 6).toLocaleString(undefined, { maximumFractionDigits: 0 })} ₺ x 6
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">12 Taksit</div>
                                                    <div className="text-xl font-bold text-gray-900">{selectedPriceItem.fiyat_12_taksit ? `${Number(selectedPriceItem.fiyat_12_taksit).toLocaleString()} ₺` : '-'}</div>
                                                    {selectedPriceItem.fiyat_12_taksit && (
                                                        <div className="text-xs text-indigo-600 font-medium mt-1">
                                                            {(Number(selectedPriceItem.fiyat_12_taksit) / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })} ₺ x 12
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">15 Taksit</div>
                                                    <div className="text-xl font-bold text-gray-900">{selectedPriceItem.fiyat_15_taksit ? `${Number(selectedPriceItem.fiyat_15_taksit).toLocaleString()} ₺` : '-'}</div>
                                                    {selectedPriceItem.fiyat_15_taksit && (
                                                        <div className="text-xs text-indigo-600 font-medium mt-1">
                                                            {(Number(selectedPriceItem.fiyat_15_taksit) / 15).toLocaleString(undefined, { maximumFractionDigits: 0 })} ₺ x 15
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                                            <Smartphone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p>Fiyatlarını görmek için marka ve model seçiniz.</p>
                                        </div>
                                    )}

                                    {/* Footer Info */}
                                    <div className="bg-amber-50 rounded-lg p-3 flex gap-3 text-xs text-amber-800 border border-amber-100">
                                        <TrendingUp className="w-4 h-4 flex-shrink-0" />
                                        <p>Fiyatlar anlık stok verilerine göre gösterilmektedir. Stoktaki en güncel giriş baz alınmıştır.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PREMIUM FULL LIST PRINT LAYOUT (Hidden on screen, visible on print) */}
                        <div className="hidden print:block p-8 bg-white absolute top-0 left-0 z-[9999] w-full min-h-screen h-auto overflow-visible text-black">
                            {/* Header */}
                            <div className="flex justify-between items-end border-b-4 border-black pb-4 mb-6">
                                <div>
                                    <div className="text-4xl font-black tracking-tighter mb-1">FİYAT LİSTESİ</div>
                                    <div className="text-lg font-medium text-gray-600 uppercase tracking-widest">CEPTEKOLAY Plus Premium Devices</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold">{new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                    <div className="text-sm font-medium text-gray-500 uppercase">Güncel Liste</div>
                                </div>
                            </div>

                            {/* Content Columns - Auto Count based on density, usually 2 for A4 */}
                            <div className="columns-1 md:columns-2 gap-6 space-y-6">
                                {Object.entries(
                                    items
                                        .filter(i => i.durum === 'STOKTA' && i.fiyat_15_taksit)
                                        .reduce((acc, curr) => {
                                            const brand = curr.marka || 'Diğer';
                                            if (!acc[brand]) acc[brand] = [];
                                            // Unique by Model Name to avoid duplicates in list
                                            const modelName = (curr.model || '').trim();
                                            if (!acc[brand].some(m => (m.model || '').trim() === modelName)) {
                                                acc[brand].push(curr);
                                            }
                                            return acc;
                                        }, {} as Record<string, InventoryItem[]>)
                                )
                                    .sort((a, b) => a[0].localeCompare(b[0]))
                                    .map(([brand, models]) => (
                                        <div key={brand} className="break-inside-avoid mb-6 border border-black/10 rounded-lg overflow-hidden shadow-sm">
                                            <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 flex items-center justify-between">
                                                <h3 className="font-black text-lg uppercase tracking-tight text-black">{brand}</h3>
                                            </div>

                                            <table className="w-full text-[10px] leading-tight">
                                                <thead className="bg-gray-50 border-b border-gray-200 font-bold uppercase text-gray-600">
                                                    <tr>
                                                        <th className="px-2 py-1.5 text-left w-1/3">Model</th>
                                                        <th className="px-2 py-1.5 text-right text-black/90">Toplam</th>
                                                        <th className="px-2 py-1.5 text-right bg-indigo-50/50 text-indigo-900">15 Tak.</th>
                                                        <th className="px-2 py-1.5 text-right">12 Tak.</th>
                                                        <th className="px-2 py-1.5 text-right">6 Tak.</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {models.sort((a, b) => a.model.localeCompare(b.model)).map(model => (
                                                        <tr key={model.id} className="hover:bg-gray-50 break-inside-avoid">
                                                            <td className="px-2 py-2 font-bold text-black border-r border-gray-100 align-middle">
                                                                {model.model}
                                                            </td>
                                                            {/* Total Price (15 Month Base) */}
                                                            <td className="px-2 py-2 text-right font-black text-black align-middle text-xs">
                                                                {model.fiyat_15_taksit ? `${Number(model.fiyat_15_taksit).toLocaleString('tr-TR')} ₺` : '-'}
                                                            </td>

                                                            {/* 15 Months */}
                                                            <td className="px-2 py-2 text-right font-bold text-indigo-700 bg-indigo-50/30 align-middle border-l border-r border-indigo-100">
                                                                {model.fiyat_15_taksit ? (
                                                                    <span>{(Number(model.fiyat_15_taksit) / 15).toLocaleString(undefined, { maximumFractionDigits: 0 })} ₺</span>
                                                                ) : '-'}
                                                            </td>

                                                            {/* 12 Months */}
                                                            <td className="px-2 py-2 text-right text-gray-700 align-middle border-r border-gray-100">
                                                                {model.fiyat_12_taksit ? (
                                                                    <span>{(Number(model.fiyat_12_taksit) / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })} ₺</span>
                                                                ) : '-'}
                                                            </td>

                                                            {/* 6 Months */}
                                                            <td className="px-2 py-2 text-right text-gray-600 align-middle">
                                                                {model.fiyat_6_taksit ? (
                                                                    <span>{(Number(model.fiyat_6_taksit) / 6).toLocaleString(undefined, { maximumFractionDigits: 0 })} ₺</span>
                                                                ) : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                            </div>

                            {/* Footer */}
                            <div className="mt-8 border-t border-gray-300 pt-4 flex justify-between items-center text-[10px] font-medium text-gray-400 uppercase tracking-wider break-inside-avoid">
                                <div>Fiyatlar stoklarla sınırlıdır. Hata ve değişiklik hakkı saklıdır.</div>
                                <div>www.ceptekolay.com</div>
                            </div>
                        </div>
                    </>
                )
            }

        </div >
    )
}

