'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2, Trash2, Edit2, Plus, GripVertical, Check, X } from 'lucide-react';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'statuses' | 'products'>('statuses');
    const [loading, setLoading] = useState(true);

    // Data
    const [statuses, setStatuses] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);

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
            } else {
                const res = await fetch('/api/admin/products');
                const data = await res.json();
                if (data.products) setProducts(data.products);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Sistem Ayarları</h1>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('statuses')}
                    className={`py-2 px-4 text-sm font-medium border-b-2 ${activeTab === 'statuses' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Durumlar (Aşamalar)
                </button>
                <button
                    onClick={() => setActiveTab('products')}
                    className={`py-2 px-4 text-sm font-medium border-b-2 ${activeTab === 'products' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Ürünler ve Fiyatlar
                </button>
            </div>

            {loading ? (
                <div className="p-8"><Loader2 className="animate-spin" /></div>
            ) : (
                <>
                    {activeTab === 'statuses' ? (
                        <StatusManager statuses={statuses} refresh={fetchData} />
                    ) : (
                        <ProductManager products={products} refresh={fetchData} />
                    )}
                </>
            )}
        </div>
    );
}

function StatusManager({ statuses, refresh }: { statuses: any[], refresh: () => void }) {
    const [newStatus, setNewStatus] = useState('');
    const [newColor, setNewColor] = useState('gray');

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

    return (
        <div className="space-y-6">
            {/* Add Form */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-semibold mb-3">Yeni Durum Ekle</h3>
                <form onSubmit={addStatus} className="flex gap-2">
                    <input
                        className="border rounded px-3 py-2 flex-1"
                        placeholder="Örn: Kargoya Verildi"
                        value={newStatus}
                        onChange={e => setNewStatus(e.target.value)}
                        required
                    />
                    <select
                        className="border rounded px-3 py-2"
                        value={newColor}
                        onChange={e => setNewColor(e.target.value)}
                    >
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

            {/* List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y">
                {statuses.map((s) => (
                    <div key={s.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full bg-${s.color}-500`} />
                            <span className={s.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}>{s.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 mr-2">Sıra: {s.sort_order}</span>
                            <button
                                onClick={() => toggleActive(s.id, s.is_active)}
                                className={`text-sm px-2 py-1 rounded ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}
                            >
                                {s.is_active ? 'Aktif' : 'Pasif'}
                            </button>
                        </div>
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
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-semibold mb-3">Yeni Ürün Ekle</h3>
                <form onSubmit={addProduct} className="flex gap-2">
                    <input
                        className="border rounded px-3 py-2 flex-1"
                        placeholder="Ürün Adı"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                    />
                    <input
                        type="number"
                        className="border rounded px-3 py-2 w-32"
                        placeholder="Fiyat"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        required
                    />
                    <Button type="submit">Ekle</Button>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y">
                {products.map((p) => (
                    <div key={p.id} className="p-4 flex items-center justify-between">
                        <span className="font-medium text-gray-900">{p.name}</span>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-600 font-mono">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(p.price || 0)}
                            </span>
                            <button onClick={() => deleteProduct(p.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
