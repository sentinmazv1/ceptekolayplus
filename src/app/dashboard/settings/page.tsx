'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Trash2, Plus, Loader2, Save, Scale, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const router = useRouter();
    const [reasons, setReasons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newReason, setNewReason] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchReasons();
    }, []);

    const fetchReasons = async () => {
        try {
            const res = await fetch('/api/settings/reasons');
            const json = await res.json();
            if (json.success) {
                setReasons(json.reasons || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReason.trim()) return;

        setAdding(true);
        try {
            const res = await fetch('/api/settings/reasons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: newReason })
            });
            const json = await res.json();
            if (json.success) {
                setReasons([...reasons, json.reason]);
                setNewReason('');
            } else {
                alert('Hata: ' + json.message);
            }
        } catch (error) {
            alert('Bağlantı hatası');
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu nedeni silmek istediğinize emin misiniz?')) return;

        try {
            const res = await fetch(`/api/settings/reasons?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setReasons(reasons.filter(r => r.id !== id));
            }
        } catch (error) {
            alert('Silinemedi');
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 pb-32">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="outline" onClick={() => router.back()} className="hover:bg-white">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Geri Dön
                </Button>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Sistem Ayarları</h1>
                    <p className="text-gray-500 font-medium">CRM Konfigürasyonu</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                    <div className="p-2 bg-red-100 rounded-lg text-red-600">
                        <Scale className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">İptal Nedenleri</h2>
                        <p className="text-sm text-gray-500">Müşteri iptal/ret durumlarında seçilecek nedenler listesi.</p>
                    </div>
                </div>

                {/* Add Form */}
                <form onSubmit={handleAdd} className="flex gap-3 mb-8">
                    <div className="flex-1">
                        <Input
                            value={newReason}
                            onChange={(e) => setNewReason(e.target.value)}
                            placeholder="Yeni iptal nedeni yazınız... (Örn: Stok Yok)"
                            className="text-lg"
                        />
                    </div>
                    <Button type="submit" disabled={adding || !newReason.trim()} className="px-6 bg-indigo-600 hover:bg-indigo-700">
                        {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5 mr-1" /> Ekle</>}
                    </Button>
                </form>

                {/* List */}
                {loading ? (
                    <div className="text-center py-10 text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Yükleniyor...</div>
                ) : (
                    <div className="space-y-2">
                        {reasons.length === 0 && (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                                Henüz bir neden eklenmemiş.
                            </div>
                        )}
                        {reasons.map((r) => (
                            <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-white hover:shadow-sm transition-all group">
                                <span className="font-bold text-gray-700">{r.reason}</span>
                                <button
                                    onClick={() => handleDelete(r.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="Sil"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
