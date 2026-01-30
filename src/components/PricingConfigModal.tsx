import { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw } from 'lucide-react';

interface PricingConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void; // Callback to refresh parent data
}

export function PricingConfigModal({ isOpen, onClose, onUpdate }: PricingConfigModalProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Default values
    const [config, setConfig] = useState({
        multiplier_15: 2.60,
        divisor_12: 1.05,
        divisor_6: 1.10,
        divisor_3: 1.10
    });

    useEffect(() => {
        if (isOpen) {
            fetchConfig();
        }
    }, [isOpen]);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/pricing-config');
            if (res.ok) {
                const data = await res.json();
                setConfig({
                    multiplier_15: data.multiplier_15 || 2.60,
                    divisor_12: data.divisor_12 || 1.05,
                    divisor_6: data.divisor_6 || 1.10,
                    divisor_3: data.divisor_3 || 1.10
                });
            }
        } catch (error) {
            console.error('Failed to load pricing config', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/pricing-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                alert('✅ Fiyatlandırma ayarları güncellendi.');
                onUpdate(); // Trigger refresh in parent
                onClose();
            } else {
                alert('❌ Güncelleme başarısız oldu.');
            }
        } catch (error) {
            alert('❌ Bir hata oluştu.');
        } finally {
            setSaving(false);
        }
    };

    const resetToDefaults = () => {
        if (confirm('Varsayılan değerlere dönmek istediğinize emin misiniz?')) {
            setConfig({
                multiplier_15: 2.60,
                divisor_12: 1.05,
                divisor_6: 1.10,
                divisor_3: 1.10
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 flex justify-between items-center text-white">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Fiyatlandırma Ayarları
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">✕</button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        15 Ay Çarpanı (Baz Fiyat)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            className="w-full border rounded-lg p-2 text-right font-mono font-bold text-indigo-600"
                                            value={config.multiplier_15}
                                            onChange={(e) => setConfig({ ...config, multiplier_15: parseFloat(e.target.value) })}
                                        />
                                        <div className="text-xs text-gray-500 w-24">
                                            Alış x {config.multiplier_15}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Maliyet fiyatı bu oranla çarpılarak 15 aylık satış fiyatı bulunur.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <p className="text-xs font-semibold text-gray-500 uppercase">Taksit İndirim Oranları</p>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1 flex justify-between">
                                            <span>12 Ay Böleni</span>
                                            <span className="text-gray-400 font-normal">15 Ay / {config.divisor_12}</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            className="w-full border rounded-lg p-2 text-right font-mono text-sm"
                                            value={config.divisor_12}
                                            onChange={(e) => setConfig({ ...config, divisor_12: parseFloat(e.target.value) })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1 flex justify-between">
                                            <span>6 Ay Böleni</span>
                                            <span className="text-gray-400 font-normal">12 Ay / {config.divisor_6}</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            className="w-full border rounded-lg p-2 text-right font-mono text-sm"
                                            value={config.divisor_6}
                                            onChange={(e) => setConfig({ ...config, divisor_6: parseFloat(e.target.value) })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1 flex justify-between">
                                            <span>3 Ay Böleni</span>
                                            <span className="text-gray-400 font-normal">6 Ay / {config.divisor_3}</span>
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            className="w-full border rounded-lg p-2 text-right font-mono text-sm"
                                            value={config.divisor_3}
                                            onChange={(e) => setConfig({ ...config, divisor_3: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <button
                                    type="button"
                                    onClick={resetToDefaults}
                                    className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Varsayılan
                                </button>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-2"
                                    >
                                        <Save className="w-4 h-4" />
                                        {saving ? 'Kaydediliyor...' : 'Kaydet'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
