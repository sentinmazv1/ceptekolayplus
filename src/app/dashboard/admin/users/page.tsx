'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2, Trash2, Shield, ShieldAlert, UserPlus, CheckCircle } from 'lucide-react';

interface User {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'SALES_REP';
    created_at: string;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        password: '',
        role: 'SALES_REP'
    });
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.users) {
                setUsers(data.users);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setMsg('');

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (data.success) {
                setMsg('Kullanıcı eklendi!');
                setIsAddOpen(false);
                setFormData({ email: '', name: '', password: '', role: 'SALES_REP' });
                fetchUsers();
            } else {
                setMsg('Hata: ' + data.error);
            }
        } catch (error) {
            setMsg('Bir hata oluştu.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;

        try {
            const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchUsers();
            } else {
                alert('Silinemedi.');
            }
        } catch (e) {
            alert('Hata oluştu.');
        }
    }

    if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
                <Button onClick={() => setIsAddOpen(!isAddOpen)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Yeni Kullanıcı Ekle
                </Button>
            </div>

            {/* Add User Form */}
            {isAddOpen && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-in slide-in-from-top-2">
                    <h2 className="text-lg font-semibold mb-4">Yeni Personel Tanımla</h2>
                    <form onSubmit={handleAdd} className="space-y-4 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Ad Soyad</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">E-Posta</label>
                            <input
                                type="email"
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Şifre</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Rol</label>
                            <select
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="SALES_REP">Peronel (Satış Temsilcisi)</option>
                                <option value="ADMIN">Yönetici (Admin)</option>
                            </select>
                        </div>
                        <div className="pt-2 flex gap-2">
                            <Button type="submit" disabled={submitting}>
                                {submitting ? 'Ekleniyor...' : 'Kaydet'}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Vazgeç</Button>
                        </div>
                        {msg && <p className="text-sm text-green-600 mt-2">{msg}</p>}
                    </form>
                </div>
            )}

            {/* Users List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İsim</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-Posta</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {user.role === 'ADMIN' ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                            <Shield className="w-3 h-3 mr-1" />
                                            Admin
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            Personel
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
