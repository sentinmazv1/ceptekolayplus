'use client';

import { useState, useEffect } from 'react';
import { Loader2, Search, Filter, Phone, MessageSquare, Send, Users, CheckCircle, X, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function BulkSmsPage() {
    // UI State
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [channel, setChannel] = useState<'SMS' | 'WHATSAPP'>('SMS');

    // Data
    const [users, setUsers] = useState<any[]>([]);
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    // Filters
    const [filters, setFilters] = useState({
        status: 'all',
        city: 'all',
        attorneyStatus: 'all',
        startDate: '',
        endDate: ''
    });

    // Message Composition
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [messageContent, setMessageContent] = useState('');

    // Status Update Options
    const [assignToSender, setAssignToSender] = useState(false);
    const [enableStatusChange, setEnableStatusChange] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');

    // Load Data
    useEffect(() => {
        fetchTemplates();
        fetchUsers();
    }, []);

    // Re-fetch users when filters change (debounced could be better but let's keep it simple)
    useEffect(() => {
        fetchUsers();
    }, [filters]);

    // Update message content when template changes
    useEffect(() => {
        if (selectedTemplateId) {
            const t = templates.find(x => x.id === selectedTemplateId);
            if (t) setMessageContent(t.content);
        }
    }, [selectedTemplateId, templates]);

    async function fetchTemplates() {
        try {
            const res = await fetch(`/api/admin/sms-templates?type=${channel}`);
            const data = await res.json();
            if (data.templates) setTemplates(data.templates);
        } catch (e) {
            console.error('Template fetch error', e);
        }
    }

    // Refresh templates when channel switches
    useEffect(() => {
        fetchTemplates();
        setSelectedTemplateId('');
        setMessageContent('');
    }, [channel]);

    async function fetchUsers() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.status !== 'all') params.append('status', filters.status);
            if (filters.city !== 'all') params.append('city', filters.city);
            if (filters.attorneyStatus !== 'all') params.append('attorneyStatus', filters.attorneyStatus);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const res = await fetch(`/api/admin/bulk-sms?${params.toString()}`);
            const data = await res.json();
            if (data.users) {
                setUsers(data.users);
                // Reset selection on filter change? Or keep? Let's reset for safety
                setSelectedUserIds([]);
            }
        } catch (e) {
            console.error('User fetch error', e);
        } finally {
            setLoading(false);
        }
    }

    const toggleSelectAll = () => {
        if (selectedUserIds.length === users.length) {
            setSelectedUserIds([]);
        } else {
            setSelectedUserIds(users.map(u => u.id));
        }
    };

    const toggleUser = (id: string) => {
        if (selectedUserIds.includes(id)) {
            setSelectedUserIds(prev => prev.filter(x => x !== id));
        } else {
            setSelectedUserIds(prev => [...prev, id]);
        }
    };

    const handleSend = async () => {
        if (selectedUserIds.length === 0) return alert('Lütfen en az bir kişi seçin.');
        if (!messageContent) return alert('Mesaj içeriği boş olamaz.');

        if (!confirm(`${selectedUserIds.length} kişiye bu mesaj gönderilecek. Emin misiniz?`)) return;

        setSending(true);
        try {
            const res = await fetch('/api/admin/bulk-sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userIds: selectedUserIds,
                    message: messageContent,
                    channel,
                    templateId: selectedTemplateId,
                    statusUpdate: {
                        assignToSender: assignToSender,
                        status: enableStatusChange ? selectedStatus : ''
                    }
                })
            });
            const json = await res.json();
            if (res.ok) {
                alert('İşlem Başarılı! ' + json.message);
                // Maybe clear selection?
                setSelectedUserIds([]);
            } else {
                alert('Hata: ' + json.message);
            }
        } catch (e) {
            alert('Gönderim hatası');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme('spacing.4'))] gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Toplu Mesaj Merkezi</h1>
                    <p className="text-gray-500">Filtrelediğiniz müşteri kitlesine SMS veya WhatsApp mesajı gönderin.</p>
                </div>

                {/* Channel Switcher */}
                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 mt-4 md:mt-0">
                    <button
                        onClick={() => setChannel('SMS')}
                        className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${channel === 'SMS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <Phone className="w-4 h-4 mr-2" /> SMS
                    </button>
                    <button
                        onClick={() => setChannel('WHATSAPP')}
                        className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${channel === 'WHATSAPP' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">

                {/* LEFT: User List & Filters */}
                <div className="lg:col-span-2 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Filter Bar */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[140px]">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Aşama / Durum</label>
                            <select
                                className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={filters.status}
                                onChange={e => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option value="all">Tüm Durumlar</option>
                                <option value="Yeni">Yeni Başvuru</option>
                                <option value="Aranacak">Aranacak</option>
                                <option value="Ulaşılamadı">Ulaşılamadı</option>
                                <option value="Onaylandı">Onaylandı</option>
                                <option value="Reddetti">Reddetti</option>
                            </select>
                        </div>

                        <div className="flex-1 min-w-[140px]">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Avukat Sorgusu</label>
                            <select
                                className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={filters.attorneyStatus}
                                onChange={e => setFilters({ ...filters, attorneyStatus: e.target.value })}
                            >
                                <option value="all">Farketmez</option>
                                <option value="BEKLİYOR">Sorgu Bekleyen</option>
                                <option value="OLUMLU">Temiz (Olumlu)</option>
                                <option value="OLUMSUZ">Sorunlu (Olumsuz)</option>
                            </select>
                        </div>

                        <div className="flex-1 min-w-[140px]">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Şehir</label>
                            <input
                                className="w-full text-sm border-gray-300 rounded-lg shadow-sm"
                                placeholder="Örn: Ankara"
                                value={filters.city === 'all' ? '' : filters.city}
                                onChange={e => setFilters({ ...filters, city: e.target.value || 'all' })}
                            />
                        </div>

                        {/* Dates could go here too but keeping simple for now */}
                    </div>

                    {/* Stats */}
                    <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-700 font-medium flex justify-between items-center">
                        <span>{loading ? 'Yükleniyor...' : `${users.length} Kayıt Bulundu`}</span>
                        <span>{selectedUserIds.length} Seçili</span>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left w-10">
                                        <button onClick={toggleSelectAll} className="text-gray-500 hover:text-indigo-600">
                                            {selectedUserIds.length > 0 && selectedUserIds.length === users.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                        </button>
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kayıt Tarihi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Yükleniyor...
                                        </td>
                                    </tr>
                                )}
                                {!loading && users.map((user) => (
                                    <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${selectedUserIds.includes(user.id) ? 'bg-indigo-50/50' : ''}`} onClick={() => toggleUser(user.id)}>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {selectedUserIds.includes(user.id)
                                                ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                                                : <Square className="w-4 h-4 text-gray-300" />}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{user.ad_soyad}</div>
                                            <div className="text-xs text-gray-500">{user.sehir}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                {user.durum}
                                            </span>
                                            {user.avukat_sorgu_durumu && (
                                                <div className={`text-[10px] mt-1 font-bold ${user.avukat_sorgu_durumu === 'OLUMLU' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {user.avukat_sorgu_durumu}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">
                                            {user.telefon}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RIGHT: Message Composer */}
                <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        {channel === 'SMS' ? <Phone className="w-5 h-5 text-indigo-600" /> : <MessageSquare className="w-5 h-5 text-green-600" />}
                        Mesaj Oluştur
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Şablon Seçin</label>
                            <select
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2"
                                value={selectedTemplateId}
                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                            >
                                <option value="">-- Özel Mesaj Yaz --</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj İçeriği</label>
                            <textarea
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 h-40 text-sm"
                                placeholder={`Mesajınızı buraya yazın... ${channel === 'WHATSAPP' ? '\n*Kalın*, _İtalik_ kullanabilirsiniz.' : ''}`}
                                value={messageContent}
                                onChange={(e) => setMessageContent(e.target.value)}
                            ></textarea>
                            <div className="flex justify-between items-center mt-1 text-xs text-gray-400">
                                <span>{messageContent.length} karakter</span>
                                {channel === 'SMS' && <span>{Math.ceil(messageContent.length / 160)} SMS (Yaklaşık)</span>}
                            </div>
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800">
                            <strong>Bilgi:</strong> Seçilen {selectedUserIds.length} kullanıcıya bu mesaj sırayla gönderilecektir.
                            {channel === 'WHATSAPP' && <p className="mt-1">WhatsApp gönderimleri masaüstü uygulaması gerektirebilir veya entegrasyon servisi kullanır.</p>}
                        </div>

                        {/* Status Update Options */}
                        <div className="border-t border-gray-200 pt-4 space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700">Durum Güncelleme Seçenekleri</h3>

                            {/* Assign to Me - Always visible */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={assignToSender}
                                    onChange={(e) => setAssignToSender(e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-700">Bana Ata</span>
                            </label>

                            {/* Change Status */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={enableStatusChange}
                                    onChange={(e) => setEnableStatusChange(e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-700">Gönderilenlerin Durumunu Değiştir</span>
                            </label>

                            {enableStatusChange && (
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="">-- Durum Seçin --</option>
                                    <option value="Aranacak">Aranacak</option>
                                    <option value="Ulaşılamadı">Ulaşılamadı</option>
                                    <option value="Onaylandı">Onaylandı</option>
                                    <option value="Reddetti">Reddetti</option>
                                    <option value="Kefil Bekleniyor">Kefil Bekleniyor</option>
                                    <option value="Teslim edildi">Teslim edildi</option>
                                </select>
                            )}
                        </div>

                        <Button
                            className={`w-full py-6 text-lg font-bold shadow-lg shadow-indigo-100 ${channel === 'WHATSAPP' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                            onClick={handleSend}
                            disabled={sending || selectedUserIds.length === 0}
                            isLoading={sending}
                        >
                            <Send className="w-5 h-5 mr-2" />
                            {sending ? 'Gönderiliyor...' : 'Gönderimi Başlat'}
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
}
