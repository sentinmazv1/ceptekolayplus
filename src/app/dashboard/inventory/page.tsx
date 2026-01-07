'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { InventoryItem, InventoryStatus } from '@/lib/types';
import { Package, Plus, Search, Smartphone, Printer, ClipboardCheck, ArrowRight, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

    // Form State
    const [formData, setFormData] = useState({
        marka: '',
        model: '',
        seri_no: '',
        imei: '',
        fiyat_3_taksit: '',
        fiyat_6_taksit: '',
        fiyat_12_taksit: '',
        fiyat_15_taksit: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
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
        setFormData({ marka: '', model: '', seri_no: '', imei: '', fiyat_3_taksit: '', fiyat_6_taksit: '', fiyat_12_taksit: '', fiyat_15_taksit: '' });
        setShowModal(true);
    };

    const openEditModal = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData({
            marka: item.marka,
            model: item.model,
            seri_no: item.seri_no,
            imei: item.imei,
            fiyat_3_taksit: item.fiyat_3_taksit?.toString() || '',
            fiyat_6_taksit: item.fiyat_6_taksit?.toString() || '',
            fiyat_12_taksit: item.fiyat_12_taksit?.toString() || '',
            fiyat_15_taksit: item.fiyat_15_taksit?.toString() || ''
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
                    </h1>
                    <p className="text-sm text-gray-500">Cihaz envanter takibi ve sayımı</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setStockCountMode(!stockCountMode)}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium border ${stockCountMode ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                    >
                        <ClipboardCheck className="w-4 h-4" />
                        {stockCountMode ? 'Sayım Modunu Kapat' : 'Sayım Modu'}
                    </button>

                    <button
                        onClick={handlePrint}
                        className="bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium"
                    >
                        <Printer className="w-4 h-4" />
                        Yazdır
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

            {/* Print Header only */}
            <div className="hidden print:block mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Stok Raporu ({filterStatus === 'ALL' ? 'Tümü' : filterStatus})</h1>
                <p className="text-sm text-gray-500">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
            </div>

            {/* Filters & Search */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
                <div className="md:col-span-4 bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">

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
                                            {item.fiyat_3_taksit ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900">{Number(item.fiyat_3_taksit).toLocaleString('tr-TR')} ₺</span>
                                                    <span className="text-xs text-gray-500">{(Number(item.fiyat_3_taksit) / 3).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺/ay</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {item.fiyat_6_taksit ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900">{Number(item.fiyat_6_taksit).toLocaleString('tr-TR')} ₺</span>
                                                    <span className="text-xs text-gray-500">{(Number(item.fiyat_6_taksit) / 6).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺/ay</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {item.fiyat_12_taksit ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900">{Number(item.fiyat_12_taksit).toLocaleString('tr-TR')} ₺</span>
                                                    <span className="text-xs text-gray-500">{(Number(item.fiyat_12_taksit) / 12).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺/ay</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {item.fiyat_15_taksit ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900">{Number(item.fiyat_15_taksit).toLocaleString('tr-TR')} ₺</span>
                                                    <span className="text-xs text-gray-500">{(Number(item.fiyat_15_taksit) / 15).toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺/ay</span>
                                                </div>
                                            ) : '-'}
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
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:hidden">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">{editingItem ? 'Cihaz Düzenle' : 'Yeni Cihaz Ekle'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
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
                                        <option value="Diğer">Diğer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                                    <input
                                        className="w-full border rounded-lg p-2"
                                        placeholder="Örn: iPhone 15 Pro 128GB"
                                        value={formData.model}
                                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                        required
                                    />
                                </div>
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
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-indigo-600 rounded"></div>
                                    Fiyatlandırma (Toplam Tutar Giriniz)
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">3 Taksit (Toplam)</label>
                                        <input
                                            type="number"
                                            className="w-full border rounded-lg p-2 text-right"
                                            placeholder="0.00"
                                            value={(formData as any).fiyat_3_taksit || ''}
                                            onChange={(e) => setFormData({ ...formData, fiyat_3_taksit: e.target.value } as any)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">6 Taksit (Toplam)</label>
                                        <input
                                            type="number"
                                            className="w-full border rounded-lg p-2 text-right"
                                            placeholder="0.00"
                                            value={(formData as any).fiyat_6_taksit || ''}
                                            onChange={(e) => setFormData({ ...formData, fiyat_6_taksit: e.target.value } as any)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">12 Taksit (Toplam)</label>
                                        <input
                                            type="number"
                                            className="w-full border rounded-lg p-2 text-right"
                                            placeholder="0.00"
                                            value={(formData as any).fiyat_12_taksit || ''}
                                            onChange={(e) => setFormData({ ...formData, fiyat_12_taksit: e.target.value } as any)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">15 Taksit (Toplam)</label>
                                        <input
                                            type="number"
                                            className="w-full border rounded-lg p-2 text-right"
                                            placeholder="0.00"
                                            value={(formData as any).fiyat_15_taksit || ''}
                                            onChange={(e) => setFormData({ ...formData, fiyat_15_taksit: e.target.value } as any)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Kaydediliyor...' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

