'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Customer } from '@/lib/types';
import { Loader2, Trash2, Phone, Calendar, User, Search, RefreshCcw } from 'lucide-react';

interface DuplicateGroup {
    phoneNumber: string;
    customers: Customer[];
}

export default function DuplicatesPage() {
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState<DuplicateGroup[]>([]);

    useEffect(() => {
        fetchDuplicates();
    }, []);

    const fetchDuplicates = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/duplicates');
            const json = await res.json();
            if (res.ok) {
                setGroups(json.groups || []);
            }
        } catch (error) {
            console.error('Failed to fetch duplicates', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, phone: string) => {
        if (!confirm('Bu kaydı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;

        try {
            const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
            if (res.ok) {
                // Update local state to remove item
                setGroups(prev => prev.map(g => {
                    if (g.phoneNumber === phone) {
                        return {
                            ...g,
                            customers: g.customers.filter(c => c.id !== id)
                        };
                    }
                    return g;
                }).filter(g => g.customers.length > 1)); // Remove group if only 1 left
            } else {
                alert('Silme işlemi başarısız oldu.');
            }
        } catch (error) {
            alert('Bir hata oluştu.');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mükerrer Kayıt Kontrolü</h1>
                    <p className="text-gray-500 mt-1">Aynı telefon numarasına sahip birden fazla kayıtları listeler.</p>
                </div>
                <Button onClick={fetchDuplicates} disabled={loading} variant="outline">
                    <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Yenile
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            ) : groups.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Harika! Mükerrer kayıt bulunamadı.</h3>
                    <p className="text-gray-500">Tüm veriler temiz görünüyor.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {groups.map((group) => (
                        <div key={group.phoneNumber} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-full">
                                        <Phone className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{group.phoneNumber}</h3>
                                        <p className="text-xs text-orange-700 font-medium">Bu numaradan {group.customers.length} kayıt bulundu</p>
                                    </div>
                                </div>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {group.customers.map((customer) => (
                                    <div key={customer.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <span className="font-semibold text-gray-900">{customer.ad_soyad}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${customer.durum === 'Onaylandı' ? 'bg-green-100 text-green-700' :
                                                        customer.durum === 'Reddetti' ? 'bg-red-100 text-red-700' :
                                                            'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {customer.durum}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(customer.created_at).toLocaleDateString('tr-TR')}
                                                </span>
                                                {customer.sahip && (
                                                    <span>• Sahip: {customer.sahip}</span>
                                                )}
                                                {customer.tc_kimlik && (
                                                    <span>• TC: {customer.tc_kimlik}</span>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleDelete(customer.id, group.phoneNumber)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Sil
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
