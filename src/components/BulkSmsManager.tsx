'use client';

import { useState, useEffect } from 'react';
import { Loader2, Search, Filter, Phone, MessageSquare, Send, Users, CheckCircle, X, CheckSquare, Square, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from './ui/Button'; // Assuming ui/Button exists in components
import { cityList, getDistrictsByCityCode } from 'turkey-neighbourhoods';

export function BulkSmsManager() {
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
        statusValue: 'all',
        startDate: '',
        endDate: ''
    });

    const [districts, setDistricts] = useState<string[]>([]);

    // Message Composition
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [messageContent, setMessageContent] = useState('');

    const [dynamicStatuses, setDynamicStatuses] = useState<any[]>([]);

    // Load Data
    useEffect(() => {
        fetchTemplates();
        fetchUsers();
        fetchStatuses();
    }, []);

    async function fetchStatuses() {
        try {
            const res = await fetch('/api/admin/statuses');
            const data = await res.json();
            if (data.statuses) setDynamicStatuses(data.statuses);
        } catch (e) {
            console.error('Status fetch error', e);
        }
    }

    useEffect(() => {
        // District logic
        if (filters.city && filters.city !== 'all') {
            const c = cityList.find(x => x.name === filters.city);
            if (c) {
                setDistricts(getDistrictsByCityCode(c.code));
            } else {
                setDistricts([]);
            }
        } else {
            setDistricts([]);
        }
    }, [filters.city]);

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

    // Update message content when template changes
    useEffect(() => {
        if (selectedTemplateId) {
            const t = templates.find(x => x.id === selectedTemplateId);
            if (t) setMessageContent(t.content);
        }
    }, [selectedTemplateId, templates]);

    async function fetchUsers() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.statusValue !== 'all') params.append('status', filters.statusValue);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);

            const res = await fetch(`/api/admin/bulk-sms?${params.toString()}`);
            const data = await res.json();
            if (data.users) {
                setUsers(data.users);
                setSelectedUserIds([]); // Reset selection
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
                    templateId: selectedTemplateId
                })
            });
            const json = await res.json();
            if (res.ok) {
                alert('İşlem Başarılı! ' + json.message);
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
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Channel */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="mb-4 md:mb-0">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        Toplu Mesaj Merkezi
                    </h3>
                    <p className="text-sm text-gray-500">Detaylı filtreleme ile hedef kitleye SMS veya WhatsApp mesajı gönderin.</p>
                </div>

                <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    <button
                        onClick={() => setChannel('SMS')}
                        className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${channel === 'SMS' ? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-200' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <Smartphone className="w-4 h-4 mr-2" /> SMS
                    </button>
                    <button
                        onClick={() => setChannel('WHATSAPP')}
                        className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${channel === 'WHATSAPP' ? 'bg-green-50 text-green-600 shadow-sm ring-1 ring-green-200' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* LEFT: User List & Advanced Filters */}
                <div className="xl:col-span-2 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
                    {/* Collapsible Filter Bar? Or Always Open? Always open for "very detailed" feel */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="col-span-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Aşama / Durum</label>
                            <select
                                className="w-full text-xs border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={filters.statusValue}
                                onChange={e => setFilters({ ...filters, statusValue: e.target.value })}
                            >
                                <option value="all">Tümü</option>
                                {/* Static defaults if API fails or for standard ones */}
                                {dynamicStatuses.length > 0 ? (
                                    dynamicStatuses.filter(s => s.is_active).map(s => (
                                        <option key={s.id} value={s.label}>{s.label}</option>
                                    ))
                                ) : (
                                    <>
                                        <option value="Yeni">Yeni Başvuru</option>
                                        <option value="Aranacak">Aranacak</option>
                                        <option value="Ulaşılamadı">Ulaşılamadı</option>
                                        <option value="Meşgul/Hattı kapalı">Meşgul/Kapalı</option>
                                        <option value="Yanlış numara">Yanlış No</option>
                                        <option value="Daha sonra aranmak istiyor">Erteleyenler</option>
                                        <option value="WhatsApp'tan bilgi istiyor">WhatsApp</option>
                                        <option value="E-Devlet paylaşmak istemedi">Bilgi Vermeyen</option>
                                        <option value="Başvuru alındı">Başvuru Alındı</option>
                                        <option value="Onaylandı">Onaylandı</option>
                                        <option value="Kefil bekleniyor">Kefil Bekleyen</option>
                                        <option value="Reddetti">Reddedildi</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div className="col-span-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Avukat Sorgusu</label>
                            <select
                                className="w-full text-xs border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={filters.attorneyStatus}
                                onChange={e => setFilters({ ...filters, attorneyStatus: e.target.value })}
                            >
                                <option value="all">Farketmez</option>
                                <option value="BEKLİYOR">Bekleyen</option>
                                <option value="OLUMLU">Temiz (Olumlu)</option>
                                <option value="OLUMSUZ">Sorunlu (Olumsuz)</option>
                            </select>
                        </div>

                        <div className="col-span-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Şehir</label>
                            <select
                                className="w-full text-xs border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={filters.city}
                                onChange={e => setFilters({ ...filters, city: e.target.value, district: 'all' })}
                            >
                                <option value="all">Tümü</option>
                                {cityList.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="col-span-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">İlçe</label>
                            <select
                                className="w-full text-xs border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={filters.district}
                                onChange={e => setFilters({ ...filters, district: e.target.value })}
                                disabled={filters.city === 'all'}
                            >
                                <option value="all">Tümü</option>
                                {districts.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        <div className="col-span-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Tarih Tipi</label>
                            <select
                                className="w-full text-xs border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={filters.dateType}
                                onChange={e => setFilters({ ...filters, dateType: e.target.value })}
                            >
                                <option value="created_at">Oluşturulma Tarihi</option>
                                <option value="updated_at">Son İşlem / Güncelleme</option>
                            </select>
                        </div>

                        <div className="col-span-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Başlangıç Tarihi</label>
                            <input type="date" className="w-full text-xs border border-gray-300 rounded-lg" onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
                        </div>

                        <div className="col-span-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Bitiş Tarihi</label>
                            <input type="date" className="w-full text-xs border border-gray-300 rounded-lg" onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
                        </div>

                        <div className="col-span-1">
                            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Meslek</label>
                            <input
                                className="w-full text-xs border-gray-300 rounded-lg shadow-sm"
                                placeholder="Örn: Memur"
                                value={filters.job}
                                onChange={e => setFilters({ ...filters, job: e.target.value })}
                            />
                        </div>

                        <div className="col-span-1 flex items-end">
                            <Button size="sm" onClick={fetchUsers} className="w-full" disabled={loading}>
                                <RefreshCw className={`w-3 h-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                {loading ? 'Aranıyor...' : 'Filtrele'}
                            </Button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-700 font-medium flex justify-between items-center">
                        <span className="flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            {users.length} Kayıt Bulundu
                        </span>
                        <span className="bg-white px-2 py-0.5 rounded border border-indigo-200">
                            {selectedUserIds.length} Seçili
                        </span>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto max-h-[600px]">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left w-10">
                                        <button onClick={toggleSelectAll} className="text-gray-500 hover:text-indigo-600">
                                            {selectedUserIds.length > 0 && selectedUserIds.length === users.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                        </button>
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İletişim</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
                                            Yükleniyor...
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                                            Kayıt bulunamadı. Filtreleri kontrol edin.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedUserIds.includes(user.id) ? 'bg-indigo-50/50' : ''}`} onClick={() => toggleUser(user.id)}>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {selectedUserIds.includes(user.id)
                                                    ? <CheckSquare className="w-4 h-4 text-indigo-600" />
                                                    : <Square className="w-4 h-4 text-gray-300" />}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{user.ad_soyad}</div>
                                                <div className="text-xs text-gray-500">{user.sehir} {user.ilce && `/ ${user.ilce}`}</div>
                                                {user.meslek_is && <div className="text-[10px] text-gray-400">{user.meslek_is}</div>}
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
                                                <div className="text-[10px] text-gray-400">{new Date(user.created_at).toLocaleDateString()}</div>
                                            </td>
                                        </tr>
                                    )))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RIGHT: Message Composer */}
                <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit sticky top-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        {channel === 'SMS' ? <Smartphone className="w-5 h-5 text-indigo-600" /> : <MessageSquare className="w-5 h-5 text-green-600" />}
                        {channel} Gönder
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Şablon Seçin</label>
                            <select
                                className="w-full border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2 text-sm"
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
                                className="w-full border border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 h-48 text-sm"
                                placeholder={`Mesajınızı buraya yazın... ${channel === 'WHATSAPP' ? '\n*Kalın*, _İtalik_ kullanabilirsiniz.' : ''}`}
                                value={messageContent}
                                onChange={(e) => setMessageContent(e.target.value)}
                            ></textarea>
                            <div className="flex justify-between items-center mt-1 text-xs text-gray-400">
                                <span>{messageContent.length} karakter</span>
                                {channel === 'SMS' && <span>{Math.ceil(messageContent.length / 160)} SMS (Yaklaşık)</span>}
                            </div>
                        </div>

                        <div className={`p-3 rounded-lg border text-xs ${channel === 'WHATSAPP' ? 'bg-green-50 border-green-100 text-green-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
                            <strong>Bilgi:</strong> <span className="font-bold">{selectedUserIds.length}</span> kullanıcı seçildi. Mesajlar sistem üzerinden sırayla işlenecektir.
                        </div>

                        <Button
                            className={`w-full py-4 font-bold shadow-lg ${channel === 'WHATSAPP' ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-100' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'}`}
                            onClick={handleSend}
                            disabled={sending || selectedUserIds.length === 0}
                            isLoading={sending}
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {sending ? 'Gönderim Başlatıldı...' : 'Gönderimi Başlat'}
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
}
