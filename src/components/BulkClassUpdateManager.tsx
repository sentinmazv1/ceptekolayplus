
import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Loader2, Upload, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react';

interface BulkClassUpdateManagerProps {
    classes: any[];
}

export function BulkClassUpdateManager({ classes }: BulkClassUpdateManagerProps) {
    const [loading, setLoading] = useState(false);
    const [selectedClass, setSelectedClass] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<{ total: number, sample: string[] } | null>(null);
    const [result, setResult] = useState<{ success: number, failed: number, message: string } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);

            // Preview
            const reader = new FileReader();
            reader.onload = (evt) => {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }); // Array of arrays

                // Find TC column or assume first column
                const tcs: string[] = [];
                data.forEach((row: any) => {
                    if (row[0] && String(row[0]).length === 11) tcs.push(String(row[0]));
                });

                setPreview({ total: tcs.length, sample: tcs.slice(0, 3) });
            };
            reader.readAsBinaryString(f);
        }
    };

    const handleUpload = async () => {
        if (!file || !selectedClass) return;
        setLoading(true);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('target_class', selectedClass);

        try {
            const res = await fetch('/api/admin/bulk-class-update', {
                method: 'POST',
                body: formData
            });

            const json = await res.json();
            if (json.success) {
                setResult({ success: json.updatedCount, failed: json.failedCount, message: json.message });
                setFile(null);
                setPreview(null);
            } else {
                setResult({ success: 0, failed: 0, message: json.error || 'Hata oluştu' });
            }
        } catch (error: any) {
            setResult({ success: 0, failed: 0, message: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-50 rounded-xl">
                    <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">Excel ile Toplu Sınıf Atama</h3>
                    <p className="text-sm text-gray-500">TC Kimlik listesi yükleyerek sınıf değişikliği yapın.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hedef Sınıf</label>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Seçiniz...</option>
                        {classes.map(c => (
                            <option key={c.label} value={c.label}>{c.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Excel Dosyası (Sadece TC)</label>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                </div>
            </div>

            {preview && (
                <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg flex items-center justify-between">
                    <span><strong>{preview.total}</strong> adet TC bulundu. (Örn: {preview.sample.join(', ')}...)</span>
                </div>
            )}

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleUpload}
                    disabled={loading || !selectedClass || !preview}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    Güncellemeyi Başlat
                </button>
            </div>

            {result && (
                <div className={`mt-4 p-4 rounded-lg flex items-center gap-2 ${result.success > 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {result.success > 0 ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <div>
                        <p className="font-bold">{result.message}</p>
                        {result.success > 0 && <p className="text-sm">Başarılı: {result.success}, Başarısız/Bulunamayan: {result.failed}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
