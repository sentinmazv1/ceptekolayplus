
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Loader2, Database, CheckCircle, AlertTriangle } from 'lucide-react';

export default function MigrationPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [logs, setLogs] = useState<string[]>([]);

    const appendLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    const startMigration = async () => {
        if (!confirm('Veri taşıma işlemini başlatmak istediğinize emin misiniz?')) return;

        setLoading(true);
        setLogs([]);
        setResult(null);
        appendLog('Migration initiated...');

        try {
            const res = await fetch('/api/system/migrate', {
                method: 'POST',
            });
            const json = await res.json();

            if (res.ok) {
                setResult(json);
                appendLog(`Success! Migrated: ${json.migrated}, Failed: ${json.failed}`);
            } else {
                appendLog(`Error: ${json.error || 'Unknown error'}`);
            }
        } catch (e: any) {
            appendLog(`Critical Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Database className="w-8 h-8 text-indigo-600" />
                Veritabanı Taşıma Merkezi
            </h1>

            <div className="bg-white p-6 rounded-xl shadow border border-gray-200 mb-6">
                <p className="mb-4 text-gray-600">
                    Google Sheets üzerindeki tüm müşteri verilerini Supabase veritabanına aktarır.
                    Bu işlem birkaç dakika sürebilir.
                </p>

                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex gap-3 mb-6">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                        <strong>Dikkat:</strong> İşlem sırasında veritabanına yazma yapılacaktır. ID çakışması durumunda mevcut kayıtlar güncellenir.
                    </div>
                </div>

                <Button
                    onClick={startMigration}
                    isLoading={loading}
                    className="w-full h-12 text-lg"
                >
                    {loading ? 'Taşınıyor...' : 'Veri Taşımayı Başlat 🚀'}
                </Button>
            </div>

            {/* Logs Console */}
            <div className="bg-gray-900 rounded-xl p-4 font-mono text-sm h-64 overflow-y-auto text-green-400">
                <div className="border-b border-gray-700 pb-2 mb-2 text-gray-400 uppercase text-xs tracking-wider">System Logs</div>
                {logs.length === 0 && <span className="text-gray-600">Waiting for command...</span>}
                {logs.map((log, i) => (
                    <div key={i}>{log}</div>
                ))}
            </div>

            {result && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 flex items-center gap-3">
                    <CheckCircle className="w-6 h-6" />
                    <div>
                        <div className="font-bold">İşlem Tamamlandı</div>
                        <div className="text-sm">Toplam {result.total} kayıttan {result.migrated} tanesi başarıyla aktarıldı.</div>
                    </div>
                </div>
            )}
        </div>
    );
}
