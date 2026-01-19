'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2, Trash2, Edit2, Plus, GripVertical, Check, X, UserPlus, Shield, Info, Upload, FileSpreadsheet, Download, Search, Phone, RefreshCcw, User, Calendar, CheckCircle, Package, RefreshCw } from 'lucide-react';
import { Customer } from '@/lib/types';
import * as XLSX from 'xlsx';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'statuses' | 'products' | 'users' | 'import' | 'sync_sheets' | 'migrate_deliveries' | 'duplicates' | 'quick_notes'>('statuses');
    const [loading, setLoading] = useState(false);

    // Data Holders
    const [statuses, setStatuses] = useState<any[]>([]);
    const [quickNotes, setQuickNotes] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    async function fetchData() {
        setLoading(true);
        try {
            if (activeTab === 'statuses') {
                const res = await fetch('/api/admin/statuses');
                const data = await res.json();
                if (data.statuses) setStatuses(data.statuses);
            } else if (activeTab === 'products') {
                const res = await fetch('/api/admin/products');
                const data = await res.json();
                if (data.products) setProducts(data.products);
            } else if (activeTab === 'users') {
                const res = await fetch('/api/admin/users');
                const data = await res.json();
                if (data.users) setUsers(data.users);
            } else if (activeTab === 'duplicates') {
                const res = await fetch('/api/admin/duplicates');
                const data = await res.json();
                if (data.groups) setDuplicateGroups(data.groups);
            } else if (activeTab === 'quick_notes') {
                const res = await fetch('/api/admin/quick-notes');
                const data = await res.json();
                if (data.notes) setQuickNotes(data.notes);
            }
            // Import tab needs no fetch
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const tabs = [
        { id: 'statuses', label: 'Durumlar (Aşamalar)' },
        { id: 'quick_notes', label: 'Hızlı Notlar' },
        { id: 'products', label: 'Ürünler & Fiyatlar' },
        { id: 'users', label: 'Kullanıcı Yönetimi' },
        { id: 'import', label: 'Toplu Veri Yükleme' },
        { id: 'sync_sheets', label: 'Google Sheets Entegrasyonu' },
        { id: 'migrate_deliveries', label: 'Teslim Verileri Düzeltme' },
        { id: 'duplicates', label: 'Mükerrer Kayıt Kontrol' },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Yönetim Paneli & Ayarlar</h1>
                <p className="text-gray-500">Tüm sistem tanımlarını buradan yönetebilirsiniz.</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 overflow-x-auto pb-1">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className={`py-2 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === t.id ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading && activeTab !== 'import' ? (
                <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
            ) : (
                <>
                    {activeTab === 'statuses' && <StatusManager statuses={statuses} refresh={fetchData} />}
                    {activeTab === 'products' && <ProductManager products={products} refresh={fetchData} />}
                    {activeTab === 'users' && <UserManager users={users} refresh={fetchData} />}
                    {activeTab === 'import' && <ImportManager />}
                    {activeTab === 'sync_sheets' && <SyncManager />}
                    {activeTab === 'migrate_deliveries' && <MigrationManager />}
                    {activeTab === 'duplicates' && <DuplicateManager groups={duplicateGroups} refresh={fetchData} />}
                    {activeTab === 'quick_notes' && <QuickNotesManager notes={quickNotes} refresh={fetchData} />}
                </>
            )}
        </div>
    );
}

// --- SUB COMPONENTS ---

// Migration Manager Component
function MigrationManager() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<any>(null);

    const runMigration = async () => {
        if (!confirm('Manuel olarak teslim edilmiş ürünleri stoktan düşmek için migration başlatılacak. Devam edilsin mi?')) return;

        setLoading(true);
        setStats(null);
        try {
            const res = await fetch('/api/admin/migrate-deliveries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const json = await res.json();
            setStats(json);
        } catch (error: any) {
            setStats({ success: false, error: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-50 rounded-lg">
                        <Package className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">Teslim Verileri Düzeltme (Migration)</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Daha önce manuel olarak girilmiş (stoktan atanmamış) ürün teslimatlarını inventory tablosuna ekler ve stoktan düşer.
                            Bu işlem sadece <strong>bir kez</strong> çalıştırılmalıdır.
                        </p>
                        <button
                            onClick={runMigration}
                            disabled={loading}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Migration Çalışıyor...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    Migration Başlat
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {stats && (
                <div className={`p-4 rounded-xl border ${stats.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    {stats.success ? (
                        <>
                            <div className="flex items-center gap-2 text-green-800 font-bold mb-2">
                                <CheckCircle className="w-5 h-5" />
                                Migration Tamamlandı
                            </div>
                            <div className="text-sm text-green-700">
                                <p>✅ Toplam: {stats.total || 0} kayıt</p>
                                <p>✅ Migrate Edildi: {stats.migrated || 0}</p>
                                <p>⚠️ Atlandı: {stats.skipped || 0}</p>
                                {stats.errors && stats.errors.length > 0 && (
                                    <div className="mt-2 p-2 bg-red-50 rounded">
                                        <p className="font-bold text-red-800">Hatalar:</p>
                                        {stats.errors.map((err: string, i: number) => (
                                            <p key={i} className="text-xs">{err}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
                                <X className="w-5 h-5" />
                                Hata
                            </div>
                            <p className="text-sm text-red-700">{stats.error}</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function SyncManager() {
    const [step, setStep] = useState<'idle' | 'fetching' | 'review' | 'importing' | 'done'>('idle');
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleCheck = async () => {
        setStep('fetching');
        setStats(null);
        try {
            const res = await fetch('/api/admin/sync-sheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'preview' })
            });
            const json = await res.json();
            if (json.success) {
                setPreviewData(json.data);
                // Auto-select NEW Items only
                const newIds = new Set<string>(json.data.filter((d: any) => !d.exists).map((d: any) => d.temp_id as string));
                setSelectedIds(newIds);
                setStep('review');
            } else {
                setStats({ success: false, error: json.error });
                setStep('idle');
            }
        } catch (error) {
            setStats({ success: false, error: 'Bağlantı hatası' });
            setStep('idle');
        }
    };

    const handleConfirm = async () => {
        setStep('importing');
        const toImport = previewData.filter(d => selectedIds.has(d.temp_id));
        try {
            const res = await fetch('/api/admin/sync-sheets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'confirm', leads: toImport })
            });
            const json = await res.json();
            if (json.success) {
                setStats({ success: true, ...json });
                setStep('done');
            } else {
                setStats({ success: false, error: json.error });
                setStep('review'); // Allow retrying or modifying
            }
        } catch (e) {
            setStats({ success: false, error: 'Import hatası' });
            setStep('review');
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(previewData.map(d => d.temp_id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`bg-white p-6 rounded-xl border border-gray-200 transition-all ${step === 'review' ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}>
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                        <FileSpreadsheet className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">Google Sheets Veri Çekme Sihirbazı</h3>
                        <p className="text-gray-500 mt-1">
                            Bu araç, bağlı Google E-Tablolarından verileri önce <b>kontrol eder</b>, sistemde kayıtlı olup olmadıklarını denetler ve onayınıza sunar.
                        </p>

                        <div className="mt-6 flex items-center gap-4">
                            {step === 'idle' || step === 'done' ? (
                                <Button onClick={handleCheck} size="lg" className="bg-green-600 hover:bg-green-700">
                                    <Search className="w-5 h-5 mr-2" />
                                    Verileri Tara ve Listele
                                </Button>
                            ) : step === 'fetching' ? (
                                <Button disabled size="lg" className="bg-green-600/80">
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    Google Sheets Taranıyor...
                                </Button>
                            ) : null}

                            {step === 'review' && (
                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => setStep('idle')}>İptal</Button>
                                    <Button onClick={handleConfirm} disabled={selectedIds.size === 0} size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                                        <Download className="w-5 h-5 mr-2" />
                                        Seçili {selectedIds.size} Kaydı İçe Aktar
                                    </Button>
                                </div>
                            )}

                            {step === 'importing' && (
                                <Button disabled size="lg" className="bg-indigo-600/80">
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    İçe Aktarılıyor...
                                </Button>
                            )}
                        </div>

                        {/* RESULT STATS */}
                        {step === 'done' && stats && stats.success && (
                            <div className="mt-6 p-4 rounded-lg bg-green-50 border border-green-200 animate-in zoom-in">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                    <span className="font-bold text-green-800 text-lg">İşlem Başarılı!</span>
                                </div>
                                <p className="text-green-700 ml-8">Toplam <b>{stats.added}</b> yeni müşteri kaydı sisteme eklendi. ({stats.skipped} atlandı/hata)</p>
                            </div>
                        )}

                        {/* ERROR MSG */}
                        {stats && !stats.success && (
                            <div className="mt-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-center gap-2">
                                <X className="w-5 h-5" />
                                <b>Hata:</b> {stats.error}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PREVIEW TABLE */}
            {step === 'review' && previewData.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-8">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                            <h3 className="font-bold text-gray-700">Bulunan Kayıtlar ({previewData.length})</h3>
                            <div className="flex gap-2 text-xs">
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md border border-green-200 font-bold">
                                    {previewData.filter((x: any) => !x.exists).length} Yeni
                                </span>
                                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md border border-orange-200 font-bold">
                                    {previewData.filter((x: any) => x.exists).length} Mevcut/Mükerrer
                                </span>
                            </div>
                        </div>
                        <div className="text-sm">
                            <label className="flex items-center gap-2 cursor-pointer font-medium text-indigo-600 hover:text-indigo-800">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                    checked={selectedIds.size === previewData.length}
                                    onChange={(e) => toggleAll(e.target.checked)}
                                />
                                Tümünü Seç
                            </label>
                        </div>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        Seç
                                    </th>
                                    <th className="px-4 py-3">Durum</th>
                                    <th className="px-4 py-3">Adı Soyadı</th>
                                    <th className="px-4 py-3">Telefon</th>
                                    <th className="px-4 py-3">Kaynak</th>
                                    <th className="px-4 py-3">Not</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {previewData.map((row: any) => {
                                    const isSelected = selectedIds.has(row.temp_id);
                                    return (
                                        <tr key={row.temp_id} className={`hover:bg-gray-50 transition-colors ${row.exists ? 'bg-orange-50/30' : ''} ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(row.temp_id)}
                                                // Optional: disable if exists? User wanted control, maybe allow overwrite? 
                                                // Let's NOT disable, but visually warn. User said "valuable ones".
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.exists ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                                        <Shield className="w-3 h-3 mr-1" /> Mevcut
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                        <Plus className="w-3 h-3 mr-1" /> Yeni
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-gray-900">{row.ad_soyad}</td>
                                            <td className="px-4 py-3 font-mono text-gray-600">{row.telefon}</td>
                                            <td className="px-4 py-3 text-gray-500">{row.basvuru_kanali}</td>
                                            <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={row.raw_data?.[3]}>
                                                {row.raw_data?.[3] || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusManager({ statuses, refresh }: { statuses: any[], refresh: () => void }) {
    const [newStatus, setNewStatus] = useState('');
    const [newColor, setNewColor] = useState('gray');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [editColor, setEditColor] = useState('');

    async function addStatus(e: React.FormEvent) {
        e.preventDefault();
        await fetch('/api/admin/statuses', {
            method: 'POST',
            body: JSON.stringify({ label: newStatus, color: newColor })
        });
        setNewStatus('');
        refresh();
    }

    async function toggleActive(id: string, current: boolean) {
        await fetch('/api/admin/statuses', {
            method: 'PATCH',
            body: JSON.stringify({ id, is_active: !current })
        });
        refresh();
    }

    async function deleteStatus(id: string) {
        if (!confirm('Bu durumu silmek istediğinize emin misiniz?')) return;
        const res = await fetch(`/api/admin/statuses?id=${id}`, { method: 'DELETE' });
        if (res.ok) refresh();
        else alert('Silinemedi.');
    }

    async function saveEdit(id: string) {
        await fetch('/api/admin/statuses', {
            method: 'PUT',
            body: JSON.stringify({ id, label: editLabel, color: editColor })
        });
        setEditingId(null);
        refresh();
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-semibold mb-3">Yeni Durum Ekle</h3>
                <form onSubmit={addStatus} className="flex gap-2">
                    <input className="border rounded px-3 py-2 flex-1" placeholder="Örn: Kargoya Verildi" value={newStatus} onChange={e => setNewStatus(e.target.value)} required />
                    <select className="border rounded px-3 py-2" value={newColor} onChange={e => setNewColor(e.target.value)}>
                        <option value="gray">Gri</option>
                        <option value="blue">Mavi</option>
                        <option value="green">Yeşil</option>
                        <option value="red">Kırmızı</option>
                        <option value="yellow">Sarı</option>
                        <option value="orange">Turuncu</option>
                    </select>
                    <Button type="submit">Ekle</Button>
                </form>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y">
                {statuses.map((s) => (
                    <div key={s.id} className="p-4 flex items-center justify-between">
                        {editingId === s.id ? (
                            <div className="flex items-center gap-2 flex-1">
                                <input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="border rounded px-2 py-1 flex-1" />
                                <select value={editColor} onChange={e => setEditColor(e.target.value)} className="border rounded px-2 py-1">
                                    <option value="gray">Gri</option>
                                    <option value="blue">Mavi</option>
                                    <option value="green">Yeşil</option>
                                    <option value="red">Kırmızı</option>
                                    <option value="yellow">Sarı</option>
                                    <option value="orange">Turuncu</option>
                                </select>
                                <Button size="sm" onClick={() => saveEdit(s.id)}><Check className="w-4 h-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full bg-${s.color}-500`} />
                                    <span className={s.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}>{s.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 mr-2">Sıra: {s.sort_order}</span>
                                    <button onClick={() => toggleActive(s.id, s.is_active)} className={`text-sm px-2 py-1 rounded ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{s.is_active ? 'Aktif' : 'Pasif'}</button>
                                    <button onClick={() => { setEditingId(s.id); setEditLabel(s.label); setEditColor(s.color); }} className="p-1 hover:bg-gray-100 rounded text-blue-600"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => deleteStatus(s.id)} className="p-1 hover:bg-gray-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function QuickNotesManager({ notes, refresh }: { notes: any[], refresh: () => void }) {
    const [newLabel, setNewLabel] = useState('');
    const [newColor, setNewColor] = useState('gray'); // Although quick notes might not use color, we can keep it for UI consistency
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [editColor, setEditColor] = useState('');

    async function addNote(e: React.FormEvent) {
        e.preventDefault();
        await fetch('/api/admin/quick-notes', {
            method: 'POST',
            body: JSON.stringify({ label: newLabel, color: newColor })
        });
        setNewLabel('');
        refresh();
    }

    async function toggleActive(id: string, current: boolean) {
        await fetch('/api/admin/quick-notes', {
            method: 'PATCH',
            body: JSON.stringify({ id, is_active: !current })
        });
        refresh();
    }

    async function deleteNote(id: string) {
        if (!confirm('Bu notu silmek istediğinize emin misiniz?')) return;
        const res = await fetch(`/api/admin/quick-notes?id=${id}`, { method: 'DELETE' });
        if (res.ok) refresh();
        else alert('Silinemedi.');
    }

    async function saveEdit(id: string) {
        await fetch('/api/admin/quick-notes', {
            method: 'PUT',
            body: JSON.stringify({ id, label: editLabel, color: editColor })
        });
        setEditingId(null);
        refresh();
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-semibold mb-3">Yeni Hızlı Not Ekle</h3>
                <form onSubmit={addNote} className="flex gap-2">
                    <input className="border rounded px-3 py-2 flex-1" placeholder="Örn: Fiyat Sordu" value={newLabel} onChange={e => setNewLabel(e.target.value)} required />
                    <Button type="submit">Ekle</Button>
                </form>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y">
                {notes.map((n) => (
                    <div key={n.id} className="p-4 flex items-center justify-between">
                        {editingId === n.id ? (
                            <div className="flex items-center gap-2 flex-1">
                                <input value={editLabel} onChange={e => setEditLabel(e.target.value)} className="border rounded px-2 py-1 flex-1" />
                                <Button size="sm" onClick={() => saveEdit(n.id)}><Check className="w-4 h-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3">
                                    <span className={n.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}>{n.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 mr-2">Sıra: {n.sort_order}</span>
                                    <button onClick={() => toggleActive(n.id, n.is_active)} className={`text-sm px-2 py-1 rounded ${n.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{n.is_active ? 'Aktif' : 'Pasif'}</button>
                                    <button onClick={() => { setEditingId(n.id); setEditLabel(n.label); setEditColor(n.color); }} className="p-1 hover:bg-gray-100 rounded text-blue-600"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => deleteNote(n.id)} className="p-1 hover:bg-gray-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function ProductManager({ products, refresh }: { products: any[], refresh: () => void }) {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');

    async function addProduct(e: React.FormEvent) {
        e.preventDefault();
        await fetch('/api/admin/products', {
            method: 'POST',
            body: JSON.stringify({ name, price: parseFloat(price) })
        });
        setName('');
        setPrice('');
        refresh();
    }

    async function deleteProduct(id: string) {
        if (!confirm('Silinsin mi?')) return;
        await fetch(`/api/admin/products?id=${id}`, { method: 'DELETE' });
        refresh();
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-semibold mb-3">Yeni Ürün Ekle</h3>
                <form onSubmit={addProduct} className="flex gap-2">
                    <input className="border rounded px-3 py-2 flex-1" placeholder="Ürün Adı" value={name} onChange={e => setName(e.target.value)} required />
                    <input type="number" className="border rounded px-3 py-2 w-32" placeholder="Fiyat" value={price} onChange={e => setPrice(e.target.value)} required />
                    <Button type="submit">Ekle</Button>
                </form>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y">
                {products.map((p) => (
                    <div key={p.id} className="p-4 flex items-center justify-between">
                        <span className="font-medium text-gray-900">{p.name}</span>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-600 font-mono">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(p.price || 0)}</span>
                            <button onClick={() => deleteProduct(p.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function UserManager({ users, refresh }: { users: any[], refresh: () => void }) {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [formData, setFormData] = useState({ email: '', name: '', password: '', role: 'SALES_REP' });
    const [loading, setLoading] = useState(false);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                setIsAddOpen(false);
                setFormData({ email: '', name: '', password: '', role: 'SALES_REP' });
                refresh();
                alert('Kullanıcı eklendi!');
            } else {
                alert('Hata: ' + data.error);
            }
        } catch (e) { alert('Hata oluştu'); }
        finally { setLoading(false); }
    }

    async function handleDelete(id: string) {
        if (!confirm('Silinsin mi?')) return;
        await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
        refresh();
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div>
                    <h3 className="font-semibold text-gray-900">Personel Listesi</h3>
                    <p className="text-sm text-gray-500">Sisteme giriş yetkisi olan kullanıcılar.</p>
                </div>
                <Button onClick={() => setIsAddOpen(!isAddOpen)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Yeni Personel
                </Button>
            </div>

            {isAddOpen && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h4 className="font-medium mb-4">Kullanıcı Bilgileri</h4>
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input className="border rounded px-3 py-2" placeholder="Ad Soyad" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                        <input className="border rounded px-3 py-2" placeholder="E-Posta" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                        <input className="border rounded px-3 py-2" placeholder="Şifre" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                        <select className="border rounded px-3 py-2" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                            <option value="SALES_REP">Personel (Satış)</option>
                            <option value="ADMIN">Yönetici (Admin)</option>
                        </select>
                        <div className="md:col-span-2 pt-2">
                            <Button type="submit" disabled={loading} className="w-full">{loading ? 'Kaydediliyor...' : 'Kaydet'}</Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y">
                {users.map(u => (
                    <div key={u.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                        <div>
                            <div className="font-medium text-gray-900">{u.name}</div>
                            <div className="text-sm text-gray-500">{u.email}</div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                {u.role === 'ADMIN' ? 'Yönetici' : 'Personel'}
                            </span>
                            <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ImportManager() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [stats, setStats] = useState<any>(null);

    const [deleting, setDeleting] = useState(false);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);

            const reader = new FileReader();
            reader.onload = (evt) => {
                const data = evt.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Get raw data (header: 1 returns array of arrays)
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                // Auto-detect header row
                let startIndex = 0;
                if (jsonData.length > 0) {
                    const firstRow = jsonData[0];
                    if (firstRow && firstRow[0] && (String(firstRow[0]).toLowerCase().includes('ad') || String(firstRow[0]).toLowerCase().includes('isim'))) {
                        startIndex = 1; // Skip header
                    }
                }

                const parsed = jsonData.slice(startIndex).map(row => {
                    return {
                        ad_soyad: row[0] ? String(row[0]).trim() : '',
                        telefon: row[1] ? String(row[1]).trim() : '',
                        durum: row[2] ? String(row[2]).trim() : 'Yeni',
                        tc_kimlik: row[3] ? String(row[3]).trim() : '',
                        sehir: row[4] ? String(row[4]).trim() : ''
                    };
                }).filter(l => l.ad_soyad && l.ad_soyad.length > 2 && l.telefon && l.telefon.length > 6);

                setPreview(parsed);
            };
            reader.readAsArrayBuffer(f);
        }
    };

    const handleUpload = async () => {
        if (!file || preview.length === 0) return;
        setUploading(true);

        try {
            const res = await fetch('/api/leads/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leads: preview })
            });
            const json = await res.json();
            setStats(json.stats);
            if (json.success) {
                setFile(null);
                setPreview([]);
                alert(`İşlem Tamamlandı: ${json.stats.success} başarılı, ${json.stats.error} hatalı.`);
            } else {
                alert('Hata: ' + json.error);
            }
        } catch (e) {
            alert('Yükleme sırasında hata oluştu.');
        } finally {
            setUploading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm('DİKKAT: Üzerinize zimmetli TÜM müşteriler silinecektir. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?')) return;
        setDeleting(true);
        try {
            const res = await fetch('/api/admin/bulk-delete-my-leads', { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                alert(`${json.count} adet kayıt silindi.`);
                setPreview([]);
                setFile(null);
            } else {
                alert('Silme işlemi başarısız: ' + json.error);
            }
        } catch (e) {
            alert('Hata oluştu.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                    <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFile} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <Upload className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="font-medium text-gray-900">Excel (.xlsx) veya CSV Dosyasını Buraya Sürükleyin</p>
                    <p className="text-sm text-gray-500 mt-2">Format: A Sütunu (İsim), B Sütunu (Telefon), C Sütunu (Durum)</p>
                    {file && <p className="mt-4 text-green-600 font-bold bg-green-50 px-3 py-1 rounded">{file.name}</p>}
                </div>

                <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={handleBulkDelete} disabled={deleting || uploading} className="text-red-600 border-red-200 hover:bg-red-50">
                        <Trash2 className="w-4 h-4 mr-2" />
                        {deleting ? 'Siliniyor...' : 'Hatalı Yüklenenleri Temizle (Bana Ait Olanları Sil)'}
                    </Button>
                </div>
            </div>

            {preview.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <h3 className="font-semibold mb-4">Önizleme (İlk 5 Satır)</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {Object.keys(preview[0] || {}).map(k => <th key={k} className="px-4 py-2 text-left">{k}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((row, i) => (
                                    <tr key={i} className="border-b">
                                        {Object.values(row).map((v: any, j) => <td key={j} className="px-4 py-2">{v}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleUpload} disabled={uploading} size="lg">
                            {uploading ? <Loader2 className="animate-spin mr-2" /> : <FileSpreadsheet className="mr-2" />}
                            {uploading ? 'Yükleniyor...' : 'İçe Aktarmayı Başlat'}
                        </Button>
                    </div>
                </div>
            )}

            {stats && (
                <div className={`p-4 rounded-lg border ${stats.error > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                    <h3 className="font-bold mb-2">Yükleme Sonucu</h3>
                    <p>Başarılı: {stats.success}</p>
                    <p>Hatalı: {stats.error}</p>
                    {stats.errors.length > 0 && (
                        <div className="mt-2 text-xs text-red-600 max-h-32 overflow-y-auto">
                            {stats.errors.map((e: string, i: number) => <div key={i}>{e}</div>)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function DuplicateManager({ groups, refresh }: { groups: any[], refresh: () => void }) {
    async function deleteCustomer(id: string) {
        if (!confirm('Silmek istediğinize emin misiniz?')) return;
        await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        refresh();
    }

    if (groups.length === 0) return (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 animate-in fade-in">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Mükerrer Kayıt Yok</h3>
            <p className="text-gray-500">Veritabanınız temiz.</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 text-orange-800 flex items-center gap-3">
                <Info className="w-5 h-5" />
                <p>{groups.length} adet telefon numarasının birden fazla kaydı bulundu.</p>
            </div>

            {groups.map((group) => (
                <div key={group.phoneNumber} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center justify-between">
                        <div className="font-mono font-bold text-lg">{group.phoneNumber}</div>
                        <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">{group.customers.length} Kayıt</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {group.customers.map((c: any) => (
                            <div key={c.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                <div>
                                    <div className="font-medium">{c.ad_soyad}</div>
                                    <div className="text-xs text-gray-500 flex gap-2">
                                        <span>Durum: {c.durum}</span>
                                        <span>• {new Date(c.created_at).toLocaleDateString('tr-TR')}</span>
                                        <span>• Sahip: {c.sahip || '-'}</span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => deleteCustomer(c.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">Sil</Button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

