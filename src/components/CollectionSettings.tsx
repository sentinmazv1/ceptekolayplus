
import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, GripVertical, CheckCircle, XCircle } from 'lucide-react';

interface SettingItem {
    id: number;
    label: string;
    color: string;
    sort_order: number;
    is_active: boolean;
}

interface CollectionSettingsProps {
    type: 'CLASS' | 'STATUS';
}

export function CollectionSettings({ type }: CollectionSettingsProps) {
    const [items, setItems] = useState<SettingItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [newItem, setNewItem] = useState('');
    const [newColor, setNewColor] = useState('gray');

    const title = type === 'CLASS' ? 'Müşteri Sınıfları' : 'Tahsilat Durumları';
    const apiPath = type === 'CLASS' ? '/api/admin/collection/classes' : '/api/admin/collection/statuses';

    const colors = [
        { name: 'Gri', value: 'gray', bg: 'bg-gray-100 text-gray-800' },
        { name: 'Kırmızı', value: 'red', bg: 'bg-red-100 text-red-800' },
        { name: 'Yeşil', value: 'green', bg: 'bg-green-100 text-green-800' },
        { name: 'Mavi', value: 'blue', bg: 'bg-blue-100 text-blue-800' },
        { name: 'Sarı', value: 'yellow', bg: 'bg-yellow-100 text-yellow-800' },
        { name: 'Turuncu', value: 'orange', bg: 'bg-orange-100 text-orange-800' },
        { name: 'Mor', value: 'purple', bg: 'bg-purple-100 text-purple-800' },
        { name: 'Pembe', value: 'pink', bg: 'bg-pink-100 text-pink-800' },
    ];

    useEffect(() => {
        fetchItems();
    }, [type]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await fetch(apiPath);
            const json = await res.json();
            if (json.success) setItems(json.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newItem.trim()) return;
        try {
            const res = await fetch(apiPath, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: newItem, color: newColor })
            });
            const json = await res.json();
            if (json.success) {
                setNewItem('');
                fetchItems();
            }
        } catch (error) {
            alert('Ekleme hatası');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Silmek istediğinize emin misiniz?')) return;
        try {
            const res = await fetch(`${apiPath}?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchItems();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                {title}
            </h3>

            {/* Add New */}
            <div className="flex gap-2 mb-6">
                <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Yeni değer ekle..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <select
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none"
                >
                    {colors.map(c => (
                        <option key={c.value} value={c.value}>{c.name}</option>
                    ))}
                </select>
                <button
                    onClick={handleAdd}
                    disabled={!newItem.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 disabled:opacity-50"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-indigo-500" /></div>
            ) : (
                <div className="space-y-2">
                    {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                            <div className="flex items-center gap-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${colors.find(c => c.value === item.color)?.bg || 'bg-gray-100 text-gray-800'}`}>
                                    {item.label}
                                </span>
                            </div>
                            <button
                                onClick={() => handleDelete(item.id)}
                                className="text-gray-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="text-center text-gray-400 text-sm py-4">Henüz kayıt yok.</div>
                    )}
                </div>
            )}
        </div>
    );
}
